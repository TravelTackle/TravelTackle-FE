import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Card from './ui/Card'
import Chip from './ui/Chip'
import Skeleton from './ui/Skeleton'
import { formatDate } from '../lib/homeFormat'
import { useAuth } from '../context/AuthContext'
import { getRecommendedRecords, getRecommendedTrips } from '../api/feed'

const PAGE_SIZE = 6

// 뱃지 스타일: 여행 계획 / 여행 피드백 / 여행 기록
const KIND = {
  plan: { label: '여행 계획', className: 'bg-brand-light text-brand' },
  feedback: { label: '여행 피드백', className: 'bg-amber-50 text-amber-600' },
  record: { label: '여행 기록', className: 'bg-[#F0FDFA] text-[#0F766E]' },
}

// 피드를 못 불러왔을 때 보여주는 예시 카드
const FALLBACK = [
  { id: 'f1', kind: 'plan', title: '제주 3박 4일 힐링 코스, 이렇게 짜보세요', desc: '협재부터 애월까지, 이동시간을 최소화한 동선으로 짠 실제 여행자의 코스예요.', meta: '여행에니아 · 2026.07.06' },
  { id: 'f2', kind: 'feedback', title: '부산 여행자 342명이 남긴 솔직 후기', desc: '"바다뷰 카페 순서까지 정리되어 있어서 사진 찍기 좋은 시간대까지 알 수 있었어요."', meta: 'busan_hero · 2026.07.05' },
  { id: 'f3', kind: 'record', title: '강릉 카페 투어, 사진으로 기록했어요', desc: '바다가 보이는 카페 5곳을 하루에 돌아본 기록, 동선과 웨이팅 팁까지 담았어요.', meta: '여행하는누나 · 2026.07.04' },
  { id: 'f4', kind: 'plan', title: '경주 역사&맛집 코스, 동선까지 완벽 정리', desc: '대기시간까지 고려해서 짜준 동선이라 시간 낭비 없이 다녀올 수 있는 코스예요.', meta: 'trip_lover · 2026.07.03' },
  { id: 'f5', kind: 'feedback', title: '전주 한옥마을, 실제 방문자 평가는?', desc: '골목 순서와 사진 찍기 좋은 시간대까지, 방문자들의 생생한 후기를 모았어요.', meta: '사진작가 · 2026.07.02' },
  { id: 'f6', kind: 'record', title: '제주 일몰 드라이브, 그 순간의 기록', desc: '서쪽 해안도로를 따라 달리며 만난 노을, 차 안에서 담은 순간들을 기록했어요.', meta: 'wanderlust · 2026.07.01' },
]

// 피드 항목 → 카드 한 장. 계획은 첫날 동선을, 기록은 본문을 요약문으로 쓴다.
function toCard(item) {
  const meta = [item.user?.nickname, formatDate(item.createdAt)].filter(Boolean).join(' · ')
  if (item.type === 'plan') {
    const firstDay = item.days?.[0]?.places ?? []
    const route = firstDay.slice(0, 3).map((p) => p.name).join(' → ')
    return {
      id: item.id,
      tripId: item.id,
      kind: 'plan',
      title: item.title,
      desc: [`${item.duration} · 장소 ${item.placeCount}곳`, route && `첫날 ${route}`].filter(Boolean).join(' · '),
      meta,
      imageUrl: firstDay.find((p) => p.imageUrl)?.imageUrl ?? null,
    }
  }
  return {
    id: item.id,
    tripId: item.planId,
    kind: 'record',
    title: item.title,
    desc: item.comment || '',
    meta,
    imageUrl: item.imageUrl ?? null,
  }
}

function SummaryCard({ card, matched }) {
  const kind = KIND[card.kind]
  return (
    <Card as={Link} to="/feed" className="flex gap-3 p-4 pt-[18px]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip className={`inline-flex px-2.5 py-1 text-[10.5px] font-bold ${kind.className}`}>{kind.label}</Chip>
          {matched && (
            <Chip className="inline-flex items-center gap-1 bg-violet-50 px-2 py-1 text-[10.5px] font-bold text-violet-600">
              <Icon icon="solar:magic-stick-3-bold" width={11} /> 취향 맞춤
            </Chip>
          )}
        </div>
        <div className="mt-2 text-[14px] font-bold text-slate-900 leading-snug line-clamp-2">{card.title}</div>
        <p className="mt-1.5 text-[12px] leading-[1.65] text-slate-500 line-clamp-2">{card.desc}</p>
        <div className="mt-2 text-[11.5px] text-slate-400 truncate">{card.meta}</div>
      </div>
      {card.imageUrl && (
        <img
          src={card.imageUrl}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover"
        />
      )}
    </Card>
  )
}

