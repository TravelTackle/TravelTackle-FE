import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Card from './ui/Card'
import Chip from './ui/Chip'
import Skeleton from './ui/Skeleton'
import CardImage, { ImagePlaceholder } from './ui/CardImage'
import { getRecommendedSpots, getTourContents } from '../api/tour'
import { shortRegion } from '../lib/homeFormat'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n'

const PAGE_SIZE = 9 // 계획·기록 탭 카드 수
const SPOT_COUNT = PAGE_SIZE // 여행지 탭도 계획·기록 탭과 같은 9장 — 카드 크기·개수가 같아 탭을 오가도 섹션 높이가 같다

function getDailyTitle(language) {
  // "전체" 목록의 제목. 백엔드 default 섹션은 관광 API 결과를 무작위로 섞어 주는 것이라(인기 집계가 아님)
  // 서버가 붙인 제목 대신 사실에 맞는 이 문구를 쓴다. 맞춤 추천(personal)만 서버 제목을 그대로 쓴다.
  return language !== 'ko' ? "Today's Recommended Spots" : '오늘의 추천 여행지'
}

function getTabs(language) {
  if (language !== 'ko') {
    return [
      { key: 'spot', label: 'Explore', icon: 'solar:map-point-linear', moreTo: '/explore', moreLabel: 'See all destinations' },
      { key: 'plan', label: 'Plans', icon: 'solar:document-text-linear', moreTo: '/feed', moreLabel: 'See all in traveler feed' },
      { key: 'record', label: 'Records', icon: 'solar:camera-linear', moreTo: '/feed', moreLabel: 'See all in traveler feed' },
    ]
  }
  return [
    { key: 'spot', label: '여행지 탐색', icon: 'solar:map-point-linear', moreTo: '/explore', moreLabel: '관광지 전체보기' },
    { key: 'plan', label: '계획', icon: 'solar:document-text-linear', moreTo: '/feed', moreLabel: '여행자 피드 전체보기' },
    { key: 'record', label: '기록', icon: 'solar:camera-linear', moreTo: '/feed', moreLabel: '여행자 피드 전체보기' },
  ]
}

// 관광지 탭은 TourAPI 지역/시군구 코드로 조회하고, 계획·기록 탭은 피드의 region 문자열로 거른다.
// label은 항상 한국어 원본 값 — 피드 아이템의 region 문자열(한국어)과 매칭·캐시 키로 쓰이므로 절대
// 언어별로 바꾸면 안 된다(바꾸면 영어 모드에서 지역 필터가 결과 0건으로 깨진다). 화면에 보여줄 때만
// regionDisplay()로 번역해서 쓴다.
const REGIONS = [
  { label: '전체' },
  { label: '서울', areaCode: '1' },
  { label: '부산', areaCode: '6' },
  { label: '인천', areaCode: '2' },
  { label: '제주', areaCode: '39' },
  { label: '대구', areaCode: '4' },
  { label: '경주', areaCode: '35', sigunguCode: '2' },
  { label: '전주', areaCode: '37', sigunguCode: '12' },
  { label: '강릉', areaCode: '32', sigunguCode: '1' },
  { label: '여수', areaCode: '38', sigunguCode: '13' },
  { label: '속초', areaCode: '32', sigunguCode: '5' },
]

const REGION_LABEL_EN = {
  전체: 'All',
  서울: 'Seoul',
  부산: 'Busan',
  인천: 'Incheon',
  제주: 'Jeju',
  대구: 'Daegu',
  경주: 'Gyeongju',
  전주: 'Jeonju',
  강릉: 'Gangneung',
  여수: 'Yeosu',
  속초: 'Sokcho',
}

function regionDisplay(label, language) {
  return language !== 'ko' ? (REGION_LABEL_EN[label] ?? label) : label
}

