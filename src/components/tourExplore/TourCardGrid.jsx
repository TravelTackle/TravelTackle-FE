import { useEffect, useRef } from 'react'
import TourCard from './TourCard'
import Skeleton from '../ui/Skeleton'

export default function TourCardGrid({ spots, loading, loadingMore, hasMore, onLoadMore, onOpen, onAddToCart }) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!hasMore || loading) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3" role="status" aria-label="관광지를 불러오는 중">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
            <Skeleton className="h-[150px] w-full rounded-none" style={{ animationDelay: `${(i % 3) * 120}ms` }} />
            <div className="p-3">
              <Skeleton className="h-3.5 w-2/3" style={{ animationDelay: `${(i % 3) * 120 + 60}ms` }} />
              <Skeleton className="mt-2 h-2.5 w-1/2" style={{ animationDelay: `${(i % 3) * 120 + 120}ms` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (spots.length === 0) {
    return <div className="py-20 text-center text-[13px] text-slate-400">해당하는 관광지가 없어요.</div>
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {spots.map((spot) => (
          <TourCard key={spot.contentId} spot={spot} onOpen={onOpen} onAddToCart={onAddToCart} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          {loadingMore && <span className="text-[12px] text-slate-300">다음 페이지 불러오는 중...</span>}
        </div>
      )}
    </div>
  )
}
