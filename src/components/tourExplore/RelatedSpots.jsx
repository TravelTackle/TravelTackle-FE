import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import CardImage from '../ui/CardImage'
import { getNearbyTourContents, getRelatedTourContents } from '../../api/tour'

const COLLAPSED_COUNT = 4 // 2×2
const MAX_COUNT = 8 // 펼치면 2×4
const TYPE_ATTRACTION = '12'
const NO_RELATED_TYPES = ['39', '32'] // 음식점·숙박은 연관 관광지 데이터가 없다

// 가장 가까운 세로 스크롤 부모(드로어 패널)를 찾는다
function findScrollParent(node) {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) return el
  }
  return null
}

// 관광지 → 연관 관광지(티맵 이동 데이터 순위순). 음식점·숙박이거나 연관 데이터가 없으면 주변 관광지로 대체.
export default function RelatedSpots({ detail, onSelect }) {
  const { contentId, contentTypeId, longitude, latitude } = detail
  const [state, setState] = useState({ status: 'loading', items: [], kind: 'related' })
  const [expanded, setExpanded] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    let ignore = false
    setState({ status: 'loading', items: [], kind: 'related' })
    setExpanded(false)

    const loadNearby = () => {
      if (longitude == null || latitude == null) return []
      return getNearbyTourContents({ longitude, latitude, radius: 5000, contentTypeId: TYPE_ATTRACTION, size: MAX_COUNT + 1 })
        .then((page) => (page?.items ?? []).filter((item) => item.contentId !== contentId).slice(0, MAX_COUNT))
    }

    const load = async () => {
      if (!NO_RELATED_TYPES.includes(contentTypeId)) {
        const related = await getRelatedTourContents(contentId, MAX_COUNT)
        if (related.length > 0) return { items: related, kind: 'related' }
      }
      return { items: await loadNearby(), kind: 'nearby' }
    }

    load()
      .then((result) => { if (!ignore) setState({ status: 'done', ...result }) })
      .catch(() => { if (!ignore) setState({ status: 'done', items: [], kind: 'related' }) })
    return () => { ignore = true }
  }, [contentId, contentTypeId, longitude, latitude])

  // 더보기를 누르면 늘어난 카드를 보려는 것이니 패널을 맨 아래까지 부드럽게 내려준다
  useEffect(() => {
    if (!expanded) return
    const panel = findScrollParent(sectionRef.current)
    panel?.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' })
  }, [expanded])

  if (state.status === 'done' && state.items.length === 0) return null

  const title = state.kind === 'related' ? '함께 가볼 만한 곳' : '이 근처 가볼 만한 곳'
  const visible = expanded ? state.items : state.items.slice(0, COLLAPSED_COUNT)

  return (
    <section ref={sectionRef} className="border-t border-slate-100 px-4 pb-6 pt-5">
      {state.status === 'loading' ? (
        <div className="h-[14px] w-28 animate-pulse rounded bg-slate-100" />
      ) : (
        <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
      )}
      {state.kind === 'related' && state.status === 'done' && (
        <p className="mt-0.5 text-[11px] text-slate-400">이 장소를 찾은 뒤 이어서 많이 찾은 관광지예요</p>
      )}

      {state.status === 'loading' ? (
        <div className="mt-3 grid animate-pulse grid-cols-2 gap-2.5">
          {Array.from({ length: COLLAPSED_COUNT }, (_, i) => (
            <div key={i}>
              <div className="h-[92px] rounded-xl bg-slate-100" />
              <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-3">
            {visible.map((spot) => (
              <li key={spot.contentId}>
                <button type="button" onClick={() => onSelect(spot.contentId)} className="group block w-full text-left">
                  <CardImage src={spot.imageUrl} alt={spot.title} compact className="h-[92px] w-full overflow-hidden rounded-xl" />
                  <div className="mt-1.5 truncate text-[12.5px] font-bold text-slate-900 group-hover:text-ink-brand">{spot.title}</div>
                  <div className="truncate text-[11px] text-slate-400">{spot.address || ' '}</div>
                </button>
              </li>
            ))}
          </ul>

          {state.items.length > COLLAPSED_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mx-auto mt-2.5 flex items-center gap-0.5 text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-600"
            >
              {expanded ? '접기' : '더보기'}
              <Icon icon={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={11} />
            </button>
          )}
        </>
      )}
    </section>
  )
}