// 배너 문구. 요약 중엔 흰 스켈레톤 두 줄이 반짝이고, 끝나면 어절이 차례로 떠오른 뒤 빛이 한 번 훑고 지나간다
const HEADLINE_DEFAULT = [
  { text: '현재' },
  { text: '가장 인기있는', accent: true },
  { text: '여행 계획 및 피드백' },
  { text: '·', dot: true },
  { text: '사용자 후기를' },
  { text: '요약했어요' },
]

// 로그인 + 취향 등록으로 맞춤 추천이 잡혔을 때
function personalizedHeadline(name) {
  return [
    { text: `${name}님에게` },
    { text: '맞는', accent: true },
    { text: '여행 계획 및' },
    { text: '사용자 후기를' },
    { text: '가져왔어요' },
  ]
}

function AiHeadline({ summarizing, words }) {
  const full = words.map((w) => w.text).join(' ')
  if (summarizing) {
    return (
      <h2 className="min-w-0 flex-1">
        <span className="sr-only">{full} (요약하는 중)</span>
        <span className="flex items-center gap-2" aria-hidden="true">
          <span className="skeleton-on-brand h-3 w-[38%] max-w-[260px] rounded-full" />
          <span className="skeleton-on-brand h-3 w-[22%] max-w-[150px] rounded-full" style={{ animationDelay: '0.25s' }} />
        </span>
      </h2>
    )
  }
  return (
    <h2 className="relative min-w-0 flex-1 overflow-hidden text-white font-bold text-[14px] sm:text-[15px] leading-snug">
      <span className="flex flex-wrap items-baseline gap-x-[0.3em] gap-y-0.5">
        {words.map((w, i) => (
          <span
            key={w.text}
            className={`ai-word ${w.accent ? 'ai-glow font-extrabold text-sky-100 underline decoration-sky-300/70 decoration-2 underline-offset-4' : ''} ${
              w.dot ? 'text-white/50' : ''
            }`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {w.text}
          </span>
        ))}
      </span>
      {/* 리빌이 끝난 직후 왼쪽에서 오른쪽으로 한 번 지나가는 빛 */}
      <span
        aria-hidden="true"
        className="ai-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />
    </h2>
  )
}

// 요약 중: 별 아이콘과 링이 돈다 → 요약 끝: 흰 원 안에 체크가 톡 튀어나온다
function AiStatusBadge({ summarizing }) {
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      role="status"
      aria-label={summarizing ? 'AI가 요약하는 중' : 'AI 요약 완료'}
    >
      {summarizing ? (
        <>
          <span className="ai-spin absolute inset-0 rounded-full border-2 border-white/25 border-t-white" aria-hidden="true" />
          <span className="ai-spin-slow flex text-white" aria-hidden="true">
            <Icon icon="solar:stars-minimalistic-bold" width={18} />
          </span>
        </>
      ) : (
        <span className="ai-pop flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-card" aria-hidden="true">
          <Icon icon="solar:check-read-linear" width={20} />
        </span>
      )}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 pt-[18px]">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="mt-2.5 h-4 w-4/5" />
        <Skeleton className="mt-2.5 h-3 w-full" />
        <Skeleton className="mt-1.5 h-3 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/3" />
      </div>
      <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
    </div>
  )
}

const MIN_SPIN_MS = 1200

