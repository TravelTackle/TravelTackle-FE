import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'
import Skeleton from '../ui/Skeleton'

export const FILTERS = [
  { value: 'all', label: '전체', icon: 'mdi:shuffle-variant' },
  { value: 'plan', label: '계획', icon: 'mdi:calendar-blank-outline' },
  { value: 'record', label: '기록', icon: 'mdi:camera-outline' },
]

const VIEWS = [
  { value: 'list', icon: 'mdi:format-list-bulleted', label: '리스트 보기' },
  { value: 'gallery', icon: 'mdi:view-grid', label: '갤러리 보기' },
]

// 전체/계획/기록 세그먼트 — 흰 썸이 선택 쪽으로 미끄러지고, 활성 라벨만 브랜드 색.
// 마이페이지 프로필 탭에서도 이 토글을 그대로 재사용한다(스켈레톤/보기방식/업로드 버튼 없이 이 부분만).
// options: 보여줄 필터 목록 — 마이페이지는 "전체" 없이 계획/기록만 쓰므로 FILTERS 일부만 넘긴다.
export function FeedTypeFilter({ filter, onFilterChange, options = FILTERS }) {
  const trackRef = useRef(null)
  const [hover, setHover] = useState(null) // 마우스를 올린 필터 값 — 탑바 알약처럼 썸이 커서를 따라간다
  const [thumb, setThumb] = useState(null) // { x, w } — 썸이 가 있을 버튼(호버 중이면 호버, 아니면 활성) 위치
  const target = hover ?? filter

  // 라벨 폭이 달라 대상 버튼을 재서 썸을 옮긴다. 웹폰트가 늦게 오면 폭이 바뀌므로 한 번 더 잰다.
  useLayoutEffect(() => {
    function measure() {
      const el = trackRef.current?.querySelector(`[data-filter="${target}"]`)
      if (!el) return
      setThumb({ x: el.offsetLeft, w: el.offsetWidth })
    }
    measure()
    const t = setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [target])

  return (
    <div className="ai-word">
      <div
        ref={trackRef}
        role="group"
        aria-label="피드 종류"
        className="relative flex items-center gap-0.5 rounded-full bg-slate-100 p-1"
        onMouseLeave={() => setHover(null)}
      >
        <span
          aria-hidden="true"
          className="mode-thumb pointer-events-none absolute inset-y-1 left-0 rounded-full bg-white shadow-card"
          style={{
            width: thumb ? thumb.w : 0,
            transform: `translateX(${thumb ? thumb.x : 0}px)`,
            opacity: thumb ? 1 : 0,
          }}
        />
        {options.map((f) => {
          const active = filter === f.value
          const lit = target === f.value // 썸이 올라와 있는 버튼 — 활성이거나 호버 중
          return (
            <button
              key={f.value}
              type="button"
              data-filter={f.value}
              onClick={() => onFilterChange(f.value)}
              onMouseEnter={() => setHover(f.value)}
              onFocus={() => setHover(f.value)}
              onBlur={() => setHover(null)}
              aria-pressed={active}
              className={`relative z-10 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold whitespace-nowrap transition-colors duration-300 ${
                active ? 'text-brand-dark' : lit ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              <Icon icon={f.icon} width={14} className={`transition-colors duration-300 ${active ? 'text-brand' : lit ? 'text-slate-600' : 'text-slate-400'}`} />
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 첫 진입에만 스켈레톤 → 드러나기 모션. 필터를 오갈 때마다 반복되면 새로고침처럼 느껴진다.
let revealedOnce = false
const MIN_SKELETON_MS = 550

export default function FeedFilterBar({ filter, onFilterChange, view, onViewChange, onUploadClick }) {
  const [revealed, setRevealed] = useState(revealedOnce)

  useEffect(() => {
    if (revealed) return
    const t = setTimeout(() => {
      revealedOnce = true
      setRevealed(true)
    }, MIN_SKELETON_MS)
    return () => clearTimeout(t)
  }, [revealed])

  if (!revealed) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5" role="status" aria-label="피드 필터를 준비하는 중">
        <div className="flex items-center gap-1 rounded-full bg-slate-50 p-1">
          {[64, 64, 64].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-full" style={{ width: w, animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-9 w-[76px] rounded-xl sm:block" style={{ animationDelay: '220ms' }} />
          <Skeleton className="h-9 w-[112px] rounded-full" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
      <FeedTypeFilter filter={filter} onFilterChange={onFilterChange} />

      <div className="ai-word" style={{ animationDelay: '120ms' }}>
      <div className="flex items-center gap-2">
        <div className="relative hidden items-center gap-1 rounded-xl bg-slate-100 p-1 sm:flex" role="group" aria-label="보기 방식">
          {/* 선택된 아이콘 뒤에서 슬라이드로 이동하는 흰색 배경 */}
          <div
            aria-hidden="true"
            className="mode-thumb absolute left-1 top-1 h-7 w-7 rounded-lg bg-white shadow-card"
            style={{ transform: `translateX(calc(${VIEWS.findIndex((v) => v.value === view)} * (100% + 0.25rem)))` }}
          />
          {VIEWS.map((v) => {
            const active = view === v.value
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => onViewChange(v.value)}
                aria-label={v.label}
                aria-pressed={active}
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-300 ${
                  active ? 'text-brand-dark' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon icon={v.icon} width={17} />
              </button>
            )
          })}
        </div>

        <Button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold shadow-card hover:shadow-card-hover"
        >
          <Icon icon="mdi:cloud-upload-outline" width={16} />
          기록 업로드
        </Button>
      </div>
      </div>
    </div>
  )
}
