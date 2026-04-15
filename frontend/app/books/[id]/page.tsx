'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, ExternalLink, ArrowLeft, Sparkles, BookOpen, RefreshCw, Tag, TrendingUp } from 'lucide-react'
import { getBook, getRecommendations, processBookAI, type Book } from '@/lib/api'
import BookCard from '@/components/BookCard'
import { TextSkeleton, BookCardSkeleton } from '@/components/Skeleton'

function Stars({ rating }: { rating: number | null }) {
  const r = Math.round(rating || 0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={18}
          fill={i <= r ? 'var(--amber)' : 'none'}
          color={i <= r ? 'var(--amber)' : 'var(--border)'}
        />
      ))}
      {rating && <span style={{ color: 'var(--muted)', marginLeft: '6px', fontSize: '0.9rem' }}>{rating.toFixed(1)} / 5</span>}
    </div>
  )
}

function AIInsightCard({ icon: Icon, label, value, className = '' }:
  { icon: any; label: string; value: string; className?: string }) {
  if (!value) return null
  return (
    <div className={`rounded-xl p-4 ${className}`}
      style={{ border: '1px solid var(--border)', background: 'var(--cream)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: 'var(--amber)' }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--muted)' }}>
          {label}
        </span>
      </div>
      <p style={{ color: 'var(--ink)', fontSize: '0.92rem', lineHeight: 1.6 }}>{value}</p>
    </div>
  )
}

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [book, setBook] = useState<Book | null>(null)
  const [recs, setRecs] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [recsLoading, setRecsLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getBook(id)
        setBook(res.data)
      } catch {
        setError('Book not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    const loadRecs = async () => {
      setRecsLoading(true)
      try {
        const res = await getRecommendations(id)
        setRecs(res.data.results)
      } catch {
        // silently fail
      } finally {
        setRecsLoading(false)
      }
    }
    if (!loading) loadRecs()
  }, [id, loading])

  const handleProcessAI = async () => {
    if (!book) return
    setProcessing(true)
    try {
      const res = await processBookAI(id)
      setBook(res.data)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'AI processing failed. Is LM Studio running?')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="shimmer h-8 rounded w-48 mb-8" />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="shimmer rounded-2xl" style={{ height: '320px' }} />
        <div className="md:col-span-2 space-y-4">
          <div className="shimmer h-8 rounded w-3/4" />
          <div className="shimmer h-5 rounded w-1/2" />
          <TextSkeleton lines={5} />
        </div>
      </div>
    </div>
  )

  if (error || !book) return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center">
      <BookOpen size={48} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
      <p style={{ color: 'var(--muted)' }}>{error || 'Something went wrong.'}</p>
      <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: 'var(--amber)' }}>
        Go back
      </button>
    </div>
  )

  const genre = book.ai_genre || book.genre
  const coverFallback = `https://placehold.co/240x320/e2d9c8/7a7060?text=${encodeURIComponent(book.title.slice(0, 12))}`

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 fade-up">

      {/* Back button */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 mb-8 text-sm transition-colors link-underline"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={15} /> Back to Library
      </button>

      {/* Main detail card */}
      <div className="rounded-2xl overflow-hidden mb-8"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="grid md:grid-cols-3 gap-0">

          {/* Cover */}
          <div className="relative" style={{ background: 'var(--cream)', minHeight: '320px' }}>
            <img
              src={book.cover_image_url || coverFallback}
              alt={book.title}
              className="w-full h-full object-cover"
              style={{ minHeight: '320px' }}
              onError={(e) => { (e.target as HTMLImageElement).src = coverFallback }}
            />
          </div>

          {/* Info */}
          <div className="md:col-span-2 p-8">
            {/* Genre + AI badge */}
            <div className="flex flex-wrap gap-2 mb-4">
              {genre && <span className="genre-badge">{genre}</span>}
              {book.ai_sentiment && (
                <span className={`genre-badge sentiment-${book.ai_sentiment.toLowerCase()}`}>
                  {book.ai_sentiment}
                </span>
              )}
              {book.ai_processed && (
                <span className="genre-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                  AI Processed ✓
                </span>
              )}
            </div>

            <h1 className="text-3xl mb-2" style={{ color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {book.title}
            </h1>

            {book.author && book.author !== 'Unknown' && (
              <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: '16px' }}>
                by <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{book.author}</span>
              </p>
            )}

            <div className="mb-5"><Stars rating={book.rating} /></div>

            {/* Price / availability */}
            <div className="flex items-center gap-4 mb-6">
              {book.price && (
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--forest)' }}>
                  {book.price}
                </span>
              )}
              {book.availability && (
                <span className="text-sm px-3 py-1 rounded-full"
                  style={{ background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  {book.availability}
                </span>
              )}
            </div>

            {/* Description */}
            {book.description && (
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '20px' }}
                className="line-clamp-5">
                {book.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <a href={book.book_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--forest)', color: 'white' }}>
                <ExternalLink size={14} /> View on Site
              </a>
              {!book.ai_processed && (
                <button onClick={handleProcessAI} disabled={processing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: processing ? 'var(--border)' : 'var(--amber-light)',
                    color: processing ? 'var(--muted)' : '#92400e',
                    border: '1px solid #fcd34d',
                  }}>
                  <Sparkles size={14} className={processing ? 'animate-spin' : ''} />
                  {processing ? 'Processing…' : 'Generate AI Insights'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights section */}
      {(book.ai_summary || book.ai_genre || book.ai_sentiment) && (
        <div className="mb-10 fade-up">
          <h2 className="text-2xl mb-4" style={{ color: 'var(--forest)' }}>
            <Sparkles size={18} className="inline mr-2" style={{ color: 'var(--amber)' }} />
            AI Insights
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {book.ai_summary && (
              <AIInsightCard icon={BookOpen} label="AI Summary" value={book.ai_summary} className="sm:col-span-2" />
            )}
            {book.ai_genre && (
              <AIInsightCard icon={Tag} label="Predicted Genre" value={book.ai_genre} />
            )}
            {book.ai_sentiment && (
              <AIInsightCard icon={TrendingUp} label="Tone / Sentiment" value={book.ai_sentiment} />
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="fade-up">
        <h2 className="text-2xl mb-5" style={{ color: 'var(--forest)' }}>
          Similar Books
        </h2>
        {recsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : recs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger">
            {recs.map(r => <BookCard key={r.id} book={r} />)}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            No recommendations yet. Add more books to unlock similarity search.
          </p>
        )}
      </div>
    </div>
  )
}
