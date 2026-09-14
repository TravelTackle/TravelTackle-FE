import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Skeleton from './ui/Skeleton'
import { formatDate, formatDuration } from '../lib/homeFormat'
import { useAuth } from '../context/AuthContext'
import { getRecommendedRecords, getRecommendedTrips } from '../api/feed'
import { getPreferences } from '../api/preferences'
import { useLanguage } from '../i18n'

const TOP_N = 3
const MIN_SPIN_MS = 1200

// "요약 중" 연출은 세션에서 처음 홈을 열 때만. 다른 페이지를 다녀오면 바로 결과를 보여준다
let revealedOnce = false
// 추천 응답 캐시 (사용자 id → { trips, records })
const recCache = new Map()

// 두 열: 왼쪽은 여행 계획(참견·피드백이 달리는 글), 오른쪽은 다녀온 뒤 남긴 기록
function getGroups(language) {
  if (language !== 'ko') {
    return {
      plan: {
        key: 'plan',
        title: 'Trip Plans · Feedback',
        icon: 'solar:map-linear',
        accent: 'text-brand',
        accentBg: 'bg-brand-light',
        filter: 'plan',
        popularCaption: 'Plans with the most feedback',
        personalCaption: 'Plans matching your interests',
        empty: 'No trip plans yet',
        fallbackCaption: "No plans match your interests yet, so we filled this with popular plans",
      },
      record: {
        key: 'record',
        title: 'Records',
        icon: 'solar:camera-linear',
        accent: 'text-[#0F766E]',
        accentBg: 'bg-[#F0FDFA]',
        filter: 'record',
        popularCaption: 'Records with the most reactions',
        personalCaption: 'Records from travelers with similar interests',
        empty: 'No records yet',
        fallbackCaption: "No records match your interests yet, so we filled this with popular records",
      },
    }
  }
  return {
    plan: {
      key: 'plan',
      title: '여행 계획 · 피드백',
      icon: 'solar:map-linear',
      accent: 'text-brand',
      accentBg: 'bg-brand-light',
      filter: 'plan',
      popularCaption: '참견이 많이 달린 계획',
      personalCaption: '취향과 겹치는 장소가 많은 계획',
      empty: '아직 올라온 여행 계획이 없어요',
      fallbackCaption: '취향에 맞는 계획이 아직 없어 인기 계획으로 채웠어요',
    },
    record: {
      key: 'record',
      title: '기록',
      icon: 'solar:camera-linear',
      accent: 'text-[#0F766E]',
      accentBg: 'bg-[#F0FDFA]',
      filter: 'record',
      popularCaption: '반응이 많았던 기록',
      personalCaption: '취향이 비슷한 여행자의 기록',
      empty: '아직 올라온 기록이 없어요',
      fallbackCaption: '취향에 맞는 기록이 아직 없어 인기 기록으로 채웠어요',
    },
  }
}

// AiSummaryFeed 전체에서 쓰는 사이트 문구 — 언어별 맵(§다른 언어 추가 시 확장성)
const T = {
  ko: {
    highlights: '모아보기',
    more: '더보기',
    summarizingAria: (text) => `${text} (요약하는 중)`,
    aiSummarizing: 'AI가 요약하는 중',
    aiDone: 'AI 요약 완료',
    modeSwitchAria: '모아보기 기준',
    loading: '불러오는 중',
    rank: (n) => `${n}위`,
    matchingSpots: (n) => `겹치는 장소 ${n}곳`,
    feedbackCount: (n) => `참견 ${n}`,
    savedCount: (n) => `저장 ${n}`,
    savedTitle: '내 여행으로 담은 수',
    placeCount: (n) => `장소 ${n}곳`,
    firstDay: (route) => `첫날 ${route}`,
  },
  en: {
    highlights: 'Highlights',
    more: 'More',
    summarizingAria: (text) => `${text} (summarizing)`,
    aiSummarizing: 'AI is summarizing',
    aiDone: 'AI summary ready',
    modeSwitchAria: 'Sort by',
    loading: 'Loading',
    rank: (n) => `Rank ${n}`,
    matchingSpots: (n) => `${n} matching spots`,
    feedbackCount: (n) => `${n} feedback`,
    savedCount: (n) => `Saved ${n}`,
    savedTitle: 'Number of times saved to trips',
    placeCount: (n) => `${n} spots`,
    firstDay: (route) => `Day 1: ${route}`,
  },
}

