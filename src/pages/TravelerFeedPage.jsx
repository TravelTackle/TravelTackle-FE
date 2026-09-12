import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Card from '../components/ui/Card'
import FeedFilterBar from '../components/travelerFeed/FeedFilterBar'
import RegionChipRow from '../components/travelerFeed/RegionChipRow'
import PopularPlansTop5 from '../components/travelerFeed/PopularPlansTop5'
import PlanFeedCard from '../components/travelerFeed/PlanFeedCard'
import RecordFeedCard from '../components/travelerFeed/RecordFeedCard'
import FeedDetailDrawer from '../components/travelerFeed/FeedDetailDrawer'
import RecordUploadModal from '../components/travelerFeed/RecordUploadModal'
import FeedbackDrawer from '../components/travelerFeed/FeedbackDrawer'
import { FeedActionsProvider, targetTripId } from '../components/travelerFeed/FeedActionsContext'
import { useAuth } from '../context/AuthContext'
import { getSavedTrips, saveTrip, unsaveTrip } from '../api/trip'
import { FEED_REGIONS, MOCK_FEED_ITEMS, MOCK_GALLERY_ITEMS, MOCK_TOP5_PLANS } from '../data/feed'
import { getFeed } from '../api/feed'
import { adaptFeedItem } from '../data/feedAdapter'