export default function AiSummaryFeed({ feed }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const touchStartX = useRef(null)
  // 배지는 피드 로딩이 끝나도 최소 MIN_SPIN_MS 동안은 "요약 중"으로 두어 회전이 보이게 한다
  const [minSpinOver, setMinSpinOver] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setMinSpinOver(true), MIN_SPIN_MS)
    return () => clearTimeout(id)
  }, [])
  // 로그인한 사용자의 취향과 맞는 계획/기록 id — 이 카드들을 앞으로 당기고 뱃지를 단다
  const [matchedTrips, setMatchedTrips] = useState(() => new Set())
  const [matchedRecords, setMatchedRecords] = useState(() => new Set())
  const [recLoading, setRecLoading] = useState(false) // 추천 응답을 기다리는 동안도 "요약 중"으로 둔다

  useEffect(() => {
    if (!user) {
      setMatchedTrips(new Set())
      setMatchedRecords(new Set())
      setRecLoading(false)
      return undefined
    }
    let ignore = false
    setRecLoading(true)
    Promise.all([getRecommendedTrips(30).catch(() => []), getRecommendedRecords(30).catch(() => [])]).then(
      ([trips, records]) => {
        if (ignore) return
        setMatchedTrips(new Set(trips.map((t) => t.tripId)))
        setMatchedRecords(new Set(records.map((r) => r.tripId)))
        setRecLoading(false)
      },
    )
    return () => {
      ignore = true
    }
  }, [user])

  // 맞춤 추천이 실제로 하나라도 잡혔을 때만 "당신에게 맞는" 문구를 쓴다 (취향 미등록·매칭 0건이면 기본 문구)
  const personalized = Boolean(user) && matchedTrips.size + matchedRecords.size > 0
  const headline = useMemo(
    () => (personalized ? personalizedHeadline(user.name || '회원') : HEADLINE_DEFAULT),
    [personalized, user],
  )
  const summarizing = feed.loading || recLoading || !minSpinOver

  const isMatched = useCallback(
    (card) => (card.kind === 'plan' ? matchedTrips.has(card.tripId) : matchedRecords.has(card.tripId)),
    [matchedTrips, matchedRecords],
  )

  const cards = useMemo(() => {
    const real = feed.items.map(toCard)
    if (!real.length) return FALLBACK
    // 취향 맞춤 카드를 먼저, 나머지는 원래 순서 그대로
    return [...real.filter(isMatched), ...real.filter((c) => !isMatched(c))]
  }, [feed.items, isMatched])

  const pageCount = Math.max(1, Math.ceil(cards.length / PAGE_SIZE))

  // 데이터가 바뀌어 페이지 수가 줄면 첫 페이지로
  useEffect(() => {
    setPage((p) => (p >= pageCount ? 0 : p))
  }, [pageCount])

  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => cards.slice(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE)),
    [cards, pageCount],
  )
  const go = (distance) => setPage((p) => Math.min(Math.max(0, p + distance), pageCount - 1))

  // 모바일 스와이프 — 40px 이상 옆으로 밀면 페이지 넘김
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
  }

  return (
    <section id="community" className="bg-white">
      <Section as="div" className="py-14 sm:py-16">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400">
          <span className="absolute left-5 top-0 bg-sky-400 text-white text-[10px] font-bold px-3 py-1.5 rounded-b-lg">모아보기</span>
          <div className="flex items-center justify-between pl-20 pr-5 sm:pr-6 py-5 gap-4">
            <AiHeadline key={personalized ? 'personal' : 'default'} summarizing={summarizing} words={headline} />
            <AiStatusBadge summarizing={summarizing} />
          </div>
        </div>

        {feed.loading ? (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4" role="status" aria-label="여행 이야기를 불러오는 중">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="relative mt-5">
            {/* 페이지들을 한 줄로 늘어놓고 트랙을 옆으로 밀어서 넘긴다. 카드 hover 그림자가 잘리지 않게 안쪽 여백을 둔다 */}
            <div className="-mx-2 -my-3 overflow-hidden px-2 py-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div
                className="flex items-start transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `translateX(-${page * 100}%)` }}
              >
                {pages.map((pageCards, i) => (
                  <div
                    key={i}
                    className="grid w-full shrink-0 grid-cols-1 gap-4 md:grid-cols-3"
                    aria-hidden={i !== page}
                    inert={i !== page} // 화면 밖 페이지의 링크는 탭 이동에서 건너뛴다
                  >
                    {pageCards.map((card) => (
                      <SummaryCard key={card.id} card={card} matched={isMatched(card)} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {pageCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={page === 0}
                  aria-label="이전 페이지"
                  className="absolute -left-4 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-card transition-all hover:text-brand hover:shadow-card-hover disabled:opacity-0 lg:flex"
                >
                  <Icon icon="solar:alt-arrow-left-linear" width={18} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  disabled={page === pageCount - 1}
                  aria-label="다음 페이지"
                  className="absolute -right-4 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-card transition-all hover:text-brand hover:shadow-card-hover disabled:opacity-0 lg:flex"
                >
                  <Icon icon="solar:alt-arrow-right-linear" width={18} />
                </button>
              </>
            )}
          </div>
        )}

        {pageCount > 1 && !feed.loading && (
          <div className="mt-6 flex justify-center gap-2.5">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-3.5 rounded-full transition-all ${i === page ? 'w-7 bg-brand' : 'w-3.5 bg-slate-300 hover:bg-slate-400'}`}
                aria-label={`${i + 1}페이지`}
                aria-current={i === page}
              />
            ))}
          </div>
        )}
      </Section>
    </section>
  )
}
