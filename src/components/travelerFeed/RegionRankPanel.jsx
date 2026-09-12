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
        <ol className="mt-3 flex flex-col gap-1.5" role="status" aria-label="인기 지역을 집계하는 중">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2.5 px-1 py-1.5">
              <Skeleton className="h-7 w-7 rounded-full" style={{ animationDelay: `${i * 90}ms` }} />
              <Skeleton className="h-3.5 w-14" style={{ animationDelay: `${i * 90 + 50}ms` }} />
              <Skeleton className="ml-auto h-3 w-8" style={{ animationDelay: `${i * 90 + 100}ms` }} />
            </li>
          ))}
        </ol>
      ) : top.length === 0 ? (
        <p className="mt-3 text-[12px] text-slate-400">아직 지역별 게시물이 없어요.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-0.5">
          {top.map((r, i) => {
            const isActive = active === r.region
            return (
              <li key={r.region} className="animate-slide-in" style={{ animationDelay: `${i * 70}ms` }}>
                <button
                  type="button"
                  onClick={() => onSelect(isActive ? null : r.region)}
                  aria-pressed={isActive}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors ${
                    isActive ? 'bg-brand-light' : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold tabular-nums transition-transform duration-300 group-hover:scale-110 ${RANK_STYLE[i]}`}
                    aria-label={`${i + 1}위`}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-[13px] font-bold ${isActive ? 'text-brand-dark' : 'text-slate-800'}`}>{r.region}</span>
                  <span className="ml-auto text-[11px] font-semibold tabular-nums text-slate-400">게시물 {r.count}</span>
                  <Icon
                    icon={isActive ? 'solar:check-circle-bold' : 'solar:alt-arrow-right-linear'}
                    width={14}
                    className={isActive ? 'text-brand' : 'text-slate-300 transition-transform group-hover:translate-x-0.5'}
                  />
                </button>
              </li>
            )
          })}
        </ol>
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
