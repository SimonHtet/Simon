// Module-level promise cache so ReservationDetailPanel can prefetch folios/init
// and CheckOutModal reuses the same in-flight promise instead of double-fetching.
const promiseCache = new Map<string, Promise<any[] | null>>()
const timestamps = new Map<string, number>()
const TTL = 30_000

export function prefetchFolios(resId: string): void {
  const ts = timestamps.get(resId)
  if (ts && Date.now() - ts < TTL) return
  timestamps.set(resId, Date.now())
  promiseCache.set(
    resId,
    fetch(`/api/reservations/${resId}/folios/init`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => (Array.isArray(data.folios) ? data.folios : null))
      .catch(() => null),
  )
}

export function getFoliosPromise(resId: string): Promise<any[] | null> | null {
  const ts = timestamps.get(resId)
  if (!ts || Date.now() - ts > TTL) return null
  return promiseCache.get(resId) ?? null
}
