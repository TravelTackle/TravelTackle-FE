import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { getFeedRegionCounts } from '../../api/feed'

const TOP_N = 3

// 1위 금 · 2위 은 · 3위 동 — 홈 모아보기 순위와 같은 배지
const RANK_STYLE = [
  'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-[0_4px_10px_rgba(245,158,11,0.35)]',
  'bg-gradient-to-br from-slate-300 to-slate-400 text-white',
  'bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900',
]

// 인기 지역 — GET /feed/regions 가 공개 계획에 담긴 지역을 세어 준다(계획 수 내림차순, 동점은 지역명순).
// 한 계획에 여러 지역이 섞이면 각 지역에 1씩, 같은 지역 일정이 여러 개여도 그 계획에서는 1번만 센다.
// 기간은 두 가지 — '이번 달'(파라미터 없이 호출, 백엔드 기본값)과 '전체'(기간을 넓게 지정).
// 시상대는 상위 3개, 필터 칩은 받은 목록 전체를 쓴다. 같은 세션에서는 기간별로 한 번만 조회한다.
const PERIODS = [
  { value: 'month', label: '이번 달', icon: 'solar:calendar-minimalistic-linear' },
  { value: 'all', label: '전체', icon: 'solar:infinity-linear' },
]
const REGION_LIMIT = 10
const ALL_RANGE = { from: '2000-01-01', to: '2030-12-31' }
const cache = { month: null, all: null }

async function fetchRegions(period) {
  const rows = await getFeedRegionCounts(period === 'all' ? { ...ALL_RANGE, size: REGION_LIMIT } : { size: REGION_LIMIT })
  const chips = (Array.isArray(rows) ? rows : []).map((r) => ({ region: r.region, count: r.tripCount }))
  return { chips, top: chips.slice(0, TOP_N) }
}