const SORT_OPTIONS = [
  { value: 'relevance', label: '관련도순' },
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function TravelerFeedPage() {
  const { user } = useAuth()
  const [realItems, setRealItems] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [sortOption, setSortOption] = useState('relevance')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setSortMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // 실 데이터를 목업 앞에 붙여서 표시 — 목업은 항상 맨 아래 유지. sort는 사용자가 고른 값을 그대로 보내고,
  // relevance인데 keyword가 없으면 서버가 알아서 latest로 대체해준다.
  // reloadKey: 기록 업로드 뒤 같은 조건으로 목록을 다시 불러오기 위한 트리거
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    getFeed({ size: 50, keyword: searchKeyword || undefined, sort: sortOption })
      .then((page) => setRealItems(page.content.map(adaptFeedItem)))
      .catch(() => setRealItems([]))
  }, [searchKeyword, sortOption, reloadKey])

  // 입력을 멈춘 뒤에만 검색
  useEffect(() => {
    const timer = setTimeout(() => setSearchKeyword(searchInput.trim()), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // 홈 모아보기 등에서 ?open=<id>&filter=plan|record 로 들어오면 해당 글 상세를 바로 연다
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('open')
  const initialFilter = ['plan', 'record'].includes(searchParams.get('filter')) ? searchParams.get('filter') : 'all'

  const [view, setView] = useState('list')
  const [filter, setFilter] = useState(initialFilter)
  const [region, setRegion] = useState(null)
  const [drawerItem, setDrawerItem] = useState(null)

  useEffect(() => {
    if (!openId) return
    const target = [...realItems, ...MOCK_FEED_ITEMS].find((i) => i.id === openId)
    if (!target) return
    setDrawerItem(target)
    // 한 번 열었으면 주소에서 지워 새로고침·뒤로가기 때 다시 열리지 않게
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('open')
      return next
    }, { replace: true })
  }, [openId, realItems, setSearchParams])
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
    if (!UUID_RE.test(tripId)) {
      showToast('예시 게시물이라 스크랩할 수 없어요')
      return
    }
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
        await saveTrip(tripId)
        // 방금 저장한 항목의 savedTripId를 알기 위해 목록을 다시 받는다(응답은 복사된 계획만 돌려준다)
        const list = await getSavedTrips().catch(() => [])
        setSavedIds(new Map(list.map((t) => [t.originalTripId, t.savedTripId])))
        setSaveDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) + 1 }))
        showToast('내 여행으로 스크랩했어요 · 나의 여행에서 확인')
      }
    } catch (err) {
      const data = err?.response?.data
      showToast(
        err?.response?.status === 401
          ? '로그인이 필요해요'
          : data?.code === 'TRIP_011'
            ? '내 계획은 스크랩할 수 없어요'
            : data?.message || '스크랩에 실패했어요. 잠시 후 다시 시도해주세요',
      )
    } finally {
      setPendingIds((s) => { const next = new Set(s); next.delete(tripId); return next })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedIds, pendingIds])

  const openFeedback = useCallback((item) => {
    const tripId = targetTripId(item)
    if (!tripId) return
    if (!UUID_RE.test(tripId)) {
      showToast('예시 게시물에는 참견을 남길 수 없어요')
      return
    }
    // 기록에서 열면 참견 대상은 그 기록의 계획 — 제목은 목록에 있으면 계획 제목, 없으면 기록 제목을 쓴다
    const plan = item.type === 'plan' ? item : allItemsRef.current.find((i) => i.type === 'plan' && i.id === tripId)
    setFeedbackTarget({ tripId, title: plan?.title ?? item.title, ownerName: (plan ?? item).user?.nickname })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function matchesFilters(item) {
    if (filter !== 'all' && item.type !== filter) return false
    if (region && item.region !== region) return false
    return true
  }

  // 실 데이터는 이미 서버가 keyword로 걸러서 준 결과라 그대로 믿고, 목업은 항상 섞여 나오니
  // 검색 중엔 목업 쪽만 클라이언트에서 같은 keyword로 한 번 더 걸러서 엉뚱한 목업이 안 섞이게 한다.
  const q = searchKeyword.trim().toLowerCase()
  function matchesMockKeyword(item) {
    if (!q) return true
    return item.title?.toLowerCase().includes(q) || item.comment?.toLowerCase().includes(q)
  }

  const allItems = [...realItems, ...MOCK_FEED_ITEMS.filter(matchesMockKeyword)]
  const allItemsRef = useRef(allItems)
  allItemsRef.current = allItems
  const items = allItems.filter(matchesFilters)
  // 갤러리형은 계획→기록→기록→계획 Z자 순서로 보이도록 별도 배치 데이터 사용.
  // grid는 행 높이가 좌우 중 큰 쪽에 맞춰져 짧은 카드 아래 빈 공간이 생기므로,
  // 좌/우 컬럼을 독립된 세로 스택 두 개로 나눠 각자 빈틈없이 붙게 렌더링한다.
  const galleryItems = [...realItems, ...MOCK_GALLERY_ITEMS.filter(matchesMockKeyword)].filter(matchesFilters)
  const galleryLeft = galleryItems.filter((_, i) => i % 2 === 0)
  const galleryRight = galleryItems.filter((_, i) => i % 2 === 1)

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

  return (
    <div className="bg-white text-slate-900">
      <Navbar />

      <FeedActionsProvider value={feedActions}>
      {/* 필터 버튼 왼쪽 끝은 탑바 로고, 기록 업로드 버튼 오른쪽 끝은 프로필 알약과 같은 선 — 탑바 컨테이너(1200px, px-4 sm:px-6)와 폭을 맞춘다 */}
      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-col gap-5 pb-8">
        <div className="sticky top-16 z-10 bg-white pt-2.5">
          <FeedFilterBar
            filter={filter}
            onFilterChange={setFilter}
            view={view}
            onViewChange={setView}
            onUploadClick={() => setUploadOpen(true)}
          />
        </div>

        {/* 인기 지역은 필터탭과 달리 스크롤하면 같이 흘러가도록 sticky 래퍼 밖에 둠 */}
        {view === 'gallery' && (
          <RegionChipRow regions={FEED_REGIONS} active={region} onSelect={setRegion} layout="scroll" title="인기 지역" />
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
                    <div className="absolute left-0 top-full z-30 mt-1.5 w-28 rounded-xl border border-slate-100 bg-white py-1 shadow-popup">
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
              {items.length === 0 ? (
                <div className="py-20 text-center text-[13px] text-slate-400">해당하는 피드가 없어요.</div>
              ) : (
                items.map(renderCard)
              )}
            </div>
            <aside className="order-1 flex w-full shrink-0 flex-col gap-4 md:order-2 md:sticky md:top-[134px] md:w-[300px] md:self-start">
              <div
                className={`flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2.5 shadow-card transition-colors ${
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

              <Card className="p-4">
                <RegionChipRow regions={FEED_REGIONS} active={region} onSelect={setRegion} layout="grid" title="인기 지역" />
              </Card>
              <PopularPlansTop5 plans={MOCK_TOP5_PLANS} onOpen={setDrawerItem} />
            </aside>
          </div>
        ) : (
          galleryItems.length === 0 ? (
            <div className="py-20 text-center text-[13px] text-slate-400">해당하는 피드가 없어요.</div>
          ) : (
            <div className="flex gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-5">{galleryLeft.map(renderCard)}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-5">{galleryRight.map(renderCard)}</div>
            </div>
          )
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

      <div
        className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  )
}
