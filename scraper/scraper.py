"""
Selenium Scraper — books.toscrape.com
Scrapes multiple pages of books and saves them to the Django database.
"""
import argparse
import logging
import os
import sys
import time
import django

# ---------------------------------------------------------------------------
# Django setup
# ---------------------------------------------------------------------------
BACKEND_DIR = os.path.join(os.path.dirname(__file__), '../backend')
sys.path.insert(0, os.path.abspath(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from books.models import Book
from books.ai_service import process_book_ai, upsert_book_to_vectorstore

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

BASE_URL = "https://books.toscrape.com"

RATING_MAP = {
    'One': 1.0,
    'Two': 2.0,
    'Three': 3.0,
    'Four': 4.0,
    'Five': 5.0,
}


def _make_driver(headless: bool = True) -> webdriver.Chrome:
    options = Options()
    if headless:
        options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument(
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    except Exception:
        driver = webdriver.Chrome(options=options)
    return driver


def _scrape_book_detail(driver: webdriver.Chrome, book_url: str) -> dict:
    try:
        driver.get(book_url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'article.product_page'))
        )
        description = ''
        try:
            desc_el = driver.find_element(By.CSS_SELECTOR, '#product_description ~ p')
            description = desc_el.text.strip()
        except Exception:
            pass

        genre = ''
        try:
            breadcrumb = driver.find_elements(By.CSS_SELECTOR, 'ul.breadcrumb li')
            if len(breadcrumb) >= 3:
                genre = breadcrumb[-2].text.strip()
        except Exception:
            pass

        return {'description': description, 'genre': genre}
    except Exception as e:
        logger.warning(f"Could not fetch detail for {book_url}: {e}")
        return {'description': '', 'genre': ''}


def scrape_books(pages: int = 3, headless: bool = True, run_ai: bool = True) -> int:
    logger.info(f"Starting scraper — {pages} page(s), headless={headless}")
    driver = _make_driver(headless=headless)
    total_scraped = 0

    try:
        for page_num in range(1, pages + 1):
            url = f"{BASE_URL}/catalogue/page-{page_num}.html"
            logger.info(f"Scraping page {page_num}: {url}")
            driver.get(url)

            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'article.product_pod'))
                )
            except Exception:
                logger.warning(f"Page {page_num} did not load, skipping.")
                continue

            book_cards = driver.find_elements(By.CSS_SELECTOR, 'article.product_pod')
            logger.info(f"Found {len(book_cards)} books on page {page_num}")

            # Read ALL card data first before navigating away (fixes stale element error)
            book_data = []
            for card in book_cards:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, 'h3 a')
                    title = title_el.get_attribute('title') or title_el.text.strip()
                    relative_url = title_el.get_attribute('href')

                    if relative_url.startswith('../../'):
                        relative_url = relative_url.replace('../../', '')
                        book_url = f"{BASE_URL}/catalogue/{relative_url}"
                    else:
                        book_url = relative_url

                    try:
                        rating_el = card.find_element(By.CSS_SELECTOR, 'p.star-rating')
                        rating_class = rating_el.get_attribute('class').split()[-1]
                        rating = RATING_MAP.get(rating_class, None)
                    except Exception:
                        rating = None

                    try:
                        price = card.find_element(By.CSS_SELECTOR, 'p.price_color').text.strip()
                    except Exception:
                        price = ''

                    try:
                        availability = card.find_element(By.CSS_SELECTOR, 'p.availability').text.strip()
                    except Exception:
                        availability = ''

                    try:
                        img_src = card.find_element(By.CSS_SELECTOR, 'img.thumbnail').get_attribute('src')
                        if '../' in img_src:
                            img_src = img_src.replace('../../', '')
                            cover_image_url = f"{BASE_URL}/{img_src}"
                        else:
                            cover_image_url = img_src
                    except Exception:
                        cover_image_url = ''

                    book_data.append({
                        'title': title,
                        'book_url': book_url,
                        'rating': rating,
                        'price': price,
                        'availability': availability,
                        'cover_image_url': cover_image_url,
                    })
                except Exception as e:
                    logger.error(f"Error reading card: {e}")
                    continue

            # Now visit each book detail page
            for data in book_data:
                try:
                    detail = _scrape_book_detail(driver, data['book_url'])
                    book, created = Book.objects.update_or_create(
                        book_url=data['book_url'],
                        defaults={
                            'title': data['title'],
                            'author': 'Unknown',
                            'rating': data['rating'],
                            'price': data['price'],
                            'availability': data['availability'],
                            'cover_image_url': data['cover_image_url'],
                            'description': detail['description'],
                            'genre': detail['genre'],
                        }
                    )
                    action = 'Created' if created else 'Updated'
                    logger.info(f"{action}: {data['title']}")
                    total_scraped += 1

                    if run_ai:
                        try:
                            process_book_ai(book)
                            upsert_book_to_vectorstore(book)
                        except ConnectionError:
                            logger.warning("AI not available — skipping AI processing.")
                            run_ai = False
                        except Exception as e:
                            logger.error(f"AI error for '{data['title']}': {e}")

                    time.sleep(0.3)

                except Exception as e:
                    logger.error(f"Error saving book: {e}")
                    continue

            logger.info(f"Page {page_num} done. Total so far: {total_scraped}")

    finally:
        driver.quit()

    logger.info(f"Scraping complete. Total books scraped: {total_scraped}")
    return total_scraped


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape books from books.toscrape.com')
    parser.add_argument('--pages', type=int, default=3, help='Number of pages to scrape')
    parser.add_argument('--no-ai', action='store_true', help='Skip AI processing')
    parser.add_argument('--visible', action='store_true', help='Run Chrome visibly')
    args = parser.parse_args()

    count = scrape_books(
        pages=args.pages,
        headless=not args.visible,
        run_ai=not args.no_ai,
    )
    print(f"\nDone! Scraped {count} books.")