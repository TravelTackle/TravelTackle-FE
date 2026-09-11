import { useState } from 'react'
import { Icon } from '@iconify/react'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { SPOT_DRAG_TYPE } from '../../api/cart'
import { shortRegion } from '../../lib/homeFormat'
import { festivalStatus, formatRange, formatSpan } from '../../lib/festivalPeriod'

// 상태 배지 색 — 진행 중은 초록에 살아있는 점, 예정은 흰 바탕의 브랜드 블루, 오늘 마감은 앰버, 종료는 짙은 회색
const TONE = {
  live: 'bg-emerald-500 text-white',
  upcoming: 'bg-white/95 text-brand-dark',
  closing: 'bg-amber-500 text-white',
  ended: 'bg-slate-800/80 text-white',
}

export default function FestivalCard({ festival, index = 0, onOpen, onAddToCart }) {
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const status = festivalStatus(festival.startDate, festival.endDate)
  const range = formatRange(festival.startDate, festival.endDate)
  const span = formatSpan(festival.startDate, festival.endDate)
  const region = shortRegion(festival.address)

  async function handleQuickAdd(e) {
    e.stopPropagation()
    if (added || loading) return
    setLoading(true)
    const ok = await onAddToCart(festival.contentId)
    setLoading(false)
    if (ok) setAdded(true)
  }

  return (
    <Card
      as="div"
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData(SPOT_DRAG_TYPE, JSON.stringify({ contentId: festival.contentId, title: festival.title }))
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(festival)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(festival)
      }}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className={`group relative block w-full cursor-pointer overflow-hidden text-left animate-slide-in transition-opacity ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="relative h-[150px] overflow-hidden">
        {festival.imageUrl ? (
          <img
            src={festival.imageUrl}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            alt={festival.title}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-light to-slate-100 text-brand/40">
            <Icon icon="mdi:party-popper" width={34} />
          </div>
        )}
        {/* 아래쪽만 살짝 어둡게 — 날짜 텍스트 가독성용, 사진 자체는 밝게 유지 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-900/45 to-transparent" />

        <span
          className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-card ${TONE[status.tone]}`}
        >
          {status.tone === 'live' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          )}
          {status.label}
        </span>

        <button
          onClick={handleQuickAdd}
          disabled={loading}
          aria-label="카트에 담기"
          className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-card transition-colors ${
            added ? 'text-brand' : 'text-slate-600 hover:text-brand'
          }`}
        >
          <Icon icon={added ? 'solar:cart-check-bold' : 'solar:cart-large-2-linear'} width={16} />
        </button>

        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-[11.5px] font-semibold text-white drop-shadow">
          <Icon icon="solar:calendar-linear" width={13} />
          <span>{range}</span>
          {span && <span className="text-white/75">· {span}</span>}
        </div>
      </div>

      <div className="p-3">
        <div className="truncate text-[13px] font-bold text-slate-900">{festival.title}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
          {region && (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">{region}</span>
          )}
          <span className="truncate">{festival.address || '장소 정보 없음'}</span>
        </div>
      </div>
    </Card>
  )
}

// 축제 카드 자리 표시 — 배지·날짜·지역 칩 위치까지 실제 카드와 같은 골격
export function FestivalCardSkeleton({ index = 0 }) {
  const delay = (index % 3) * 120
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <div className="relative h-[150px]">
        <Skeleton className="h-full w-full rounded-none" style={{ animationDelay: `${delay}ms` }} />
        <Skeleton className="absolute top-2.5 left-2.5 h-6 w-16 rounded-full bg-white/70" style={{ animationDelay: `${delay + 40}ms` }} />
        <Skeleton className="absolute bottom-2.5 left-3 h-3 w-24 rounded-md bg-white/70" style={{ animationDelay: `${delay + 80}ms` }} />
      </div>
      <div className="p-3">
        <Skeleton className="h-3.5 w-2/3" style={{ animationDelay: `${delay + 60}ms` }} />
        <div className="mt-2 flex items-center gap-1.5">
          <Skeleton className="h-4 w-9 rounded-md" style={{ animationDelay: `${delay + 120}ms` }} />
          <Skeleton className="h-2.5 w-1/2" style={{ animationDelay: `${delay + 160}ms` }} />
        </div>
      </div>
    </div>
  )
}
