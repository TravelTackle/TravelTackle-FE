import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Card from './ui/Card'
import Chip from './ui/Chip'
import Skeleton from './ui/Skeleton'
import { getRecommendedSpots, getTourContents } from '../api/tour'
import { shortRegion } from '../lib/homeFormat'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 9 // 계획·기록 탭 카드 수
const SPOT_COUNT = PAGE_SIZE // 여행지 탭도 계획·기록 탭과 같은 9장 — 카드 크기·개수가 같아 탭을 오가도 섹션 높이가 같다

// "전체" 목록의 제목. 백엔드 default 섹션은 관광 API 결과를 무작위로 섞어 주는 것이라(인기 집계가 아님)
// 서버가 붙인 제목 대신 사실에 맞는 이 문구를 쓴다. 맞춤 추천(personal)만 서버 제목을 그대로 쓴다.
const DAILY_TITLE = '오늘의 추천 여행지'

const TABS = [
  { key: 'spot', label: '여행지 탐색', icon: 'solar:map-point-linear', moreTo: '/explore', moreLabel: '관광지 전체보기' },
  { key: 'plan', label: '계획', icon: 'solar:document-text-linear', moreTo: '/feed', moreLabel: '여행자 피드 전체보기' },
  { key: 'record', label: '기록', icon: 'solar:camera-linear', moreTo: '/feed', moreLabel: '여행자 피드 전체보기' },
]

// 관광지 탭은 TourAPI 지역/시군구 코드로 조회하고, 계획·기록 탭은 피드의 region 문자열로 거른다
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

// 캐시 키 → { items, title } — 탭·페이지를 오가도 같은 지역을 다시 부르지 않는다 (세션 유지)
const spotCache = new Map()

function regionKey(region) {
  return `${region.areaCode ?? ''}-${region.sigunguCode ?? ''}`
}

function RegionChip({ children }) {
  return (
    <Chip className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold bg-white/90 text-slate-700 shadow-card">
      {children}
    </Chip>
  )
}