export function useRegionRanking() {
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(() => cache.month ?? { top: [], chips: [] })
  const [loading, setLoading] = useState(!cache.month)

  useEffect(() => {
    const cached = cache[period]
    if (cached) {
      setData(cached)
      setLoading(false)
      return undefined
    }
    let ignore = false
    setLoading(true)
    fetchRegions(period)
      .then((r) => {
        cache[period] = r
        if (!ignore) setData(r)
      })
      .catch(() => { if (!ignore) setData({ top: [], chips: [] }) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [period])

  return { ...data, period, setPeriod, loading, month: new Date().getMonth() + 1 }
}

// 기간 전환 — 피드의 전체/계획/기록 세그먼트와 같은 방식(흰 썸이 선택 쪽으로 미끄러진다)
function PeriodSwitch({ period, onChange, compact = false }) {
  const trackRef = useRef(null)
  const [thumb, setThumb] = useState(null)

  useLayoutEffect(() => {
    function measure() {
      const el = trackRef.current?.querySelector(`[data-period="${period}"]`)
      if (!el) return
      setThumb({ x: el.offsetLeft, w: el.offsetWidth })
    }
    measure()
    const t = setTimeout(measure, 300) // 웹폰트가 늦게 오면 라벨 폭이 바뀐다
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [period, compact])

  return (
    <div
      ref={trackRef}
      role="group"
      aria-label="인기 지역 기간"
      className={`relative flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 ${compact ? 'p-0.5' : 'p-1'}`}
    >
      <span
        aria-hidden="true"
        className="mode-thumb pointer-events-none absolute inset-y-1 left-0 rounded-full bg-surface shadow-card"
        style={{ width: thumb ? thumb.w : 0, transform: `translateX(${thumb ? thumb.x : 0}px)`, opacity: thumb ? 1 : 0, top: compact ? 2 : undefined, bottom: compact ? 2 : undefined }}
      />
      {PERIODS.map((p) => {
        const active = period === p.value
        return (
          <button
            key={p.value}
            type="button"
            data-period={p.value}
            onClick={() => onChange(p.value)}
            aria-pressed={active}
            className={`relative z-10 flex shrink-0 items-center gap-1 rounded-full whitespace-nowrap font-bold transition-colors duration-300 ${
              compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-[11.5px]'
            } ${active ? 'text-brand-dark' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Icon icon={p.icon} width={12} className={`transition-colors duration-300 ${active ? 'text-brand' : 'text-slate-400'}`} />
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

export default function RegionRankPanel({ ranking, active, onSelect, layout = 'sidebar' }) {
  const { top, chips: all, month, period, setPeriod, loading } = ranking
  const isMonth = period === 'month'
  const title = isMonth ? `${month}월 인기 지역` : '전체 인기 지역'

  if (layout === 'row') {
    // 갤러리 보기 상단 — 순위 3개를 앞에 두고 나머지 지역 칩을 이어 붙인 한 줄
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-[13px] font-bold text-slate-900">{title}</span>
        <PeriodSwitch period={period} onChange={setPeriod} compact />
        {loading ? (
          [72, 64, 68, 60, 60].map((w, i) => <Skeleton key={i} className="h-8 shrink-0 rounded-full" style={{ width: w, animationDelay: `${i * 60}ms` }} />)
        ) : (
          <>
            {top.map((r, i) => (
              <RegionChip key={r.region} region={r.region} rank={i + 1} active={active === r.region} onSelect={onSelect} />
            ))}
            {all
              .filter((r) => !top.some((t) => t.region === r.region))
              .map((r) => (
                <RegionChip key={r.region} region={r.region} active={active === r.region} onSelect={onSelect} />
              ))}
          </>
        )}
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-slate-900">{title}</div>
        <PeriodSwitch period={period} onChange={setPeriod} />
      </div>
      <p className="mt-1 text-[10.5px] text-slate-400">{isMonth ? '이번 달' : '전체 기간'} 공개된 계획 기준</p>

      {loading ? (
        <div className="mt-3 flex items-end justify-center gap-2 px-2" role="status" aria-label="인기 지역을 집계하는 중">
          {[52, 76, 44].map((h, i) => (
            <div key={i} className="flex w-full flex-col items-center gap-1.5">
              <Skeleton className="h-3 w-10" style={{ animationDelay: `${i * 90}ms` }} />
              <Skeleton className="w-full rounded-t-xl rounded-b-md" style={{ height: h, animationDelay: `${i * 90 + 60}ms` }} />
            </div>
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-center text-[12px] text-slate-400">
          {isMonth ? `${month}월에 공개된 계획이 아직 없어요.` : '아직 공개된 계획이 없어요.'}
        </p>
      ) : (
        <Podium top={top} active={active} onSelect={onSelect} />
      )}

      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="mb-2 text-[11px] font-bold text-slate-400">지역으로 보기</div>
        {loading ? (
          <div className="flex flex-wrap gap-1.5">
            {[52, 60, 56, 64, 52, 58].map((w, i) => <Skeleton key={i} className="h-7 rounded-full" style={{ width: w, animationDelay: `${300 + i * 50}ms` }} />)}
          </div>
        ) : all.length === 0 ? (
          <p className="text-[12px] text-slate-400">게시물이 올라오면 지역이 여기에 모여요.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={!active}
              className={`rounded-full border px-3 py-1 text-[11.5px] font-bold transition-all ${
                !active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-surface text-slate-500 hover:bg-slate-50'
              }`}
            >
              전체
            </button>
            {all.map((r) => (
              <RegionChip key={r.region} region={r.region} active={active === r.region} onSelect={onSelect} small />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// 시상대 — 2위 · 1위 · 3위 순으로 세우고 1위가 가장 높다. 기둥을 누르면 그 지역으로 필터링
const PODIUM = [
  { rank: 2, height: 52, bar: 'bg-brand-light text-brand-dark', label: 'text-slate-500' },
  { rank: 1, height: 76, bar: 'bg-gradient-to-t from-brand-dark to-brand-mid text-white shadow-float', label: 'text-slate-900' },
  { rank: 3, height: 42, bar: 'bg-slate-100 text-slate-600', label: 'text-slate-500' },
]

function Podium({ top, active, onSelect }) {
  return (
    <div className="mt-3 flex items-end justify-center gap-2 px-1">
      {PODIUM.map((col, i) => {
        const r = top[col.rank - 1]
        if (!r) return <div key={col.rank} className="w-full" />
        const isActive = active === r.region
        return (
          <button
            key={col.rank}
            type="button"
            onClick={() => onSelect(isActive ? null : r.region)}
            aria-pressed={isActive}
            aria-label={`${col.rank}위 ${r.region}, 계획 ${r.count}개`}
            className="group flex w-full flex-col items-center gap-1.5 rounded-xl px-0.5 pt-1 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {col.rank === 1 && (
              <Icon icon="solar:crown-bold" width={16} className="ai-pop text-amber-400" style={{ animationDelay: '500ms' }} />
            )}
            <span className={`max-w-full truncate text-[12.5px] font-extrabold ${isActive ? 'text-brand-dark' : col.label}`}>{r.region}</span>
            <div
              className={`podium-rise flex w-full flex-col items-center justify-end rounded-t-xl rounded-b-md pb-1.5 transition-shadow ${col.bar} ${
                isActive ? 'ring-2 ring-brand ring-offset-2' : ''
              }`}
              style={{ height: col.height, animationDelay: `${i * 110}ms` }}
            >
              <span className="text-[15px] font-black leading-none tabular-nums">{col.rank}</span>
              <span className="mt-0.5 text-[10px] font-semibold opacity-80">{r.count}건</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// 지역 칩 — 개수는 보여주지 않는다(집계 기준이 계획 단위라 목록 건수와 달라 혼란스러워서). 순위 배지만 남긴다
function RegionChip({ region, rank, active, onSelect, small = false }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(active ? null : region)}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1 rounded-full border font-bold transition-all ${
        small ? 'px-3 py-1 text-[11.5px]' : 'px-3.5 py-1.5 text-[12px]'
      } ${active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-surface text-slate-500 hover:bg-slate-50'}`}
    >
      {rank && (
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-extrabold ${RANK_STYLE[rank - 1]}`}>{rank}</span>
      )}
      {region}
    </button>
  )
}
