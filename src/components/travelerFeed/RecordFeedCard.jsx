import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { FeedUserHeader, FeedActionBar } from './FeedCardChrome'
import { PlanCardBody } from './PlanFeedCard'
import { getFeedDetail } from '../../api/feed'
import { adaptPlanDetail } from '../../data/feedAdapter'
import { useLanguage } from '../../i18n'

// RecordFeedCard 전체 문구 — ParticipateSection과 같은 언어별 맵 패턴
const T = {
  ko: {
    loadingPlan: '여행 계획을 불러오는 중',
    planLoadFailed: '이 기록의 여행 계획을 불러오지 못했어요.',
    retry: '다시 시도',
    record: '기록',
    plan: '계획',
    switchAria: '기록과 계획 전환',
  },
  en: {
    loadingPlan: 'Loading trip plan',
    planLoadFailed: "Could not load this record's trip plan.",
    retry: 'Try again',
    record: 'Record',
    plan: 'Plan',
    switchAria: 'Switch between record and plan',
  },
}

// planId → 계획 Promise 캐시. 같은 기록을 여러 번 뒤집어도, 카드가 다시 마운트돼도 한 번만 조회한다.
const planCache = new Map()

function loadPlan(planId, findPlan) {
  const local = findPlan?.(planId)
  if (local) return Promise.resolve(local)
  if (!planCache.has(planId)) {
    planCache.set(
      planId,
      getFeedDetail(planId)
        .then(adaptPlanDetail)
        .catch((err) => {
          planCache.delete(planId) // 실패는 캐시하지 않아 다시 시도할 수 있게
          throw err
        }),
    )
  }
  return planCache.get(planId)
}

// 기록 카드 — 앞면은 기록, 헤더의 기록|계획 스위치를 누르면 카드가 뒤집혀 뒷면에 그 기록의 여행 계획이 나온다.
// findPlan(planId): 피드 목록에 이미 있는 계획을 돌려주면 조회 없이 바로 뒤집힌다.
// extra: 카드 하단에 덧붙일 요소 — 보관함에서 "나의 계획으로 복사하기" 버튼을 붙이는 데 쓴다.
export default function RecordFeedCard({ item, onOpen, findPlan, extra }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [flipped, setFlipped] = useState(false)
  const [plan, setPlan] = useState(() => findPlan?.(item.planId) ?? null)
  const [planError, setPlanError] = useState(false)
  const frontRef = useRef(null)
  const backRef = useRef(null)
  const [sizes, setSizes] = useState({ front: 0, back: 0 })

  // 앞·뒷면 높이를 각각 계속 관찰하고, 카드 높이는 보이는 면의 값을 쓴다 — 이미지가 늦게 로드되거나
  // Day를 넘겨 내용이 바뀌어도 따라가고, 뒤집을 때 height 전환으로 부드럽게 늘고 준다
  useLayoutEffect(() => {
    const front = frontRef.current
    const back = backRef.current
    if (!front || !back) return
    const measure = () => setSizes({ front: front.offsetHeight, back: back.offsetHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(front)
    observer.observe(back)
    return () => observer.disconnect()
  }, [])

  const height = flipped ? sizes.back : sizes.front

  // 뒤집힌 뒤에 계획을 가져온다 — 스켈레톤이 먼저 보이고 내용이 이어서 올라온다
  useEffect(() => {
    if (!flipped || plan || !item.planId) return
    let ignore = false
    setPlanError(false)
    loadPlan(item.planId, findPlan)
      .then((p) => { if (!ignore) setPlan(p) })
      .catch(() => { if (!ignore) setPlanError(true) })
    return () => { ignore = true }
  }, [flipped, plan, item.planId, findPlan])

  function flip(e) {
    e.stopPropagation()
    setFlipped((v) => !v)
  }

  // 헤더 오른쪽 타입 칩 자리에 놓는 기록|계획 스위치 — 앞·뒷면 같은 자리라 뒤집혀도 손이 가는 위치가 그대로다
  const flipSwitch = item.planId ? <FlipSwitch value={flipped ? 'plan' : 'record'} onToggle={flip} copy={copy} /> : null

  return (
    <Card as="div" shadow className="flip-scene p-0 text-left">
      <div
        className={`flip-inner ${flipped ? 'is-flipped' : ''}`}
        style={height ? { height } : undefined}
        aria-live="polite"
      >
        {/* 앞면 — 기록 */}
        <div
          ref={frontRef}
          role="button"
          tabIndex={flipped ? -1 : 0}
          aria-hidden={flipped}
          onClick={() => onOpen(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpen(item)
          }}
          className="flip-face flip-front cursor-pointer p-4"
        >
          <div className="flex items-center justify-between">
            <FeedUserHeader item={item} showChip={!flipSwitch} />
            {flipSwitch}
          </div>

          {/* 가로 사진은 4:3, 세로 사진은 계획 카드 썸네일과 같은 4:5로 맞춰 폭에 비례해 스케일 */}
          <div
            className={`relative mt-3 w-full overflow-hidden rounded-2xl bg-slate-200 ${
              item.orientation === 'portrait' ? 'aspect-[4/5]' : 'aspect-[4/3]'
            }`}
          >
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>

          <div className="mt-3 text-[14px] font-bold text-slate-900">{item.title}</div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-slate-500">{item.comment}</p>

          <FeedActionBar item={item} />
        </div>

        {/* 뒷면 — 이 기록의 여행 계획 */}
        <div
          ref={backRef}
          aria-hidden={!flipped}
          className="flip-face flip-back p-4"
        >
          {plan ? (
            <div
              role="button"
              tabIndex={flipped ? 0 : -1}
              onClick={() => onOpen(plan)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpen(plan)
              }}
              className="flip-content cursor-pointer"
            >
              <PlanCardBody item={plan} headerRight={flipSwitch} />
            </div>
          ) : planError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Icon icon="mdi:map-marker-off-outline" width={26} className="text-slate-300" />
              <p className="text-[12.5px] text-slate-500">{copy.planLoadFailed}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPlanError(false); setPlan(null); setFlipped(true) }}
                  className="rounded-full bg-brand-light px-3.5 py-1.5 text-[12px] font-bold text-brand-dark transition-colors hover:bg-brand hover:text-white"
                >
                  {copy.retry}
                </button>
                {flipSwitch}
              </div>
            </div>
          ) : (
            <PlanSkeleton headerRight={flipSwitch} copy={copy} />
          )}
        </div>
      </div>
      {extra && <div className="px-4 pb-4">{extra}</div>}
    </Card>
  )
}