function getHeadlinePopular(language) {
  if (language !== 'ko') {
    return [
      { text: "Here's the" },
      { text: 'most popular', accent: true },
      { text: 'trip plans, feedback' },
      { text: '·', dot: true },
      { text: 'and records right now.' },
    ]
  }
  return [
    { text: '현재' },
    { text: '가장 인기있는', accent: true },
    { text: '여행 계획 및 피드백' },
    { text: '·', dot: true },
    { text: '기록을' },
    { text: '요약했어요' },
  ]
}

function getPersonalHeadline(name, language) {
  if (language !== 'ko') {
    return [
      { text: `Picked for ${name}:` },
      { text: 'trip plans', accent: true },
      { text: '·', dot: true },
      { text: 'and records that match your taste.' },
    ]
  }
  return [
    { text: `${name}님에게` },
    { text: '맞는', accent: true },
    { text: '여행 계획' },
    { text: '·', dot: true },
    { text: '기록을' },
    { text: '가져왔어요' },
  ]
}

function getModes(language) {
  if (language !== 'ko') {
    return [
      { key: 'personal', label: 'For You', icon: 'solar:magic-stick-3-bold' },
      { key: 'popular', label: 'Popular', icon: 'solar:fire-bold' },
    ]
  }
  return [
    { key: 'personal', label: '맞춤 추천', icon: 'solar:magic-stick-3-bold' },
    { key: 'popular', label: '인기', icon: 'solar:fire-bold' },
  ]
}


// 인기 모드: 피드 항목 → 카드. 계획은 첫날 동선을, 기록은 본문을 요약문으로 쓴다. to = 피드 페이지에서 해당 글 상세
function feedToCard(item, language, copy) {
  const meta = [item.user?.nickname, formatDate(item.createdAt, language)].filter(Boolean).join(' · ')
  if (item.type === 'plan') {
    const firstDay = item.days?.[0]?.places ?? []
    const route = firstDay.slice(0, 2).map((p) => p.name).join(' → ')
    return {
      id: item.id,
      kind: 'plan',
      title: item.title,
      desc: [`${item.duration} · ${copy.placeCount(item.placeCount)}`, route && copy.firstDay(route)].filter(Boolean).join(' · '),
      meta,
      imageUrl: firstDay.find((p) => p.imageUrl)?.imageUrl ?? null,
      feedbackCount: item.feedbackCount ?? 0,
      saveCount: item.saveCount,
      to: `/feed?open=${encodeURIComponent(item.id)}&filter=plan`,
    }
  }
  return {
    id: item.id,
    kind: 'record',
    title: item.title,
    desc: item.comment || '',
    meta,
    imageUrl: item.imageUrl ?? null,
    feedbackCount: item.feedbackCount ?? 0,
    saveCount: item.saveCount,
    to: `/feed?open=${encodeURIComponent(item.id)}&filter=record`,
  }
}

// 맞춤 모드: 추천 API 응답 → 카드. matchScore = 내 취향과 겹치는 방문지 수.
function recTripToCard(t, language, copy) {
  return {
    id: `rec-${t.tripId}`,
    kind: 'plan',
    title: t.title,
    desc: [formatDuration(t.startDate, t.endDate, language), copy.matchingSpots(t.matchScore)].filter(Boolean).join(' · '),
    meta: [t.ownerName, formatDate(t.createdAt, language)].filter(Boolean).join(' · '),
    imageUrl: t.thumbnailUrl ?? null,
    matchScore: t.matchScore ?? 0,
    to: `/feed?open=${encodeURIComponent(t.tripId)}&filter=plan`,
  }
}

