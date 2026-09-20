import { useRef, useState } from 'react'
import { Icon } from '@iconify/react'

// 기록 사진 캐러셀 — 좌우 버튼으로 넘기고 터치는 스크롤 스냅으로 스와이프한다.
// 사진이 1장이면 버튼·인디케이터 없이 그냥 이미지만 보인다. 카드 안에서 쓰여도 카드 클릭이 열리지 않게 버튼은 전파를 막는다.
export default function PhotoCarousel({ photos, alt, className = '' }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null) // { startX, startLeft, moved }
  const count = photos.length

  function go(e, dir) {
    e.stopPropagation()
    const el = trackRef.current
    if (el) el.scrollTo({ left: (index + dir) * el.clientWidth, behavior: 'smooth' })
  }

  // 마우스 드래그 — 터치는 브라우저 기본 스와이프가 처리하므로 mouse만 다룬다.
  // 드래그 중엔 스냅을 꺼서 손을 따라오게 하고, 놓으면 가장 가까운 사진으로 붙인다.
  function onPointerDown(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0 || count < 2) return
    drag.current = { startX: e.clientX, startLeft: e.currentTarget.scrollLeft, moved: false }
    setDragging(true)
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (d.moved) e.currentTarget.scrollLeft = d.startLeft - dx
  }

  function endDrag(e) {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragging(false)
    if (!d.moved) return
    const el = e.currentTarget
    const next = Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    // 드래그 끝의 click이 카드 열기로 번지지 않게 한 번만 삼킨다
    const swallow = (ev) => ev.stopPropagation()
    el.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => el.removeEventListener('click', swallow, true), 0)
  }

  function onScroll(e) {
    const el = e.currentTarget
    if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const arrow = 'absolute top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-700 shadow-sm transition-colors hover:bg-white'

  return (
    <div>
    <div className={`relative overflow-hidden bg-slate-200 ${className}`}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`flex h-full w-full overflow-x-auto ${dragging ? 'cursor-grabbing' : count > 1 ? 'cursor-grab snap-x snap-mandatory' : ''} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {photos.map((url, i) => (
          <img key={url + i} src={url} alt={alt} loading={i ? 'lazy' : undefined} draggable={false} className="h-full w-full shrink-0 snap-center object-cover" />
        ))}
      </div>
      {count > 1 && (
        <>
          {index > 0 && (
            <button type="button" aria-label="이전 사진" onClick={(e) => go(e, -1)} className={`${arrow} left-2`}>
              <Icon icon="mdi:chevron-left" width={16} />
            </button>
          )}
          {index < count - 1 && (
            <button type="button" aria-label="다음 사진" onClick={(e) => go(e, 1)} className={`${arrow} right-2`}>
              <Icon icon="mdi:chevron-right" width={16} />
            </button>
          )}
        </>
      )}
    </div>
      {count > 1 && (
        <div className="mt-2 flex justify-center gap-1" aria-hidden="true">
          {photos.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-brand' : 'bg-slate-300'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