// 뒷면 스켈레톤 — 계획 카드와 같은 골격(작성자 · Day 알약 · 장소 4장 · 제목 · 메타)
function PlanSkeleton({ headerRight, copy }) {
  return (
    <div role="status" aria-label={copy.loadingPlan}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div>
            <Skeleton className="h-3 w-16" style={{ animationDelay: '60ms' }} />
            <Skeleton className="mt-1.5 h-2.5 w-10" style={{ animationDelay: '120ms' }} />
          </div>
        </div>
        {headerRight}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" style={{ animationDelay: '150ms' }} />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
      <div className="mt-2 flex gap-2 pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0 grow-0 basis-[calc((100%-1.5rem)/4)]">
            <Skeleton className="aspect-[4/5] w-full rounded-xl" style={{ animationDelay: `${200 + i * 90}ms` }} />
            <Skeleton className="mx-auto mt-1.5 h-2.5 w-12" style={{ animationDelay: `${260 + i * 90}ms` }} />
          </div>
        ))}
      </div>
      <Skeleton className="mt-3 h-4 w-2/3" style={{ animationDelay: '560ms' }} />
      <Skeleton className="mt-2 h-3 w-1/3" style={{ animationDelay: '620ms' }} />
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-5 w-5 rounded-md" />
      </div>
    </div>
  )
}

const SIDE_DEFS = [
  { value: 'record', icon: 'mdi:camera-outline', active: 'text-emerald-600' },
  { value: 'plan', icon: 'mdi:calendar-blank-outline', active: 'text-brand-dark' },
]

// 기록|계획 미니 스위치 — 흰 썸이 선택 쪽으로 미끄러진다. 두 칸 폭이 같아 100% 단위로 옮긴다.
function FlipSwitch({ value, onToggle, copy }) {
  const index = SIDE_DEFS.findIndex((s) => s.value === value)
  const sides = SIDE_DEFS.map((s) => ({ ...s, label: s.value === 'record' ? copy.record : copy.plan }))
  return (
    <div
      role="group"
      aria-label={copy.switchAria}
      className="relative grid shrink-0 grid-cols-2 rounded-full bg-slate-100 p-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <span
        aria-hidden="true"
        className="mode-thumb pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-surface shadow-card"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {sides.map((side) => {
        const active = side.value === value
        return (
          <button
            key={side.value}
            type="button"
            aria-pressed={active}
            onClick={(e) => { if (!active) onToggle(e) }}
            className={`relative z-10 flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors duration-300 ${
              active ? side.active : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon icon={side.icon} width={13} />
            {side.label}
          </button>
        )
      })}
    </div>
  )
}