function recRecordToCard(r, language) {
  return {
    id: `rec-${r.recordId}`,
    kind: 'record',
    title: r.tripTitle,
    desc: r.content || '',
    meta: [r.ownerName, formatDate(r.createdAt, language)].filter(Boolean).join(' · '),
    imageUrl: r.thumbnailUrl ?? null,
    matchScore: r.matchScore ?? 0,
    to: `/feed?open=${encodeURIComponent(`${r.tripId}-record`)}&filter=record`,
  }
}

const RANK_STYLE = [
  'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-[0_4px_10px_rgba(245,158,11,0.35)]',
  'bg-gradient-to-br from-slate-300 to-slate-400 text-white',
  'bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900',
]

// 순위 한 줄 — 1위는 금, 2위는 은, 3위는 동. 줄 전체가 링크라 어디를 눌러도 해당 글로 간다
function RankRow({ card, rank, index, personal, copy }) {
  const stat = personal
    ? { icon: 'solar:magic-stick-3-bold', label: copy.matchingSpots(card.matchScore), className: 'bg-violet-50 text-violet-600' }
    : { icon: 'solar:chat-round-dots-bold', label: copy.feedbackCount(card.feedbackCount), className: 'bg-rose-50 text-rose-500' }
  const inner = (
    <>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold tabular-nums transition-transform duration-300 group-hover:scale-110 ${RANK_STYLE[rank - 1]}`}
        aria-label={copy.rank(rank)}
      >
        {rank}
      </span>
      {card.imageUrl ? (
        <img src={card.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
          <Icon icon={card.kind === 'plan' ? 'solar:map-linear' : 'solar:camera-linear'} width={20} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-slate-900 transition-colors group-hover:text-brand">{card.title}</span>
        <span className="mt-0.5 block truncate text-[12px] text-slate-500">{card.desc}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
          <span className="min-w-0 truncate">{card.meta}</span>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 font-bold tabular-nums ${stat.className}`}>
            <Icon icon={stat.icon} width={10} /> {stat.label}
          </span>
          {typeof card.saveCount === 'number' && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 font-bold tabular-nums text-amber-600"
              title={copy.savedTitle}
            >
              <Icon icon="solar:bookmark-bold" width={10} /> {copy.savedCount(card.saveCount)}
            </span>
          )}
        </span>
      </span>
      <Icon
        icon="solar:alt-arrow-right-linear"
        width={16}
        className="shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-brand"
        aria-hidden="true"
      />
    </>
  )
  const className =
    'group animate-slide-in flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
  const style = { animationDelay: `${index * 90}ms` }
  return card.to ? (
    <Link to={card.to} className={className} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={className} style={style}>
      {inner}
    </div>
  )
}