// 여행지 카드 — 계획·기록 탭 카드와 같은 크기(이미지 150px + 제목·주소)라 탭을 오가도 줄 높이가 같다
function SpotCard({ spot }) {
  const region = spot.address ? shortRegion(spot.address) : ''
  return (
    <Card as={Link} to="/explore" shadow className="group block overflow-hidden">
      <div className="relative h-[150px] overflow-hidden bg-slate-100">
        {spot.imageUrl ? (
          <img src={spot.imageUrl} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" alt={spot.title} loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
        )}
        {region && <RegionChip>{region}</RegionChip>}
      </div>
      <div className="p-3">
        <div className="truncate text-[13px] font-bold text-slate-900 transition-colors group-hover:text-brand">{spot.title}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
          <Icon icon="solar:map-point-linear" width={11} className="shrink-0" />
          <span className="truncate">{spot.address || '주소 정보 없음'}</span>
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
          <div className="w-full h-[150px] bg-gradient-to-br from-blue-50 to-slate-200" />
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
        {item.imageUrl ? (
          <img src={item.imageUrl} className="w-full h-[150px] object-cover bg-slate-100 transition-transform duration-500 ease-out group-hover:scale-105" alt="" loading="lazy" />
        ) : (
          <div className="w-full h-[150px] bg-gradient-to-br from-emerald-50 to-slate-200" />
        )}
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
function SpotSkeletonGrid() {
  return (
    <div className="mt-5" role="status" aria-label="추천 여행지를 불러오는 중">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div>
          <Skeleton className="h-4 w-32" style={{ animationDelay: '60ms' }} />
          <Skeleton className="mt-1.5 h-3 w-44" style={{ animationDelay: '120ms' }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: SPOT_COUNT }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
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
function SpotCaption({ spots, user, region }) {
  const today = new Date()
  const personal = spots.personal
  const daily = !personal && !region.areaCode
  const tile = personal
    ? { className: 'bg-brand-light text-brand', body: <Icon icon="solar:magic-stick-3-bold" width={19} /> }
    : daily
      ? {
          className: 'bg-brand-light text-brand',
          body: (
            <>
              <span className="text-[9.5px] font-bold leading-none opacity-70">{today.getMonth() + 1}월</span>
              <span className="mt-0.5 text-[17px] font-extrabold leading-none tabular-nums">{today.getDate()}</span>
            </>
          ),
        }
      : { className: 'bg-slate-100 text-slate-600', body: <Icon icon="solar:map-point-bold" width={19} /> }
  const sub = personal
    ? `${user?.name || '회원'}님 취향에 맞춰 골랐어요`
    : daily
      ? `지금 둘러보기 좋은 여행지 ${SPOT_COUNT}곳`
      : `${region.label}에서 가볼 만한 곳`

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${tile.className}`}>
          {tile.body}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-extrabold leading-tight text-slate-900">{spots.title}</h3>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{sub}</p>
        </div>
      </div>
      {daily && user && (
        // 맞춤 추천 유도 — 위 "전체보기" 알약과 같은 문법·색(아이콘 원 + 문구, 올리면 브랜드색이 왼쪽에서 차오름)
        <Link
          to="/onboarding/preferences"
          className="group relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full bg-brand-light py-1.5 pl-1.5 pr-4 text-[12px] font-bold text-brand transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span aria-hidden="true" className="absolute inset-0 origin-left scale-x-0 bg-brand transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand transition-transform duration-300 group-hover:scale-110">
            <Icon icon="solar:magic-stick-3-bold" width={13} />
          </span>
          <span className="relative">취향 등록하고 맞춤 추천 받기</span>
        </Link>
      )}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4" role="status" aria-label="불러오는 중">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
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
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-300 shadow-card">
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

// 제목은 첫 로딩 뒤 어절이 차례로 떠오른다 (배너 문구와 같은 결)
const HEADING = [{ text: '좋은 여행은' }, { text: '좋은 참견에서', accent: true }, { text: '시작됩니다.' }]

// 로그인 사용자의 "전체" 탭은 선호도 기반 추천으로 채운다 — 맞춤 추천 섹션이 비면 default 섹션(무작위)으로.
// default 섹션의 서버 제목은 쓰지 않고 DAILY_TITLE로 바꿔 단다.
function pickRecommended(sections) {
  const bySection = Object.fromEntries((sections || []).map((s) => [s.sectionId, s]))
  const personal = bySection.personal?.items ?? []
  if (personal.length) return { items: personal, title: bySection.personal.title, personal: true }
  const fallback = bySection.default
  return fallback?.items?.length ? { items: fallback.items, title: DAILY_TITLE, personal: false } : null
}

export default function ExploreSection({ feed }) {
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('spot')
  const [region, setRegion] = useState(REGIONS[0])
  const [spots, setSpots] = useState({ items: [], loading: true, error: false, title: null })

  const activeTab = TABS.find((t) => t.key === tab)
  const personalized = Boolean(user) && !region.areaCode

  useEffect(() => {
    // 로그인 여부가 정해진 뒤에 한 번만 부른다 (비로그인 목록 → 추천 순으로 두 번 부르지 않게)
    if (tab !== 'spot' || authLoading) return undefined
    const key = personalized ? `personal:${user.userId ?? user.id ?? user.email ?? 'me'}` : regionKey(region)
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
        title: region.areaCode ? `${region.label} 여행지` : DAILY_TITLE,
        personal: false,
      }))

    // 추천 응답이 비거나 실패하면 일반 목록으로 조용히 내려간다
    const request = personalized
      ? getRecommendedSpots()
          .then((data) => pickRecommended(Array.isArray(data?.sections) ? data.sections : []))
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
  }, [tab, region, personalized, user, authLoading])

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
    if (loading) return tab === 'spot' ? <SpotSkeletonGrid /> : <SkeletonGrid />

    if (tab === 'spot') {
      if (spots.error) {
        return (
          <EmptyState
            icon="solar:cloud-cross-linear"
            title="관광지 정보를 불러오지 못했어요"
            desc="네트워크 상태를 확인하고 잠시 후 다시 시도해주세요."
            to="/explore"
            cta="여행지 탐색으로 가기"
          />
        )
      }
      if (spotItems.length === 0) {
        return (
          <EmptyState
            icon="solar:map-point-linear"
            title={`${region.label} 관광지를 아직 찾지 못했어요`}
            desc="다른 지역을 골라보거나 여행지 탐색에서 더 자세히 찾아보세요."
            to="/explore"
            cta="여행지 탐색으로 가기"
          />
        )
      }
      return (
        <div key={spots.personal ? 'personal' : regionKey(region)} className="animate-slide-in mt-5">
          <SpotCaption spots={spots} user={user} region={region} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {spotItems.map((s, i) => (
              <div key={s.contentId} className="animate-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
                <SpotCard spot={s} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (feedItems.length === 0) {
      const noun = tab === 'plan' ? '여행 계획' : '여행 기록'
      return (
        <EmptyState
          icon={activeTab.icon}
          title={region.label === '전체' ? `아직 올라온 ${noun}이 없어요` : `${region.label} ${noun}은 아직 없어요`}
          desc={tab === 'plan' ? '첫 번째로 계획을 공유하고 참견을 받아보세요.' : '다녀온 여행을 기록으로 남겨 다음 여행자에게 이어주세요.'}
          to={tab === 'plan' ? '/trips' : '/feed'}
          cta={tab === 'plan' ? '내 여행 계획 만들기' : '여행자 피드 보기'}
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
          <div role="status" aria-label="불러오는 중">
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
              {HEADING.map((w, i) => (
                <span
                  key={w.text}
                  className={`ai-word ${w.accent ? 'text-brand font-extrabold' : ''}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {w.text}
                </span>
              ))}
            </h2>
            <p className="ai-word mt-1.5 text-[13px] text-slate-500" style={{ animationDelay: `${HEADING.length * 90}ms` }}>
              여행자들이 지금 보고 있는 관광지, 계획, 기록을 한곳에서 둘러보세요.
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
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand transition-transform duration-300 group-hover:scale-110">
            <Icon icon={activeTab.icon} width={13} />
          </span>
          <span className="relative">{activeTab.label} 전체보기</span>
        </Link>
      </div>

      {/* 콘텐츠 종류 탭 — 흰 알약이 선택 쪽으로 미끄러진다 */}
      <div className="relative mt-6 grid grid-cols-3 rounded-full bg-slate-100 p-1" role="tablist" aria-label="탐색 콘텐츠 종류">
        <span
          aria-hidden="true"
          className="mode-thumb pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-white shadow-card"
          style={{ transform: `translateX(${TABS.findIndex((t) => t.key === tab) * 100}%)` }}
        />
        {TABS.map((t) => {
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
        aria-label="지역 선택"
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
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {r.label}
            </button>
          )
        })}
      </div>

      {renderBody()}
    </Section>
  )
}
