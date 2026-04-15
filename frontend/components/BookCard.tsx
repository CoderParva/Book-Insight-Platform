import Link from 'next/link'
import { Star, ExternalLink } from 'lucide-react'
import type { Book } from '@/lib/api'

function Stars({ rating }: { rating: number | null }) {
  const r = Math.round(rating || 0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13}
          fill={i <= r ? 'var(--amber)' : 'none'}
          color={i <= r ? 'var(--amber)' : 'var(--border)'}
        />
      ))}
    </div>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (!sentiment) return null
  const cls = `sentiment-${sentiment.toLowerCase()}`
  return (
    <span className={`genre-badge ${cls}`} style={{ fontSize: '0.68rem', padding: '1px 8px' }}>
      {sentiment}
    </span>
  )
}

export default function BookCard({ book }: { book: Book }) {
  const genre = book.ai_genre || book.genre
  const coverFallback = `https://placehold.co/120x160/e2d9c8/7a7060?text=${encodeURIComponent(book.title.slice(0, 12))}`

  return (
    <Link href={`/books/${book.id}`}
      className="card-lift block rounded-2xl overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Cover image */}
      <div className="relative overflow-hidden" style={{ height: '180px', background: 'var(--cream)' }}>
        <img
          src={book.cover_image_url || coverFallback}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = coverFallback }}
        />
        {/* AI-processed indicator */}
        {book.ai_processed && (
          <div className="absolute top-2 right-2"
            style={{
              background: 'var(--forest)',
              color: 'white',
              fontSize: '0.62rem',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '999px',
              letterSpacing: '0.05em',
            }}>
            AI ✓
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Genre */}
        {genre && <div className="mb-2"><span className="genre-badge">{genre}</span></div>}

        {/* Title */}
        <h3 className="font-semibold leading-snug mb-1 line-clamp-2"
          style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
          {book.title}
        </h3>

        {/* Author */}
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }} className="mb-3">
          {book.author !== 'Unknown' ? book.author : ''}
        </p>

        {/* Rating + sentiment row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stars rating={book.rating} />
            {book.rating && (
              <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                {book.rating.toFixed(1)}
              </span>
            )}
          </div>
          <SentimentBadge sentiment={book.ai_sentiment} />
        </div>

        {/* Price */}
        {book.price && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--forest)', fontWeight: 600, fontSize: '0.9rem' }}>
              {book.price}
            </span>
            {book.availability && (
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: '8px' }}>
                · {book.availability}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