// 순위 리스트 스켈레톤 — 위에서부터 한 줄씩 시차를 두고 반짝인다
function RankSkeleton({ loadingLabel }) {
  return (
    <div className="flex flex-col gap-1" role="status" aria-label={loadingLabel}>
      {Array.from({ length: TOP_N }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-7 w-7 rounded-full" style={{ animationDelay: `${i * 120}ms` }} />
          <Skeleton className="h-14 w-14 rounded-xl" style={{ animationDelay: `${i * 120 + 60}ms` }} />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-3/4" style={{ animationDelay: `${i * 120 + 90}ms` }} />
            <Skeleton className="mt-2 h-3 w-full" style={{ animationDelay: `${i * 120 + 120}ms` }} />
            <Skeleton className="mt-2 h-2.5 w-1/2" style={{ animationDelay: `${i * 120 + 150}ms` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupColumn({ group, cards, loading, personal, caption: captionOverride, copy }) {
  const caption = captionOverride ?? (personal ? group.personalCaption : group.popularCaption)
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-card">
      <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1.5">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${group.accentBg} ${group.accent}`}>
            <Icon icon={group.icon} width={18} />
          </span>
          <div>
            <h3 className="text-[15px] font-extrabold text-slate-900">{group.title}</h3>
            {loading ? (
              <Skeleton className="mt-1 h-2.5 w-28" />
            ) : (
              <p className="text-[11.5px] text-slate-400">TOP {TOP_N} · {caption}</p>
            )}
          </div>
        </div>
        <Link
          to={`/feed?filter=${group.filter}`}
          className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-500 transition-colors hover:border-brand hover:text-brand"
        >
          {copy.more}
        </Link>
      </div>

      {loading ? (
        <RankSkeleton loadingLabel={copy.loading} />
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <Icon icon={group.icon} width={22} />
          </span>
          <p className="mt-3 text-[13px] font-bold text-slate-600">{group.empty}</p>
        </div>
      ) : (
        <div key={personal ? 'personal' : 'popular'} className="flex flex-col gap-1">
          {cards.map((card, i) => (
            <RankRow key={card.id} card={card} rank={i + 1} index={i} personal={personal} copy={copy} />
          ))}
        </div>
      )}
    </div>
  )
}

// 배너 문구. 요약 중엔 흰 스켈레톤 두 줄이 반짝이고, 끝나면 어절이 차례로 떠오른 뒤 빛이 한 번 훑고 지나간다
// (getHeadlinePopular/getPersonalHeadline/getModes로 언어별로 뽑아 쓴다 — 위 T 딕셔너리 옆에서 정의)

function AiHeadline({ summarizing, words, copy }) {
  const full = words.map((w) => w.text).join(' ')
  if (summarizing) {
    return (
      <h2 className="min-w-0 flex-1">
        <span className="sr-only">{copy.summarizingAria(full)}</span>
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
function AiStatusBadge({ summarizing, copy }) {
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      role="status"
      aria-label={summarizing ? copy.aiSummarizing : copy.aiDone}
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

// 맞춤 / 인기 세그먼트 스위치 — 흰 썸이 선택 쪽으로 미끄러진다. 맞춤 추천이 잡힌 회원에게만 보인다.
function ModeSwitch({ mode, onChange, modes, copy }) {
  const index = modes.findIndex((m) => m.key === mode)
  return (
    <div role="tablist" aria-label={copy.modeSwitchAria} className="relative grid shrink-0 grid-cols-2 rounded-full bg-white/15 p-1 ring-1 ring-white/20">
      <span
        aria-hidden="true"
        className="mode-thumb absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-card"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {modes.map((m) => {
        const active = m.key === mode
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.key)}
            className={`relative z-10 flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors duration-300 ${
              active ? 'text-blue-700' : 'text-white/85 hover:text-white'
            }`}
          >
            <Icon icon={m.icon} width={13} className={active && m.key === 'popular' ? 'text-orange-500' : ''} />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

export default function AiSummaryFeed({ feed }) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const groups = getGroups(language)
  const modes = getModes(language)
  const [mode, setMode] = useState('popular')

  // 배지는 피드 로딩이 끝나도 최소 MIN_SPIN_MS 동안은 "요약 중"으로 두어 회전이 보이게 한다 — 첫 방문에만
  const [minSpinOver, setMinSpinOver] = useState(revealedOnce)
  useEffect(() => {
    if (revealedOnce) return undefined
    const id = setTimeout(() => {
      revealedOnce = true
      setMinSpinOver(true)
    }, MIN_SPIN_MS)
    return () => clearTimeout(id)
  }, [])

  // 로그인 사용자의 취향 추천 (계획 + 기록). 응답을 기다리는 동안도 "요약 중"으로 둔다. 재방문이면 캐시부터
  // /auth/me는 id가 아니라 userId를 내려주고 email은 비어 있을 수 있다
  const userKey = user ? (user.userId ?? user.id ?? user.email ?? user.name ?? 'me') : null
  const EMPTY_REC = { trips: [], records: [], hasPrefs: false, loading: false }
  const [rec, setRec] = useState(() => {
    const hit = userKey && recCache.get(userKey)
    return hit ? { ...hit, loading: false } : EMPTY_REC
  })
  useEffect(() => {
    if (!userKey) {
      setRec(EMPTY_REC)
      return undefined
    }
    let ignore = false
    const hit = recCache.get(userKey)
    if (hit) setRec({ ...hit, loading: false })
    else setRec((r) => ({ ...r, loading: true }))
    Promise.all([
      getRecommendedTrips(30).catch(() => []),
      getRecommendedRecords(30).catch(() => []),
      // 취향(온보딩) 등록 여부 — 404/401이면 미등록으로 본다
      getPreferences()
        .then((p) => Boolean(p && (p.interestTags?.length || p.preferredRegions?.length || p.travelStyle)))
        .catch(() => false),
    ]).then(([trips, records, hasPrefs]) => {
      if (ignore) return
      const next = { trips: Array.isArray(trips) ? trips : [], records: Array.isArray(records) ? records : [], hasPrefs }
      recCache.set(userKey, next)
      setRec({ ...next, loading: false })
    })
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey])

  // 취향을 등록한 회원이면 맞춤 모드를 연다. 매칭이 0건인 열은 인기 글로 채우고 그 사실을 캡션에 적는다
  const matches = rec.trips.length + rec.records.length
  const personalized = Boolean(user) && (matches > 0 || rec.hasPrefs)
  useEffect(() => {
    setMode(personalized ? 'personal' : 'popular')
  }, [personalized])
  const showPersonal = mode === 'personal' && personalized

  // 인기: 참견 많은 순으로 이미 정렬된 피드에서 종류별 상위 3개. 피드가 비면 GroupColumn이 자체 빈 상태를 보여준다.
  const popular = useMemo(() => {
    const cards = feed.items.map((item) => feedToCard(item, language, copy))
    return {
      plan: cards.filter((c) => c.kind === 'plan').slice(0, TOP_N),
      record: cards.filter((c) => c.kind === 'record').slice(0, TOP_N),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.items, language])

  // 맞춤: 취향 일치 점수 높은 순으로 상위 3개
  const personal = useMemo(
    () => ({
      plan: rec.trips.map((t) => recTripToCard(t, language, copy)).sort((a, b) => b.matchScore - a.matchScore).slice(0, TOP_N),
      record: rec.records.map((r) => recRecordToCard(r, language)).sort((a, b) => b.matchScore - a.matchScore).slice(0, TOP_N),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rec.trips, rec.records, language],
  )

  const summarizing = feed.loading || rec.loading || !minSpinOver
  const memberFallback = language !== 'ko' ? 'you' : '회원'
  const headline = showPersonal
    ? getPersonalHeadline(user?.name || memberFallback, language)
    : getHeadlinePopular(language)
  // 열마다: 맞춤 글이 있으면 그것, 없으면 인기 글로 채우고 캡션으로 알린다
  const columns = Object.fromEntries(
    ['plan', 'record'].map((key) => {
      const own = showPersonal && personal[key].length > 0
      return [
        key,
        {
          cards: own ? personal[key] : popular[key],
          personal: own,
          caption: showPersonal && !own ? groups[key].fallbackCaption : undefined,
        },
      ]
    }),
  )

  return (
    <section id="community" className="bg-white">
      <Section as="div" className="py-14 sm:py-16">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400">
          <span className="absolute left-5 top-0 bg-sky-400 text-white text-[10px] font-bold px-3 py-1.5 rounded-b-lg">{copy.highlights}</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pl-20 pr-5 sm:pr-6 py-5">
            <AiHeadline key={showPersonal ? 'personal' : 'popular'} summarizing={summarizing} words={headline} copy={copy} />
            <div className="ml-auto flex items-center gap-3">
              {personalized && !summarizing && <ModeSwitch mode={mode} onChange={setMode} modes={modes} copy={copy} />}
              <AiStatusBadge summarizing={summarizing} copy={copy} />
            </div>
          </div>
        </div>

        <div key={showPersonal ? 'personal' : 'popular'} className="mt-5 grid gap-4 md:grid-cols-2">
          {['plan', 'record'].map((key, i) => (
            <div key={key} className="min-w-0 animate-slide-in" style={{ animationDelay: `${i * 120}ms` }}>
              <GroupColumn
                group={groups[key]}
                cards={columns[key].cards}
                loading={summarizing}
                personal={columns[key].personal}
                caption={columns[key].caption}
                copy={copy}
              />
            </div>
          ))}
        </div>
      </Section>
    </section>
  )
}
