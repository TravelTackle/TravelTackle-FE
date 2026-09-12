import { useMemo } from 'react'
import { Icon } from '@iconify/react'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'

const WEEK_MS = 7 * 86_400_000

// 1위 금 · 2위 은 · 3위 동 — 홈 모아보기 순위와 같은 배지
const RANK_STYLE = [
  'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-[0_4px_10px_rgba(245,158,11,0.35)]',
  'bg-gradient-to-br from-slate-300 to-slate-400 text-white',
  'bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900',
]

// 피드 항목의 region을 세어 [{ region, count }]를 많은 순으로 — 지역이 비어 있는 항목은 뺀다
function countRegions(items) {
  const counts = new Map()
  items.forEach((i) => {
    if (!i.region) return
    counts.set(i.region, (counts.get(i.region) ?? 0) + 1)
  })
  return [...counts.entries()].map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count)
}

// 이번 주 인기 지역 TOP 3 + 지역 필터 칩. 백엔드에 지역 집계 API가 없어 받아온 피드(계획·기록)의 region으로 센다.
// 이번 주(최근 7일) 게시물이 없으면 전체 기간으로 대신 세고 캡션에 표시한다.
export function useRegionStats(items) {
  return useMemo(() => {
    const since = Date.now() - WEEK_MS
    const thisWeek = items.filter((i) => i.createdAt && new Date(i.createdAt).getTime() >= since)
    const weekly = countRegions(thisWeek)
    const all = countRegions(items)
    const top = (weekly.length ? weekly : all).slice(0, 3)
    return { top, all, weekly: weekly.length > 0 }
  }, [items])
}

export default function RegionRankPanel({ stats, loading, active, onSelect, layout = 'sidebar' }) {
  const { top, all, weekly } = stats

  if (layout === 'row') {
    // 갤러리 보기 상단 — 순위 3개를 앞에 두고 나머지 지역 칩을 이어 붙인 한 줄
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-[13px] font-bold text-slate-900">{weekly ? '이번 주 인기 지역' : '인기 지역'}</span>
        {loading ? (
          [72, 64, 68, 60, 60].map((w, i) => <Skeleton key={i} className="h-8 shrink-0 rounded-full" style={{ width: w, animationDelay: `${i * 60}ms` }} />)
        ) : (
          <>
            {top.map((r, i) => (
              <RegionChip key={r.region} region={r.region} count={r.count} rank={i + 1} active={active === r.region} onSelect={onSelect} />
            ))}
            {all
              .filter((r) => !top.some((t) => t.region === r.region))
              .map((r) => (
                <RegionChip key={r.region} region={r.region} count={r.count} active={active === r.region} onSelect={onSelect} />
              ))}
          </>
        )}
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-slate-900">{weekly ? '이번 주 인기 지역' : '인기 지역'}</div>
        {!loading && !weekly && all.length > 0 && <span className="text-[10.5px] text-slate-400">전체 기간</span>}
      </div>

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
        <p className="mt-3 text-[12px] text-slate-400">아직 지역별 게시물이 없어요.</p>
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
                !active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              전체
            </button>
            {all.map((r) => (
              <RegionChip key={r.region} region={r.region} count={r.count} active={active === r.region} onSelect={onSelect} small />
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
            aria-label={`${col.rank}위 ${r.region}, 게시물 ${r.count}개`}
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

function RegionChip({ region, count, rank, active, onSelect, small = false }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(active ? null : region)}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1 rounded-full border font-bold transition-all ${
        small ? 'px-3 py-1 text-[11.5px]' : 'px-3.5 py-1.5 text-[12px]'
      } ${active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
    >
      {rank && (
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-extrabold ${RANK_STYLE[rank - 1]}`}>{rank}</span>
      )}
      {region}
      <span className={`text-[10px] font-semibold tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>{count}</span>
    </button>
  )
}
