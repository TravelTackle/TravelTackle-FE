import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Card from '../ui/Card'
import { FeedUserHeader, FeedActionBar } from './FeedCardChrome'

export default function PlanFeedCard({ item, onOpen }) {
  const [dayIndex, setDayIndex] = useState(0)
  const day = item.days[dayIndex]
  const hasPrev = dayIndex > 0
  const hasNext = dayIndex < item.days.length - 1
  const hasOverflow = day.places.length > 4
  const scrollRef = useRef(null)

  // 카드 위에서 세로 휠만 굴려도(Shift 없이) 장소 스트립이 가로로 스크롤되도록 변환
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function handleWheel(e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // 마우스로 이미지를 잡고(드래그) 좌우로 스크롤 — 실제 터치는 브라우저 기본 스와이프로 이미 동작함
  function handleMouseDown(e) {
    const el = scrollRef.current
    if (!el) return
    const startX = e.pageX
    const startScrollLeft = el.scrollLeft
    let moved = false

    function onMove(ev) {
      const dx = ev.pageX - startX
      if (Math.abs(dx) > 3) moved = true
      el.scrollLeft = startScrollLeft - dx
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (moved) {
        // 드래그 후 발생하는 클릭이 카드 상세 열기로 이어지지 않도록 한 번만 막음
        const swallowClick = (ce) => {
          ce.stopPropagation()
          el.removeEventListener('click', swallowClick, true)
        }
        el.addEventListener('click', swallowClick, true)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <Card
      as="div"
      role="button"
      tabIndex={0}
      shadow
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(item)
      }}
      className="cursor-pointer p-4 text-left"
    >
      <FeedUserHeader item={item} />

      <div className="relative mt-3 flex items-center justify-between">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={(e) => { e.stopPropagation(); setDayIndex((v) => v - 1) }}
          aria-label="이전 Day"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark transition-colors hover:bg-blue-100 disabled:opacity-30 disabled:hover:bg-brand-light"
        >
          <Icon icon="mdi:chevron-left" width={17} />
        </button>

        <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-brand-light px-3 py-1 text-[11px] font-bold text-brand-dark">
          Day {day.day}
        </span>

        <button
          type="button"
          disabled={!hasNext}
          onClick={(e) => { e.stopPropagation(); setDayIndex((v) => v + 1) }}
          aria-label="다음 Day"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark transition-colors hover:bg-blue-100 disabled:opacity-30 disabled:hover:bg-brand-light"
        >
          <Icon icon="mdi:chevron-right" width={17} />
        </button>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={hasOverflow ? handleMouseDown : undefined}
        className={`mt-2 flex gap-2 overflow-x-auto pb-2 select-none ${hasOverflow ? 'cursor-grab active:cursor-grabbing' : ''} ${
          hasOverflow
            ? '[scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-300'
            : '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }`}
      >
        {day.places.map((place, i) => (
          <div key={i} className="shrink-0 grow-0 basis-[calc((100%-1.5rem)/4)]">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-slate-200">
              {place.imageUrl && (
                <img src={place.imageUrl} alt={place.name} className="absolute inset-0 h-full w-full object-cover" />
              )}
              <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-[13px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                {place.name}
              </span>
            </div>
            <div className="mt-1 truncate text-center text-[10px] text-slate-400">{place.time}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[14px] font-bold text-slate-900">{item.title}</div>
      <div className="mt-1 text-[12px] text-slate-400">{item.duration} · {item.placeCount}개의 장소</div>

      <FeedActionBar />
    </Card>
  )
}
