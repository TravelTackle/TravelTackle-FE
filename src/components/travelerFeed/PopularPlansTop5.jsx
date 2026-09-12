import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { getFeed } from '../../api/feed'
import { adaptFeedItem } from '../../data/feedAdapter'

const TOP_N = 5

// 인기 계획 Top 5 — 서버 인기 정렬(GET /feed?sort=popular)에서 계획만 골라 스크랩 수와 함께 보여준다.
// 같은 세션에서 다시 들어와도 한 번만 조회한다.
let cache = null

export default function PopularPlansTop5({ onOpen }) {
  const [state, setState] = useState(() => ({ items: cache ?? [], loading: !cache, error: false }))

  useEffect(() => {
    if (cache) return
    let ignore = false
    getFeed({ size: 20, sort: 'popular' })
      .then((page) => {
        const plans = (page?.content ?? []).map(adaptFeedItem).filter((i) => i.type === 'plan').slice(0, TOP_N)
        cache = plans
        if (!ignore) setState({ items: plans, loading: false, error: false })
      })
      .catch(() => { if (!ignore) setState({ items: [], loading: false, error: true }) })
    return () => { ignore = true }
  }, [])

  return (
    <Card className="p-4">
      <div className="mb-3 text-[13px] font-bold text-slate-900">인기 계획 Top {TOP_N}</div>
      {state.loading ? (
        <div className="flex flex-col gap-1" role="status" aria-label="인기 계획을 불러오는 중">
          {Array.from({ length: TOP_N }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <Skeleton className="h-3 w-3" style={{ animationDelay: `${i * 70}ms` }} />
              <Skeleton className="h-10 w-10 rounded-lg" style={{ animationDelay: `${i * 70 + 40}ms` }} />
              <div className="flex-1">
                <Skeleton className="h-3 w-3/4" style={{ animationDelay: `${i * 70 + 80}ms` }} />
                <Skeleton className="mt-1.5 h-2.5 w-1/3" style={{ animationDelay: `${i * 70 + 120}ms` }} />
              </div>
              <Skeleton className="h-3 w-7" style={{ animationDelay: `${i * 70 + 160}ms` }} />
            </div>
          ))}
        </div>
      ) : state.error ? (
        <p className="px-2 py-4 text-[12px] text-rose-500">인기 계획을 불러오지 못했어요.</p>
      ) : state.items.length === 0 ? (
        <p className="px-2 py-4 text-[12px] text-slate-400">아직 공개된 계획이 없어요.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {state.items.map((p, i) => {
            const thumb = p.days?.flatMap((d) => d.places ?? []).find((pl) => pl.imageUrl)?.imageUrl
            return (
              <li key={p.id} className="animate-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span className={`w-4 shrink-0 text-[12px] font-extrabold tabular-nums ${i < 3 ? 'text-brand-dark' : 'text-slate-400'}`}>{i + 1}</span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                    {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <ScrollingTitle text={p.title} />
                    <div className="truncate text-[10.5px] text-slate-400">{p.user.nickname} · {p.duration}</div>
                  </div>
                  {typeof p.saveCount === 'number' && (
                    <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums text-amber-500">
                      <Icon icon="solar:bookmark-bold" width={11} />
                      {p.saveCount}
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}

// 제목이 길어 넘칠 때만, 그 행에 마우스를 올렸을 때만 좌우로 스크롤해 전체를 보여줌.
// 평소엔 가만히 있다가(정신 사납지 않게) hover 시에만 넘친 만큼 부드럽게 슬라이드.
function ScrollingTitle({ text }) {
  const textRef = useRef(null)
  const [overflow, setOverflow] = useState(0)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (!el || !el.parentElement) return
    setOverflow(Math.max(0, el.scrollWidth - el.parentElement.clientWidth))
  }, [text])

  const scrolling = hovered && overflow > 0

  return (
    <div
      className="overflow-hidden whitespace-nowrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        ref={textRef}
        className="inline-block text-[12px] font-bold text-slate-900"
        style={{
          transform: scrolling ? `translateX(-${overflow}px)` : 'translateX(0)',
          transitionProperty: 'transform',
          transitionDuration: scrolling ? `${Math.max(1.2, overflow / 30)}s` : '250ms',
          transitionTimingFunction: scrolling ? 'linear' : 'ease',
        }}
      >
        {text}
      </span>
    </div>
  )
}
