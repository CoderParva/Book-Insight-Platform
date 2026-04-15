import hashlib
import logging
import threading

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .ai_service import (
    get_similar_books,
    process_book_ai,
    rag_query,
    upsert_book_to_vectorstore,
)
from .models import Book, ChatHistory
from .serializers import (
    BookDetailSerializer,
    BookListSerializer,
    BookUploadSerializer,
    ChatHistorySerializer,
    RAGQuerySerializer,
)

logger = logging.getLogger(__name__)


def _cache_key(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


@api_view(['GET'])
def book_list(request):
    books = Book.objects.all()
    search = request.query_params.get('search', '').strip()
    if search:
        books = books.filter(title__icontains=search) | books.filter(author__icontains=search)
    genre = request.query_params.get('genre', '').strip()
    if genre:
        books = books.filter(ai_genre__icontains=genre) | books.filter(genre__icontains=genre)
    ordering = request.query_params.get('ordering', '-created_at')
    if ordering in ['rating', '-rating', 'title', '-title', 'created_at', '-created_at']:
        books = books.order_by(ordering)
    serializer = BookListSerializer(books, many=True)
    return Response({'count': books.count(), 'results': serializer.data})


@api_view(['GET'])
def book_detail(request, pk):
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(BookDetailSerializer(book).data)


@api_view(['GET'])
def book_recommendations(request, pk):
    try:
        Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    cache_key = f"rec_{pk}"
    cached = cache.get(cache_key)
    if cached:
        return Response({'results': cached, 'cached': True})
    similar_ids = get_similar_books(book_id=pk, top_k=5)
    similar_books = Book.objects.filter(id__in=similar_ids)
    data = BookListSerializer(similar_books, many=True).data
    cache.set(cache_key, data, timeout=3600)
    return Response({'results': data, 'cached': False})


@api_view(['POST'])
def book_upload(request):
    serializer = BookUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    book, created = Book.objects.update_or_create(
        book_url=data['book_url'],
        defaults={
            'title': data.get('title', ''),
            'author': data.get('author', ''),
            'description': data.get('description', ''),
            'price': data.get('price', ''),
            'availability': data.get('availability', ''),
            'cover_image_url': data.get('cover_image_url', ''),
            'genre': data.get('genre', ''),
            'rating': data.get('rating'),
            'num_reviews': data.get('num_reviews'),
        },
    )

    def _bg():
        try:
            process_book_ai(book)
            upsert_book_to_vectorstore(book)
        except Exception as e:
            logger.error(f"BG AI error: {e}")

    threading.Thread(target=_bg, daemon=True).start()
    return Response(BookDetailSerializer(book).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['POST'])
def trigger_scraper(request):
    pages = max(1, min(int(request.data.get('pages', 3)), 50))

    def _run():
        try:
            import os
            import sys
            from django.conf import settings
            scraper_path = os.path.join(os.path.dirname(settings.BASE_DIR), 'scraper')
            if scraper_path not in sys.path:
                sys.path.insert(0, scraper_path)
            from scraper import scrape_books
            scrape_books(pages=pages)
        except Exception as e:
            logger.error(f"Scraper error: {e}")

    threading.Thread(target=_run, daemon=True).start()
    return Response({'message': f'Scraper started for {pages} page(s).', 'pages': pages})


@api_view(['POST'])
def process_book_ai_view(request, pk):
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    try:
        process_book_ai(book)
        upsert_book_to_vectorstore(book)
    except ConnectionError as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error(e)
        return Response({'error': 'AI processing failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(BookDetailSerializer(book).data)


@api_view(['POST'])
def rag_query_view(request):
    serializer = RAGQuerySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    question = serializer.validated_data['question']
    top_k = serializer.validated_data['top_k']
    cache_key = f"rag_{_cache_key(question)}"
    cached = cache.get(cache_key)
    if cached:
        return Response({**cached, 'cached': True})
    try:
        result = rag_query(question, top_k=top_k)
    except ConnectionError as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error(f"RAG error: {e}")
        return Response({'error': 'Query failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    ChatHistory.objects.create(
        question=question,
        answer=result['answer'],
        sources=[s['id'] for s in result['sources']],
    )
    cache.set(cache_key, result, timeout=3600)
    return Response({**result, 'cached': False})


@api_view(['GET'])
def chat_history(request):
    history = ChatHistory.objects.all()[:50]
    return Response({'results': ChatHistorySerializer(history, many=True).data})