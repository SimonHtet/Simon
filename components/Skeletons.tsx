'use client'

// Pulsing placeholder shown while page data loads — replaces the bare spinner
export function PageSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-200/70 rounded-2xl" />
        ))}
      </div>
      <div className="h-8 w-48 bg-slate-200/70 rounded-lg mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-200/60 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
