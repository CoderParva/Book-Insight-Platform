'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, BookOpen, Sparkles, SlidersHorizontal } from 'lucide-react'
import { getBooks, triggerScraper, type Book } from '@/lib/api'
import BookCard from '@/components/BookCard'
import { BookCardSkeleton } from '@/components/Skeleton'

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
  'Fantasy', 'Biography', 'History', 'Self-Help', 'Thriller', 'Horror', 'Classic', 'Children']

const ORDERINGS = [
  { value: '-created_at', label: 'Newest' },
  { value: '-rating', label: 'Top Rated' },
  { value: 'rating', label: 'Lowest Rated' },
  { value: 'title', label: 'A → Z' },
  { value: '-title', label: 'Z → A' },
]

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('All')
  const [ordering, setOrdering] = useState('-created_at')
  const [scraping, setScraping] = useState(false)
  const [scrapePages, setScrapePages] = useState(3)
  const [scrapeMsg, setScrapeMsg] = useState('')

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { ordering }
      if (search) params.search = search
      if (genre !== 'All') params.genre = genre
      const res = await getBooks(params)
      setBooks(res.data.results)
      setCount(res.data.count)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, genre, ordering])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(fetchBooks, 400)
    return () => clearTimeout(t)
  }, [fetchBooks])

  const handleScrape = async () => {
    setScraping(true)
    setScrapeMsg('')
    try {
      const res = await triggerScraper(scrapePages)
      setScrapeMsg(res.data.message)
      // Poll for new books after scraping
      setTimeout(fetchBooks, 5000)
      setTimeout(fetchBooks, 15000)
      setTimeout(fetchBooks, 30000)
    } catch {
      setScrapeMsg('Error starting scraper. Is the backend running?')
    } finally {
      setScraping(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* Hero header */}
      <div className="mb-10 fade-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl mb-2" style={{ color: 'var(--forest)', letterSpacing: '-0.02em' }}>
              Book Library
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>
              {count > 0 ? `${count} books · AI-powered insights` : 'Scrape books to get started'}
            </p>
          </div>

          {/* Scraper control */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Pages:</span>
              <select
                value={scrapePages}
                onChange={e => setScrapePages(Number(e.target.value))}
                className="bg-transparent outline-none text-sm font-medium"
                style={{ color: 'var(--ink)' }}
              >
                {[1,2,3,5,10,20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm transition-all"
              style={{
                background: scraping ? 'var(--border)' : 'var(--forest)',
                color: scraping ? 'var(--muted)' : 'white',
                cursor: scraping ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={15} className={scraping ? 'animate-spin' : ''} />
              {scraping ? 'Scraping…' : 'Scrape Books'}
            </button>
          </div>
        </div>

        {scrapeMsg && (
          <div className="mt-3 px-4 py-2 rounded-lg text-sm fade-up"
            style={{ background: 'var(--amber-light)', color: '#92400e', border: '1px solid #fcd34d' }}>
            <Sparkles size={14} className="inline mr-2" />
            {scrapeMsg}
          </div>
        )}
      </div>

      {/* Filters bar */}
      <div className="mb-8 flex flex-wrap gap-3 items-center fade-up" style={{ animationDelay: '0.1s' }}>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl flex-1 min-w-[220px]"
          style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <Search size={15} style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search title or author…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="outline-none bg-transparent w-full text-sm"
            style={{ color: 'var(--ink)' }}
          />
        </div>

        {/* Genre filter */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <SlidersHorizontal size={14} style={{ color: 'var(--muted)' }} />
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            className="outline-none bg-transparent text-sm"
            style={{ color: 'var(--ink)' }}
          >
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <select
            value={ordering}
            onChange={e => setOrdering(e.target.value)}
            className="outline-none bg-transparent text-sm"
            style={{ color: 'var(--ink)' }}
          >
            {ORDERINGS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <button onClick={fetchBooks}
          className="px-3 py-2 rounded-xl text-sm transition-colors"
          style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Book grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24 fade-up">
          <BookOpen size={48} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>No books found.</p>
          <p style={{ color: 'var(--border)', fontSize: '0.9rem', marginTop: '8px' }}>
            {search || genre !== 'All' ? 'Try different filters.' : 'Click "Scrape Books" to fetch books automatically.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 stagger">
          {books.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}
    </div>
  )
}