// ExploreSection 전체 문구 — 언어별 맵(§다른 언어 추가 시 확장성)
const T = {
  ko: {
    noAddress: '주소 정보 없음',
    loadingSpots: '추천 여행지를 불러오는 중',
    loading: '불러오는 중',
    contentTypeAria: '탐색 콘텐츠 종류',
    regionAria: '지역 선택',
    seeAllOf: (label) => `${label} 전체보기`,
    heading: [{ text: '좋은 여행은' }, { text: '좋은 참견에서', accent: true }, { text: '시작됩니다.' }],
    subtitle: '여행자들이 지금 보고 있는 관광지, 계획, 기록을 한곳에서 둘러보세요.',
    registerPrefs: '취향 등록하고 맞춤 추천 받기',
    personalSub: (name) => `${name}님 취향에 맞춰 골랐어요`,
    dailySub: (n) => `지금 둘러보기 좋은 여행지 ${n}곳`,
    regionSub: (label) => `${label}에서 가볼 만한 곳`,
    dailyWords: [{ text: '오늘의', accent: true }, { text: '추천 여행지' }],
    regionWords: (label) => [{ text: label, accent: true }, { text: '여행지' }],
    spotLoadError: '관광지 정보를 불러오지 못했어요',
    spotLoadErrorDesc: '네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.',
    goExplore: '여행지 탐색으로 가기',
    spotEmpty: (label) => `${label} 관광지를 아직 찾지 못했어요`,
    spotEmptyDesc: '다른 지역을 골라보거나 여행지 탐색에서 더 자세히 찾아보세요.',
    planNoun: '여행 계획',
    recordNoun: '여행 기록',
    feedEmptyAll: (noun) => `아직 올라온 ${noun}이 없어요`,
    feedEmptyRegion: (label, noun) => `${label} ${noun}은 아직 없어요`,
    planEmptyDesc: '첫 번째로 계획을 공유하고 참견을 받아보세요.',
    recordEmptyDesc: '다녀온 여행을 기록으로 남겨 다음 여행자에게 이어주세요.',
    createTrip: '내 여행 계획 만들기',
    goFeed: '여행자 피드 보기',
  },
  en: {
    noAddress: 'No address available',
    loadingSpots: 'Loading recommended spots',
    loading: 'Loading',
    contentTypeAria: 'Explore content type',
    regionAria: 'Select region',
    seeAllOf: () => 'See all',
    heading: [{ text: 'A good trip' }, { text: 'starts with good feedback.', accent: true }],
    subtitle: 'Browse the destinations, plans, and records travelers are looking at right now, all in one place.',
    registerPrefs: 'Set your preferences for personalized picks',
    personalSub: (name) => `Picked to match ${name}'s taste`,
    dailySub: (n) => `${n} great spots to explore right now`,
    regionSub: (label) => `Worth visiting in ${label}`,
    dailyWords: [{ text: "Today's", accent: true }, { text: 'Recommended Spots' }],
    regionWords: (label) => [{ text: label, accent: true }, { text: 'Destinations' }],
    spotLoadError: 'Could not load destination info',
    spotLoadErrorDesc: 'Check your network connection and try again shortly.',
    goExplore: 'Go to Explore',
    spotEmpty: (label) => `No destinations found in ${label} yet`,
    spotEmptyDesc: 'Try another region, or look in more detail on the Explore page.',
    planNoun: 'trip plans',
    recordNoun: 'trip records',
    feedEmptyAll: (noun) => `No ${noun} yet`,
    feedEmptyRegion: (label, noun) => `No ${noun} in ${label} yet`,
    planEmptyDesc: 'Be the first to share a plan and get feedback.',
    recordEmptyDesc: 'Leave a record of your trip for the next traveler.',
    createTrip: 'Create my trip plan',
    goFeed: 'View traveler feed',
  },
}

// 캐시 키 → { items, title } — 탭·페이지를 오가도 같은 지역을 다시 부르지 않는다 (세션 유지)
const spotCache = new Map()

function regionKey(region) {
  return `${region.areaCode ?? ''}-${region.sigunguCode ?? ''}`
}

function RegionChip({ children }) {
  return (
    <Chip className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold bg-white/90 text-ink shadow-card">
      {children}
    </Chip>
  )
}

