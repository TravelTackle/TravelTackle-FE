import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Button from '../components/ui/Button'
import FeedFilterBar from '../components/travelerFeed/FeedFilterBar'
import RegionRankPanel, { useMonthlyRegions } from '../components/travelerFeed/RegionRankPanel'
import Skeleton from '../components/ui/Skeleton'
import PopularPlansTop5 from '../components/travelerFeed/PopularPlansTop5'
import PlanFeedCard from '../components/travelerFeed/PlanFeedCard'
import RecordFeedCard from '../components/travelerFeed/RecordFeedCard'
import FeedDetailDrawer from '../components/travelerFeed/FeedDetailDrawer'
import RecordUploadModal from '../components/travelerFeed/RecordUploadModal'
import FeedbackDrawer from '../components/travelerFeed/FeedbackDrawer'
import { FeedActionsProvider, targetTripId } from '../components/travelerFeed/FeedActionsContext'
import { useAuth } from '../context/AuthContext'
import { getSavedTrips, saveTrip, unsaveTrip } from '../api/trip'
import { getFeed, getFeedDetail } from '../api/feed'
import { adaptFeedItem, adaptPlanDetail, adaptRecordDetail } from '../data/feedAdapter'
import { interleaveByKey } from '../lib/shuffle'

const SORT_OPTIONS = [
  { value: 'relevance', label: '관련도순' },
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
]

