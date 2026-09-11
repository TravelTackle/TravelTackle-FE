import { useState } from 'react'
import { Icon } from '@iconify/react'
import Skeleton from '../ui/Skeleton'
import { PERIOD_PRESETS, formatRange } from '../../lib/festivalPeriod'

const INPUT =
  'h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none transition-colors [color-scheme:light] focus:border-brand hover:border-brand/40 disabled:text-slate-300'

// 축제·행사 테마에서 그리드 위에 붙는 기간 선택 바 — 프리셋 알약 + 직접 선택 날짜, 결과 수는 로딩 중 스켈레톤
export default function FestivalPeriodBar({ period, onChange, regionName, loading, totalCount }) {
  const [customOpen, setCustomOpen] = useState(period.preset === 'custom')
  const rangeLabel = formatRange(period.start, period.end)

  function pickPreset(key) {
    onChange({ preset: key })
    if (key !== 'custom') setCustomOpen(false)
  }

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

  return (
    <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
              <Icon icon="mdi:party-popper" width={16} />
            </span>
            <h2 className="text-[15px] font-bold text-slate-900">
              {regionName ? `${regionName} 축제 · 행사` : '축제 · 행사'}
            </h2>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-slate-500">
            <Icon icon="solar:calendar-linear" width={14} className="text-slate-400" />
            <span>{rangeLabel}</span>
            <span className="text-slate-300">·</span>
            {loading ? (
              <Skeleton className="h-3.5 w-10 rounded-md" />
            ) : (
              <span key={totalCount} className="ai-pop inline-block font-bold text-brand-dark">
                {totalCount.toLocaleString()}개
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          aria-expanded={customOpen}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            customOpen || period.preset === 'custom'
              ? 'border-brand bg-brand-light text-brand-dark'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40'
          }`}
        >
          <Icon icon="solar:calendar-search-linear" width={14} />
          날짜 직접 선택
          <Icon icon="solar:alt-arrow-down-linear" width={11} className={`transition-transform ${customOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide" role="tablist" aria-label="기간 프리셋">
        {PERIOD_PRESETS.map((p) => {
          const active = period.preset === p.key
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={active}
              title={p.hint}
              onClick={() => pickPreset(p.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${
                active
                  ? 'bg-brand text-white shadow-card'
                  : 'bg-slate-50 text-slate-600 hover:bg-brand-light hover:text-brand-dark'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          customOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <label className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">시작</span>
              <input
                type="date"
                value={period.start}
                onChange={(e) => setDate('start', e.target.value)}
                tabIndex={customOpen ? 0 : -1}
                className={INPUT}
              />
            </label>
            <span className="text-slate-300">~</span>
            <label className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">종료</span>
              <input
                type="date"
                value={period.end || ''}
                min={period.start}
                onChange={(e) => setDate('end', e.target.value)}
                tabIndex={customOpen ? 0 : -1}
                className={INPUT}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