// 여행지 카드 — 계획·기록 탭 카드와 같은 크기(이미지 150px + 제목·주소)라 탭을 오가도 줄 높이가 같다
function SpotCard({ spot, copy }) {
  const region = spot.address ? shortRegion(spot.address) : ''
  return (
    <Card as={Link} to={`/explore?open=${encodeURIComponent(spot.contentId)}`} shadow className="group block overflow-hidden">
      <div className="relative h-[150px] overflow-hidden bg-slate-100">
        <CardImage src={spot.imageUrl} alt={spot.title} className="absolute inset-0 h-full w-full" imgClassName="transition-transform duration-500 ease-out group-hover:scale-105" />
        {region && <RegionChip>{region}</RegionChip>}
      </div>
      <div className="p-3">
        <div className="truncate text-[13px] font-bold text-slate-900 transition-colors group-hover:text-brand">{spot.title}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
          <Icon icon="solar:map-point-linear" width={11} className="shrink-0" />
          <span className="truncate">{spot.address || copy.noAddress}</span>
        </div>
      </div>
    </Card>
  )
}

function PlanCard({ item }) {
  const photos = (item.days?.[0]?.places ?? []).filter((p) => p.imageUrl).slice(0, 3)
  return (
    <Card as={Link} to={`/feed?open=${encodeURIComponent(item.id)}&filter=plan`} className="group block overflow-hidden">
      <div className="relative overflow-hidden">
        {photos.length ? (
          <div className="grid h-[150px] gap-0.5" style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}>
            {photos.map((p, i) => (
              <img key={i} src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover bg-slate-100 transition-transform duration-500 ease-out group-hover:scale-105" />
            ))}
          </div>
        ) : (
          <div className="h-[150px] w-full">
            <ImagePlaceholder />
          </div>
        )}
        {item.region && <RegionChip>{item.region}</RegionChip>}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-slate-900 truncate transition-colors group-hover:text-brand">{item.title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
          {item.user.nickname} · {item.duration} · 장소 {item.placeCount}곳
          {typeof item.saveCount === 'number' && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-amber-600">
              <Icon icon="solar:bookmark-bold" width={10} /> {item.saveCount}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function RecordCard({ item }) {
  return (
    <Card as={Link} to={`/feed?open=${encodeURIComponent(item.id)}&filter=record`} className="group block overflow-hidden">
      <div className="relative overflow-hidden">
        <CardImage src={item.imageUrl} className="h-[150px] w-full" imgClassName="bg-slate-100 transition-transform duration-500 ease-out group-hover:scale-105" />
        {item.region && <RegionChip>{item.region}</RegionChip>}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-slate-900 truncate transition-colors group-hover:text-brand">{item.title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
          {item.comment || item.user.nickname}
          {typeof item.saveCount === 'number' && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-amber-600">
              <Icon icon="solar:bookmark-bold" width={10} /> {item.saveCount}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

// 여행지 탭 스켈레톤 — 캡션(타일+두 줄)과 카드 9장 자리를 실제 그리드와 똑같이 잡아 로딩이 끝나도 레이아웃이 튀지 않는다
function SpotSkeletonGrid({ copy }) {
  return (
    <div className="mt-5" role="status" aria-label={copy.loadingSpots}>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-12" style={{ animationDelay: '60ms' }} />
            <Skeleton className="h-4 w-20" style={{ animationDelay: '120ms' }} />
          </div>
          <Skeleton className="mt-1.5 h-3 w-44" style={{ animationDelay: '180ms' }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: SPOT_COUNT }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-surface">
            <div className="relative h-[150px]">
              <Skeleton className="absolute inset-0 rounded-none" style={{ animationDelay: `${i * 90}ms` }} />
              <Skeleton className="absolute left-2 top-2 h-5 w-10 rounded-full" style={{ animationDelay: `${i * 90 + 40}ms` }} />
            </div>
            <div className="p-3">
              <Skeleton className="h-4 w-2/3" style={{ animationDelay: `${i * 90 + 80}ms` }} />
              <Skeleton className="mt-2 h-3 w-1/2" style={{ animationDelay: `${i * 90 + 120}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 목록 위 캡션 — 왼쪽 타일이 목록의 기준을 말한다. 오늘의 추천은 달력 타일(월·일), 맞춤 추천은 마법봉,
// 지역을 골랐을 땐 지도 핀. 제목 아래 한 줄로 무엇을 골랐는지 풀어 쓴다.
function SpotCaption({ spots, user, region, language, copy }) {
  const today = new Date()
  const monthLabel =
    language !== 'ko'
      ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(today)
      : `${today.getMonth() + 1}월`
  const personal = spots.personal
  const daily = !personal && !region.areaCode
  const displayRegion = regionDisplay(region.label, language)
  const tile = personal
    ? { className: 'bg-brand-light text-brand', body: <Icon icon="solar:magic-stick-3-bold" width={19} /> }
    : daily
      ? {
          className: 'bg-brand-light text-brand',
          body: (
            <>
              <span className="text-[9.5px] font-bold leading-none opacity-70">{monthLabel}</span>
              <span className="mt-0.5 text-[17px] font-extrabold leading-none tabular-nums">{today.getDate()}</span>
            </>
          ),
        }
      : { className: 'bg-slate-100 text-slate-600', body: <Icon icon="solar:map-point-bold" width={19} /> }
  const sub = personal
    ? copy.personalSub(user?.name || (language !== 'ko' ? 'you' : '회원'))
    : daily
      ? copy.dailySub(SPOT_COUNT)
      : copy.regionSub(displayRegion)
  // 제목은 앞 어절만 브랜드색으로 — 섹션 제목("좋은 참견에서")과 같은 강조 방식
  const words = personal
    ? [{ text: spots.title, accent: true }]
    : daily
      ? copy.dailyWords
      : copy.regionWords(displayRegion)

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${tile.className}`}>
          {tile.body}
        </span>
        <div className="min-w-0">
          {/* ai-word는 inline-block이라 어절 사이 공백이 사라진다 — 간격은 gap으로 */}
          <h3 className="flex flex-wrap items-baseline gap-x-[0.3em] text-[15px] font-extrabold leading-tight text-slate-700">
            {words.map((w, i) => (
              <span key={w.text} className={`ai-word ${w.accent ? 'text-brand' : ''}`} style={{ animationDelay: `${i * 90}ms` }}>
                {w.text}
              </span>
            ))}
          </h3>
          <p className="ai-word mt-0.5 truncate text-[12px] text-slate-500" style={{ animationDelay: `${words.length * 90}ms` }}>{sub}</p>
        </div>
      </div>
      {daily && user && (
        // 맞춤 추천 유도 — 위 "전체보기" 알약과 같은 문법·색(아이콘 원 + 문구, 올리면 브랜드색이 왼쪽에서 차오름)
        <Link
          to="/onboarding/preferences"
          className="group relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full bg-brand-light py-1.5 pl-1.5 pr-4 text-[12px] font-bold text-brand transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span aria-hidden="true" className="absolute inset-0 origin-left scale-x-0 bg-brand transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-surface text-brand transition-transform duration-300 group-hover:scale-110">
            <Icon icon="solar:magic-stick-3-bold" width={13} />
          </span>
          <span className="relative">{copy.registerPrefs}</span>
        </Link>
      )}
    </div>
  )
}

function SkeletonGrid({ loadingLabel }) {
  return (
    <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4" role="status" aria-label={loadingLabel}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 bg-surface">
          <div className="relative">
            <Skeleton className="h-[150px] w-full rounded-none" style={{ animationDelay: `${i * 110}ms` }} />
            <Skeleton className="absolute left-2 top-2 h-5 w-10 rounded-full" style={{ animationDelay: `${i * 110 + 40}ms` }} />
          </div>
          <div className="p-3">
            <Skeleton className="h-3.5 w-2/3" style={{ animationDelay: `${i * 110 + 80}ms` }} />
            <Skeleton className="mt-2 h-2.5 w-1/2" style={{ animationDelay: `${i * 110 + 120}ms` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon, title, desc, to, cta }) {
  return (
    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-slate-300 shadow-card">
        <Icon icon={icon} width={22} />
      </span>
      <p className="mt-3 text-[13.5px] font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-[12px] text-slate-400">{desc}</p>
      {to && (
        <Link to={to} className="mt-4 rounded-full bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-dark">
          {cta}
        </Link>
      )}
    </div>
  )
}

// 로그인 사용자의 "전체" 탭은 선호도 기반 추천으로 채운다 — 맞춤 추천 섹션이 비면 default 섹션(무작위)으로.
// default 섹션의 서버 제목은 쓰지 않고 getDailyTitle로 바꿔 단다.
function pickRecommended(sections, language) {
  const bySection = Object.fromEntries((sections || []).map((s) => [s.sectionId, s]))
  const personal = bySection.personal?.items ?? []
  if (personal.length) return { items: personal, title: bySection.personal.title, personal: true }
  const fallback = bySection.default
  return fallback?.items?.length ? { items: fallback.items, title: getDailyTitle(language), personal: false } : null
}

export default function ExploreSection({ feed }) {
  const { user, loading: authLoading } = useAuth()
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const tabs = getTabs(language)
  const [tab, setTab] = useState('spot')
  const [region, setRegion] = useState(REGIONS[0])
  const [spots, setSpots] = useState({ items: [], loading: true, error: false, title: null })

  const activeTab = tabs.find((t) => t.key === tab)
  const personalized = Boolean(user) && !region.areaCode

  useEffect(() => {
    // 로그인 여부가 정해진 뒤에 한 번만 부른다 (비로그인 목록 → 추천 순으로 두 번 부르지 않게)
    if (tab !== 'spot' || authLoading) return undefined
    const key = `${language}:${personalized ? `personal:${user.userId ?? user.id ?? user.email ?? 'me'}` : regionKey(region)}`
    if (spotCache.has(key)) {
      setSpots({ ...spotCache.get(key), loading: false, error: false })
      return undefined
    }
    let ignore = false
    setSpots((s) => ({ ...s, loading: true, error: false }))

    const fetchList = () =>
      getTourContents({
        contentTypeId: '12',
        areaCode: region.areaCode,
        sigunguCode: region.sigunguCode,
        arrange: 'O', // 제목순 + 대표이미지 있는 콘텐츠만
        size: SPOT_COUNT,
        page: 1,
      }).then((data) => ({
        items: Array.isArray(data?.items) ? data.items : [],
        title: region.areaCode ? copy.regionWords(regionDisplay(region.label, language)).map((w) => w.text).join(' ') : getDailyTitle(language),
        personal: false,
      }))

    // 추천 응답이 비거나 실패하면 일반 목록으로 조용히 내려간다
    const request = personalized
      ? getRecommendedSpots()
          .then((data) => pickRecommended(Array.isArray(data?.sections) ? data.sections : [], language))
          .then((picked) => (picked ? { items: picked.items.slice(0, SPOT_COUNT), title: picked.title, personal: picked.personal } : fetchList()))
          .catch(fetchList)
      : fetchList()

    request
      .then((result) => {
        if (ignore) return
        spotCache.set(key, result)
        setSpots({ ...result, loading: false, error: false })
      })
      .catch(() => {
        if (!ignore) setSpots({ items: [], loading: false, error: true, title: null })
      })
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, region, personalized, user, authLoading, language])

  const feedItems = useMemo(() => {
    if (tab === 'spot') return []
    return feed.items
      .filter((i) => i.type === tab && (region.label === '전체' || (i.region || '').includes(region.label)))
      .slice(0, PAGE_SIZE)
  }, [feed.items, tab, region])

  const spotItems = spots.items.slice(0, SPOT_COUNT)
  const loading = tab === 'spot' ? spots.loading : feed.loading

  // 제목 스켈레톤은 섹션이 처음 열릴 때 한 번만 — 탭·지역을 바꿀 땐 카드만 다시 로딩된다
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    if (!loading) setRevealed(true)
  }, [loading])

  function renderBody() {
    if (loading) return tab === 'spot' ? <SpotSkeletonGrid copy={copy} /> : <SkeletonGrid loadingLabel={copy.loading} />

    const displayRegion = regionDisplay(region.label, language)

    if (tab === 'spot') {
      if (spots.error) {
        return (
          <EmptyState
            icon="solar:cloud-cross-linear"
            title={copy.spotLoadError}
            desc={copy.spotLoadErrorDesc}
            to="/explore"
            cta={copy.goExplore}
          />
        )
      }
      if (spotItems.length === 0) {
        return (
          <EmptyState
            icon="solar:map-point-linear"
            title={copy.spotEmpty(displayRegion)}
            desc={copy.spotEmptyDesc}
            to="/explore"
            cta={copy.goExplore}
          />
        )
      }
      return (
        <div key={spots.personal ? 'personal' : regionKey(region)} className="animate-slide-in mt-5">
          <SpotCaption spots={spots} user={user} region={region} language={language} copy={copy} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {spotItems.map((s, i) => (
              <div key={s.contentId} className="animate-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
                <SpotCard spot={s} copy={copy} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (feedItems.length === 0) {
      const noun = tab === 'plan' ? copy.planNoun : copy.recordNoun
      return (
        <EmptyState
          icon={activeTab.icon}
          title={region.label === '전체' ? copy.feedEmptyAll(noun) : copy.feedEmptyRegion(displayRegion, noun)}
          desc={tab === 'plan' ? copy.planEmptyDesc : copy.recordEmptyDesc}
          to={tab === 'plan' ? '/trips' : '/feed'}
          cta={tab === 'plan' ? copy.createTrip : copy.goFeed}
        />
      )
    }
    return (
      <div key={`${tab}-${region.label}`} className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        {feedItems.map((item, i) => (
          <div key={item.id} className="animate-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
            {tab === 'plan' ? <PlanCard item={item} /> : <RecordCard item={item} />}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Section as="section" id="explore" className="py-14 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {loading && !revealed ? (
          // 첫 로딩 — 제목·보조 문구 자리를 스켈레톤으로 잡아 둔다
          <div role="status" aria-label={copy.loading}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-24 rounded-full" style={{ animationDelay: '80ms' }} />
              <Skeleton className="h-6 w-24" style={{ animationDelay: '160ms' }} />
            </div>
            <Skeleton className="mt-2.5 h-3.5 w-72 max-w-full" style={{ animationDelay: '240ms' }} />
          </div>
        ) : (
          <div>
            {/* ai-word가 inline-block이라 span 안의 공백이 사라진다 — 어절 사이 간격은 gap으로 */}
            <h2 className="flex flex-wrap items-baseline gap-x-[0.28em] text-[22px] font-bold text-slate-900">
              {copy.heading.map((w, i) => (
                <span
                  key={w.text}
                  className={`ai-word ${w.accent ? 'text-brand font-extrabold' : ''}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {w.text}
                </span>
              ))}
            </h2>
            <p className="ai-word mt-1.5 text-[13px] text-slate-500" style={{ animationDelay: `${copy.heading.length * 90}ms` }}>
              {copy.subtitle}
            </p>
          </div>
        )}
        {/* 전체보기 — 현재 탭 아이콘을 앞에 둔 연한 브랜드색 알약, 올리면 진한 색으로 차오른다 */}
        <Link
          to={activeTab.moreTo}
          aria-label={activeTab.moreLabel}
          className="group relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full bg-brand-light py-2 pl-2 pr-4 text-[12.5px] font-bold text-brand transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span aria-hidden="true" className="absolute inset-0 origin-left scale-x-0 bg-brand transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-surface text-brand transition-transform duration-300 group-hover:scale-110">
            <Icon icon={activeTab.icon} width={13} />
          </span>
          <span className="relative">{copy.seeAllOf(activeTab.label)}</span>
        </Link>
      </div>

      {/* 콘텐츠 종류 탭 — 흰 알약이 선택 쪽으로 미끄러진다 */}
      <div className="relative mt-6 grid grid-cols-3 rounded-full bg-slate-100 p-1" role="tablist" aria-label={copy.contentTypeAria}>
        <span
          aria-hidden="true"
          className="mode-thumb pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-surface shadow-card"
          style={{ transform: `translateX(${tabs.findIndex((t) => t.key === tab) * 100}%)` }}
        />
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold transition-colors duration-300 ${
                active ? 'text-brand' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon icon={t.icon} width={16} />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* 지역 칩 — 좁은 화면에선 옆으로 밀고, 오른쪽 끝은 살짝 흐려 더 있음을 알린다 */}
      <div
        className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)] md:[mask-image:none]"
        role="group"
        aria-label={copy.regionAria}
      >
        {REGIONS.map((r) => {
          const active = region.label === r.label
          return (
            <button
              key={r.label}
              type="button"
              onClick={() => setRegion(r)}
              aria-pressed={active}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-all duration-200 ${
                active
                  ? 'border-brand bg-brand text-white shadow-[0_4px_12px_rgba(37,99,235,0.28)]'
                  : 'border-slate-200 bg-surface text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {regionDisplay(r.label, language)}
            </button>
          )
        })}
      </div>

      {renderBody()}
    </Section>
  )
}