export default function TravelerFeedPage() {
  const { user } = useAuth()
  const [realItems, setRealItems] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [sortOption, setSortOption] = useState('relevance')

  // 목록 조회(아래 useEffect)가 참조하므로 검색·정렬과 같은 위치에서 먼저 선언한다.
  // 종류·지역은 서버로 넘기는 필터라 값이 바뀌면 첫 페이지부터 다시 받는다 — '전체'면 파라미터를 뺀다.
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilter = ['plan', 'record'].includes(searchParams.get('filter')) ? searchParams.get('filter') : 'all'
  const [filter, setFilter] = useState(initialFilter)
  const [region, setRegion] = useState(null)
  const feedFilterParams = useMemo(
    () => ({ type: filter === 'all' ? undefined : filter.toUpperCase(), region: region || undefined }),
    [filter, region],
  )
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setSortMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // sort는 사용자가 고른 값을 그대로 보내고, relevance인데 keyword가 없으면 서버가 알아서 latest로 대체해준다.
  // reloadKey: 기록 업로드 뒤 같은 조건으로 목록을 다시 불러오기 위한 트리거
  // 무한 스크롤 — page 0부터 시작해서 검색어/정렬이 바뀌면 처음부터 다시 받는다. size는 서버 최대치(50)를 그대로 유지.
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  // 끝까지 다 봤다는 안내 — 실제로 다음 페이지를 받아 last:true가 됐을 때뿐 아니라, 콘텐츠가 적어
  // 첫 페이지부터 이미 마지막이라 sentinel이 곧장 보이는 경우에도 로딩 스피너 없이 문구만 툭 뜨면
  // 어색해서, 그 경우엔 잠깐 스피너를 보여준 뒤 문구로 넘어간다.
  const [endChecking, setEndChecking] = useState(false)
  const [endReached, setEndReached] = useState(false)
  const endCheckTimer = useRef(null)
  const endCheckStarted = useRef(false)

  useEffect(() => {
    let ignore = false
    setFeedLoading(true)
    setPage(0)
    setEndChecking(false)
    setEndReached(false)
    endCheckStarted.current = false
    clearTimeout(endCheckTimer.current)
    getFeed({ page: 0, size: 50, keyword: searchKeyword || undefined, sort: sortOption, ...feedFilterParams })
      .then((res) => {
        if (ignore) return
        setRealItems(res.content.map(adaptFeedItem))
        setHasMore(!res.last)
      })
      .catch(() => {
        if (ignore) return
        setRealItems([])
        setHasMore(false)
      })
      .finally(() => { if (!ignore) setFeedLoading(false) })
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword, sortOption, reloadKey, filter, region])

  useEffect(() => () => clearTimeout(endCheckTimer.current), [])

  // 목록 끝(sentinel)이 보이면 다음 페이지를 이어붙인다 — 첫 로딩/이미 불러오는 중/더 없음일 땐 무시.
  const loadMore = useCallback(() => {
    if (feedLoading || loadingMore || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    getFeed({ page: nextPage, size: 50, keyword: searchKeyword || undefined, sort: sortOption, ...feedFilterParams })
      .then((res) => {
        setRealItems((prev) => [...prev, ...res.content.map(adaptFeedItem)])
        setPage(nextPage)
        setHasMore(!res.last)
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedLoading, loadingMore, hasMore, page, searchKeyword, sortOption, filter, region])

  const sentinelRef = useRef(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (hasMore) {
          loadMore()
          return
        }
        // 더 받을 페이지가 없는데 sentinel이 바로 보인 경우 — 한 번만 짧게 스피너를 보여주고 문구로 전환
        if (endCheckStarted.current) return
        endCheckStarted.current = true
        setEndChecking(true)
        endCheckTimer.current = setTimeout(() => {
          setEndChecking(false)
          setEndReached(true)
        }, 500)
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, hasMore])

  // 실제로 다음 페이지까지 받아서 끝난 경우(loadMore 이후 hasMore가 false로 바뀐 경우)엔
  // 이미 로딩 스피너를 보여준 뒤라 별도 지연 없이 바로 문구를 보여준다. endCheckStarted를 같이 세워둬야
  // sentinel이 여전히 화면에 남아있을 때 관찰자가 다시 반응해 스피너를 한 번 더 깜빡이지 않는다.
  useEffect(() => {
    if (!hasMore && page > 0 && !loadingMore) {
      endCheckStarted.current = true
      setEndReached(true)
    }
  }, [hasMore, page, loadingMore])

  // 입력을 멈춘 뒤에만 검색
  useEffect(() => {
    const timer = setTimeout(() => setSearchKeyword(searchInput.trim()), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // 홈 모아보기 등에서 ?open=<id>&filter=plan|record 로 들어오면 해당 글 상세를 바로 연다
  const openId = searchParams.get('open')
  // 좋아요 알림에서 오면 ?feedback=<feedbackId>(또는 'open')가 붙는다 — 상세와 함께 참견 드로어를 열고 그 참견을 강조한다
  const feedbackParam = searchParams.get('feedback')
  const [pendingFeedback, setPendingFeedback] = useState(null) // { item, focusId }
  const [view, setView] = useState('list')
  const [drawerItem, setDrawerItem] = useState(null)
  // 홈 등에서 ?open=으로 들어온 아이템 — 목록 맨 위에 고정해서 보여준다
  const [pinnedItem, setPinnedItem] = useState(null)

  // openId가 지금 로드된 페이지(최대 50개, 현재 검색·정렬 조건)에 없을 수 있다 — 오래됐거나
  // 다른 정렬 조건 밖의 글이면 못 찾으므로, 그럴 땐 상세를 직접 조회해서 연다.
  useEffect(() => {
    if (!openId) return
    const clearOpenParam = () => setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('open')
      next.delete('feedback')
      return next
    }, { replace: true })
    const focus = feedbackParam ? { focusId: feedbackParam === 'open' ? null : feedbackParam } : null

    const target = realItems.find((i) => i.id === openId)
    if (target) {
      setDrawerItem(target)
      setPinnedItem(target)
      if (focus) setPendingFeedback({ item: target, ...focus })
      clearOpenParam()
      return
    }
    if (feedLoading) return // 첫 페이지가 아직 로딩 중이면 그 결과에서 먼저 찾아본다

    let ignore = false
    const isRecord = openId.endsWith('-record')
    const tripId = isRecord ? openId.slice(0, -'-record'.length) : openId
    getFeedDetail(tripId)
      .then((detail) => {
        if (ignore) return
        const resolved = isRecord ? adaptRecordDetail(detail) : adaptPlanDetail(detail)
        if (!resolved) {
          showToast('게시글을 찾을 수 없어요')
          return
        }
        setDrawerItem(resolved)
        setPinnedItem(resolved)
        if (focus) setPendingFeedback({ item: resolved, ...focus })
      })
      .catch(() => { if (!ignore) showToast('게시글을 찾을 수 없어요') })
      .finally(() => { if (!ignore) clearOpenParam() })
    return () => { ignore = true }
  }, [openId, feedbackParam, realItems, feedLoading, setSearchParams])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1600)
  }

  // --- 스크랩(내 여행으로 저장) · 참견 ---
  // 로그인하면 내가 저장한 여행 목록을 한 번 받아 originalTripId → savedTripId 로 들고 있는다. 카드는 이걸로 채워진 북마크를 그린다.
  const [savedIds, setSavedIds] = useState(() => new Map())
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [saveDelta, setSaveDelta] = useState({})
  const [feedbackDelta, setFeedbackDelta] = useState({})
  const [feedbackTarget, setFeedbackTarget] = useState(null)

  // 검색어/정렬이 바뀌어 목록을 처음부터 다시 받으면, 그 새 목록엔 이미 최신 참견·스크랩 수가
  // 들어있다 — 이전 화면에서 쌓아둔 낙관적 델타를 그대로 두면 서버 값 위에 또 더해져 숫자가 어긋난다.
  useEffect(() => {
    setSaveDelta({})
    setFeedbackDelta({})
  }, [searchKeyword, sortOption, reloadKey])

  useEffect(() => {
    if (!user) {
      setSavedIds(new Map())
      return
    }
    let ignore = false
    getSavedTrips()
      .then((list) => {
        if (ignore) return
        setSavedIds(new Map(list.map((t) => [t.originalTripId, t.savedTripId])))
      })
      .catch(() => {})
    return () => { ignore = true }
  }, [user])

  const toggleSave = useCallback(async (item) => {
    const tripId = targetTripId(item)
    if (!tripId) return
    if (!user) {
      showToast('로그인하면 내 여행으로 스크랩할 수 있어요')
      return
    }
    if (pendingIds.has(tripId)) return
    setPendingIds((s) => new Set(s).add(tripId))
    const savedTripId = savedIds.get(tripId)
    try {
      if (savedTripId) {
        await unsaveTrip(savedTripId)
        setSavedIds((m) => { const next = new Map(m); next.delete(tripId); return next })
        setSaveDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) - 1 }))
        showToast('스크랩을 해제했어요')
      } else {
        const saved = await saveTrip(tripId, item.type === 'record' ? 'RECORD' : 'PLAN')
        setSavedIds((m) => new Map(m).set(tripId, saved.savedTripId))
        setSaveDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) + 1 }))
        showToast('보관함에 스크랩했어요')
      }
    } catch (err) {
      const data = err?.response?.data
      if (data?.code === 'TRIP_012') {
        // 이미 보관함에 있음 — 목록을 다시 받아 상태만 맞춘다
        const list = await getSavedTrips().catch(() => [])
        setSavedIds(new Map(list.map((t) => [t.originalTripId, t.savedTripId])))
        showToast('이미 보관함에 있는 계획이에요')
      } else {
        showToast(
          err?.response?.status === 401
            ? '로그인이 필요해요'
            : data?.code === 'TRIP_011'
              ? '내 계획은 스크랩할 수 없어요'
              : data?.message || '스크랩에 실패했어요. 잠시 후 다시 시도해주세요',
        )
      }
    } finally {
      setPendingIds((s) => { const next = new Set(s); next.delete(tripId); return next })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedIds, pendingIds])

  const openFeedback = useCallback((item) => {
    const tripId = targetTripId(item)
    if (!tripId) return
    // 기록에서 열면 참견 대상은 그 기록의 계획 — 제목은 목록에 있으면 계획 제목, 없으면 기록 제목을 쓴다
    const plan = item.type === 'plan' ? item : allItemsRef.current.find((i) => i.type === 'plan' && i.id === tripId)
    setFeedbackTarget({ tripId, title: plan?.title ?? item.title, ownerName: (plan ?? item).user?.nickname, ownerId: (plan ?? item).user?.id ?? null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 좋아요 알림 딥링크 — 상세가 열린 다음 그 위에 참견 드로어를 띄우고 해당 참견으로 스크롤·강조
  useEffect(() => {
    if (!pendingFeedback) return
    openFeedback(pendingFeedback.item)
    setFeedbackTarget((t) => (t ? { ...t, focusId: pendingFeedback.focusId } : t))
    setPendingFeedback(null)
  }, [pendingFeedback, openFeedback])

  const feedActions = useMemo(
    () => ({ user, savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback }),
    [user, savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback],
  )

  // 640px(Tailwind sm) 미만에서는 갤러리 토글을 숨기는 것과 별개로,
  // 이미 갤러리 상태에서 화면이 좁아진 경우에도 리스트로 강제 전환
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    function handleChange(e) {
      if (e.matches) setView('list')
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  // 종류·지역은 서버가 걸러서 준다(GET /feed?type=&region=). 여기서는 딥링크로 맨 위에 꽂아 둔 글이
  // 지금 고른 종류와 다를 때만 걸러낸다 — 지역은 서버 기준(계획에 담긴 장소 중 하나라도 일치)이라
  // 카드에 보이는 대표 지역과 다를 수 있어 프론트에서 다시 거르지 않는다.
  function matchesFilters(item) {
    return filter === 'all' || item.type === filter
  }

  // 실 데이터는 이미 서버가 keyword로 걸러서 준 결과라 그대로 믿는다. pinnedItem(홈 등에서 열고 들어온 글)이 있으면 맨 위로 꽂는다.
  const allItems = useMemo(() => {
    if (!pinnedItem) return realItems
    return [pinnedItem, ...realItems.filter((i) => i.id !== pinnedItem.id)]
  }, [realItems, pinnedItem])
  const allItemsRef = useRef(allItems)
  allItemsRef.current = allItems
  // "전체"에서는 최신순은 유지하되, 계획이 기록보다 훨씬 많아 기록이 뒤로 밀리지 않도록 두 타입을
  // 비율대로 섞는다 — filter가 plan/record 단일 타입이면 섞을 대상이 하나뿐이라 그대로 최신순.
  const items = useMemo(() => {
    const filtered = allItems.filter(matchesFilters)
    return filter === 'all' ? interleaveByKey(filtered, (i) => i.type) : filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, filter])
  // 인기 지역 순위와 지역 칩 모두 백엔드 집계(GET /feed/regions, 이번 달 상위 10개)를 그대로 쓴다
  const monthlyRegions = useMonthlyRegions()
  const regionChips = monthlyRegions.chips
  // 갤러리는 grid 행 높이가 좌우 중 큰 쪽에 맞춰져 짧은 카드 아래 빈 공간이 생기므로,
  // 좌/우 컬럼을 독립된 세로 스택 두 개로 나눠 각자 빈틈없이 붙게 렌더링한다.
  const galleryLeft = items.filter((_, i) => i % 2 === 0)
  const galleryRight = items.filter((_, i) => i % 2 === 1)

  // 기록 카드가 뒤집힐 때 그 계획이 이미 목록에 있으면 조회 없이 바로 보여준다
  function findPlan(planId) {
    return allItems.find((i) => i.type === 'plan' && i.id === planId) ?? null
  }

  function renderCard(item) {
    return item.type === 'plan' ? (
      <PlanFeedCard key={item.id} item={item} onOpen={setDrawerItem} />
    ) : (
      <RecordFeedCard key={item.id} item={item} onOpen={setDrawerItem} findPlan={findPlan} />
    )
  }

  // 화면 아래에 닿으면 다음 페이지를 이어붙이는 무한 스크롤 트리거 — 검색 결과가 없거나 로딩 중일 땐 안 보인다.
  // 리스트 뷰에선 우측 사이드바(aside)까지 포함한 전체 폭이 아니라 카드 컬럼 안에 넣어서, 카드 컬럼
  // 기준으로 가운데에 오게 한다(갤러리 뷰는 사이드바가 없어 바깥에 둬도 카드 폭 그대로 중앙에 온다).
  const scrollFooter = !feedLoading && items.length > 0 && (
    <div ref={sentinelRef} className="flex h-10 items-center justify-center">
      {(loadingMore || endChecking) && <Icon icon="mdi:loading" width={18} className="animate-spin text-slate-300" />}
      {endReached && !loadingMore && !endChecking && (
        <span className="text-[12px] text-slate-400">모든 피드를 다 확인했어요</span>
      )}
    </div>
  )

  return (
    <div className="bg-surface text-slate-900">
      <Navbar />

      <FeedActionsProvider value={feedActions}>
      {/* 필터 버튼 왼쪽 끝은 탑바 로고, 기록 업로드 버튼 오른쪽 끝은 프로필 알약과 같은 선 — 탑바 컨테이너(1200px, px-4 sm:px-6)와 폭을 맞춘다 */}
      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-col gap-5 pb-8">
        <div className="sticky top-16 z-10 bg-surface pt-2.5">
          <FeedFilterBar
            filter={filter}
            onFilterChange={setFilter}
            view={view}
            onViewChange={setView}
            onUploadClick={() => setUploadOpen(true)}
          />
        </div>

        {/* 기록 업로드 — 모바일 전용. FeedFilterBar 안의 같은 버튼은 sm 이상에서만 보이고(스티키 필터탭과
            같이 고정), 모바일에서는 스티키 영역 밖인 여기에 따로 둬서 페이지와 함께 자연스럽게 스크롤된다. */}
        <Button
          onClick={() => setUploadOpen(true)}
          className="flex items-center justify-center gap-1.5 self-start rounded-full px-4 py-2 text-[12.5px] font-bold shadow-card hover:shadow-card-hover sm:hidden"
        >
          <Icon icon="mdi:cloud-upload-outline" width={16} />
          기록 업로드
        </Button>

        {/* 인기 지역은 필터탭과 달리 스크롤하면 같이 흘러가도록 sticky 래퍼 밖에 둠 */}
        {view === 'gallery' && (
          <RegionRankPanel monthly={monthlyRegions} chips={regionChips} loading={monthlyRegions.loading} active={region} onSelect={setRegion} layout="row" />
        )}

        {view === 'list' ? (
          <div className="flex flex-col gap-6 md:flex-row md:gap-7">
            <div className="order-2 flex min-w-0 flex-1 flex-col gap-5 md:order-1">
              {/* 검색 중일 때만 노출 — 외곽선 없이 텍스트+작은 화살표만, 드롭다운은 기본 브라우저 UI 대신 커스텀 패널 */}
              {searchKeyword && (
                <div className="relative -mb-2" ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((v) => !v)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700"
                  >
                    {SORT_OPTIONS.find((o) => o.value === sortOption)?.label}
                    <Icon
                      icon="solar:alt-arrow-down-linear"
                      width={10}
                      className={`transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {sortMenuOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1.5 w-28 rounded-xl border border-slate-100 bg-surface py-1 shadow-popup">
                      {SORT_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            setSortOption(o.value)
                            setSortMenuOpen(false)
                          }}
                          className={`block w-full px-3 py-1.5 text-left text-[12px] transition-colors ${
                            sortOption === o.value ? 'bg-brand-light font-bold text-brand' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {feedLoading ? (
                <FeedCardSkeletons count={3} />
              ) : items.length === 0 ? (
                <div className="py-20 text-center text-[13px] text-slate-400">해당하는 피드가 없어요.</div>
              ) : (
                items.map(renderCard)
              )}
              {scrollFooter}
            </div>
            <aside className="order-1 flex w-full shrink-0 flex-col gap-4 md:order-2 md:sticky md:top-[134px] md:w-[300px] md:self-start">
              <div
                className={`flex h-9 items-center gap-1.5 rounded-lg border bg-surface px-2.5 shadow-card transition-colors ${
                  searchFocused ? 'border-brand/40' : 'border-slate-200'
                }`}
              >
                <Icon icon="solar:magnifer-linear" width={14} className="shrink-0 text-slate-300" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setSearchKeyword(searchInput.trim())
                    }
                  }}
                  placeholder="여행 계획, 기록 검색"
                  className="h-full w-full text-[12px] text-slate-700 outline-none placeholder:text-slate-300"
                />
                {searchInput && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchInput('')
                      setSearchKeyword('')
                    }}
                    aria-label="검색어 지우기"
                    className="shrink-0 text-slate-300 hover:text-slate-500"
                  >
                    <Icon icon="mdi:close-circle" width={15} />
                  </button>
                )}
              </div>

              <RegionRankPanel monthly={monthlyRegions} chips={regionChips} loading={monthlyRegions.loading} active={region} onSelect={setRegion} />
              <PopularPlansTop5 onOpen={setDrawerItem} />
            </aside>
          </div>
        ) : (
          <>
            {feedLoading ? (
              <div className="flex gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-5"><FeedCardSkeletons count={2} /></div>
                <div className="flex min-w-0 flex-1 flex-col gap-5"><FeedCardSkeletons count={2} /></div>
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center text-[13px] text-slate-400">해당하는 피드가 없어요.</div>
            ) : (
              <div className="flex gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-5">{galleryLeft.map(renderCard)}</div>
                <div className="flex min-w-0 flex-1 flex-col gap-5">{galleryRight.map(renderCard)}</div>
              </div>
            )}
            {scrollFooter}
          </>
        )}
      </Section>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />

      <FeedDetailDrawer
        item={drawerItem}
        items={allItems}
        onClose={() => setDrawerItem(null)}
        onSavePlan={toggleSave}
      />

      <FeedbackDrawer
        target={feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        onPosted={(tripId) => setFeedbackDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) + 1 }))}
        onDeleted={(tripId) => setFeedbackDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) - 1 }))}
      />
      </FeedActionsProvider>

      <RecordUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(_, trip) => {
          setReloadKey((k) => k + 1)
          // 피드엔 공개 계획의 기록만 올라온다 — 비공개면 저장만 됐다고 알려준다
          showToast(trip?.published ? '기록을 올렸어요' : '기록을 저장했어요 · 계획을 공개하면 피드에 보여요')
        }}
      />

      {/* 모바일에서 장바구니/챗봇 패널이 열려 있어도(z-[70]) 가려지지 않게 그 위(z-[80])에 띄운다 */}
      <div
        className={`fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  )
}

// 피드 카드 골격 — 작성자 줄, 사진 영역, 제목·메타, 액션바. 계획/기록 공통으로 쓰는 단순한 형태
function FeedCardSkeletons({ count }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-surface p-4" role="status" aria-label="피드를 불러오는 중">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" style={{ animationDelay: `${i * 120}ms` }} />
              <div>
                <Skeleton className="h-3 w-16" style={{ animationDelay: `${i * 120 + 40}ms` }} />
                <Skeleton className="mt-1.5 h-2.5 w-10" style={{ animationDelay: `${i * 120 + 80}ms` }} />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" style={{ animationDelay: `${i * 120 + 100}ms` }} />
          </div>
          <Skeleton className="mt-3 aspect-[4/3] w-full rounded-2xl" style={{ animationDelay: `${i * 120 + 140}ms` }} />
          <Skeleton className="mt-3 h-4 w-2/3" style={{ animationDelay: `${i * 120 + 200}ms` }} />
          <Skeleton className="mt-2 h-3 w-1/3" style={{ animationDelay: `${i * 120 + 240}ms` }} />
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <Skeleton className="h-5 w-10 rounded-md" />
            <Skeleton className="h-5 w-10 rounded-md" />
          </div>
        </div>
      ))}
    </>
  )
}
