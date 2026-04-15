export function BookCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
      <div className="shimmer" style={{ height: '180px' }} />
      <div className="p-4 space-y-3">
        <div className="shimmer h-4 rounded w-1/3" />
        <div className="shimmer h-5 rounded w-4/5" />
        <div className="shimmer h-4 rounded w-1/2" />
        <div className="shimmer h-4 rounded w-2/3" />
      </div>
    </div>
  )
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`shimmer h-4 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
