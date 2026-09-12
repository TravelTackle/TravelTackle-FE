import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Skeleton from '../ui/Skeleton'
import { PERIOD_PRESETS, formatRange } from '../../lib/festivalPeriod'

const INPUT =
  'h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none transition-colors [color-scheme:light] hover:border-brand/40 focus:border-brand'

// 첫 진입에만 스켈레톤 → 드러나기 모션을 재생한다. 같은 세션에서 테마를 오갈 때 매번 반복되면 새로고침처럼 느껴진다.
let revealedOnce = false
const MIN_SKELETON_MS = 650
const TITLE_WORDS = ['축제', '·', '행사']

// 축제·행사 테마에서 그리드 위에 붙는 한 줄 기간 바 — 제목·기간·결과 수 / 프리셋 세그먼트(미끄러지는 썸) / 날짜 직접 선택 팝오버
export default function FestivalPeriodBar({ period, onChange, regionName, loading, totalCount }) {
  const [revealed, setRevealed] = useState(revealedOnce)
  const [customOpen, setCustomOpen] = useState(false)
  const trackRef = useRef(null)
  const popRef = useRef(null)
  const triggerRef = useRef(null)
  const [thumb, setThumb] = useState(null) // { x, w } — 활성 프리셋 버튼 위치, null이면 숨김(직접 선택 중)

  useEffect(() => {
    if (revealed) return
    const t = setTimeout(() => {
      revealedOnce = true
      setRevealed(true)
    }, MIN_SKELETON_MS)
    return () => clearTimeout(t)
  }, [revealed])

  // 활성 버튼을 재서 썸을 옮긴다 — 라벨 폭이 달라 고정 비율로는 못 맞춘다
  useLayoutEffect(() => {
    if (!revealed) return
    function measure() {
      const track = trackRef.current
      const active = track?.querySelector('[aria-selected="true"]')
      if (!track || !active) {
        setThumb(null)
        return
      }
      setThumb({ x: active.offsetLeft, w: active.offsetWidth })
    }
    measure()
    // 웹폰트 로드 뒤 폭이 바뀔 수 있어 한 번 더, 창 크기가 바뀌면 다시
    const t = setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [revealed, period.preset])

  useEffect(() => {
    if (!customOpen) return
    function onDown(e) {
      if (popRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setCustomOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setCustomOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [customOpen])

  function setDate(field, value) {
    if (!value) return
    const next = { preset: 'custom', start: period.start, end: period.end, [field]: value }
    // 끝이 시작보다 앞서면 같은 날로 맞춘다 — 서버는 이 경우 400을 돌려준다
    if (next.end && next.end < next.start) {
      if (field === 'start') next.end = next.start
      else next.start = next.end
    }
    onChange(next)
  }

  const isCustom = period.preset === 'custom'
  const rangeLabel = formatRange(period.start, period.end)

  if (!revealed) {
    return (
      <div className="mb-5 flex h-[54px] items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 shadow-card" role="status" aria-label="축제·행사 기간 필터를 준비하는 중">
        <div className="flex min-w-0 items-center gap-2.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-28" style={{ animationDelay: '80ms' }} />
        </div>
        <div className="ml-auto hidden items-center gap-1 rounded-full bg-slate-50 p-1 sm:flex">
          {[52, 56, 56, 56, 64].map((w, i) => (
            <Skeleton key={i} className="h-7 rounded-full" style={{ width: w, animationDelay: `${120 + i * 60}ms` }} />
          ))}
        </div>
        <Skeleton className="h-8 w-[104px] rounded-full" style={{ animationDelay: '420ms' }} />
      </div>
    )
  }

  return (
    <div className="relative mb-5 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 shadow-card">
      {/* 제목 · 기간 · 결과 수 */}
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h2 className="flex shrink-0 gap-x-[0.22em] text-[15px] font-bold text-slate-900">
          {regionName && <span className="ai-word text-brand-dark" style={{ animationDelay: '0ms' }}>{regionName}</span>}
          {TITLE_WORDS.map((w, i) => (
            <span key={w} className={`ai-word ${w === '·' ? 'text-slate-300' : ''}`} style={{ animationDelay: `${(regionName ? 1 : 0) * 70 + i * 70}ms` }}>
              {w}
            </span>
          ))}
        </h2>
        <div className="ai-word" style={{ animationDelay: '260ms' }}>
        <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <span className="truncate">{rangeLabel}</span>
          <span className="text-slate-300">·</span>
          {loading ? (
            <Skeleton className="h-3.5 w-9 rounded-md" />
          ) : (
            <span key={totalCount} className="ai-pop inline-block font-bold tabular-nums text-brand-dark">
              {totalCount.toLocaleString()}개
            </span>
          )}
        </div>
        </div>
      </div>

      {/* 프리셋 세그먼트 — 흰 썸이 선택 쪽으로 미끄러진다. 직접 선택 중엔 썸이 사라진다.
          ai-word는 display:inline-block을 강제하므로 flex 트랙이 아니라 바깥 래퍼에 건다 */}
      <div className="ai-word ml-auto min-w-0 max-w-full" style={{ animationDelay: '320ms' }}>
      <div
        ref={trackRef}
        role="tablist"
        aria-label="기간 프리셋"
        className="relative flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-slate-100 p-1 scrollbar-hide"
      >
        <span
          aria-hidden="true"
          className="mode-thumb pointer-events-none absolute inset-y-1 left-0 rounded-full bg-white shadow-card"
          style={{
            width: thumb ? thumb.w : 0,
            transform: `translateX(${thumb ? thumb.x : 0}px) scale(${thumb ? 1 : 0.6})`,
            opacity: thumb ? 1 : 0,
          }}
        />
        {PERIOD_PRESETS.map((p) => {
          const active = period.preset === p.key
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={active}
              title={p.hint}
              onClick={() => {
                setCustomOpen(false)
                onChange({ preset: p.key })
              }}
              className={`relative z-10 shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors duration-300 ${
                active ? 'text-brand-dark' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      </div>

      {/* 날짜 직접 선택 — 바 높이를 늘리지 않고 아래로 뜨는 팝오버 */}
      <div className="relative z-30 ai-word" style={{ animationDelay: '380ms' }}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          aria-expanded={customOpen}
          aria-haspopup="dialog"
          className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold whitespace-nowrap transition-colors ${
            isCustom
              ? 'border-brand bg-brand text-white'
              : customOpen
                ? 'border-brand bg-brand-light text-brand-dark'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand-dark'
          }`}
        >
          <Icon icon="solar:calendar-search-linear" width={14} />
          {isCustom ? rangeLabel : '직접 선택'}
          <Icon icon="solar:alt-arrow-down-linear" width={11} className={`transition-transform ${customOpen ? 'rotate-180' : ''}`} />
        </button>

        {customOpen && (
          <div
            ref={popRef}
            role="dialog"
            aria-label="기간 직접 선택"
            className="nav-pop absolute right-0 top-[calc(100%+8px)] z-30 flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-[12px] text-slate-500 shadow-popup"
          >
            <label className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">시작</span>
              <input type="date" value={period.start} onChange={(e) => setDate('start', e.target.value)} className={INPUT} />
            </label>
            <span className="text-slate-300">~</span>
            <label className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">종료</span>
              <input type="date" value={period.end || ''} min={period.start} onChange={(e) => setDate('end', e.target.value)} className={INPUT} />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
