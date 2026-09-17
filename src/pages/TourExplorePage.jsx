import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import ExploreSidebar from '../components/tourExplore/ExploreSidebar'
import TourCardGrid from '../components/tourExplore/TourCardGrid'
import TourDetailDrawer from '../components/tourExplore/TourDetailDrawer'
import FestivalPeriodBar from '../components/tourExplore/FestivalPeriodBar'
import { useAuth } from '../context/AuthContext'
import { getTourContentDetail, getTourContents, getTourFestivals } from '../api/tour'
import { CART_CHANGED_EVENT, addCartItem, getCartItems, removeCartItem } from '../api/cart'
import { PAGE_SIZE, toLDongRegnCd } from '../data/tourSpots'
import { DEFAULT_PRESET, presetRange } from '../lib/festivalPeriod'
import { shuffle } from '../lib/shuffle'

// 축제·행사 테마의 기간 상태 — 프리셋 키와 그로부터 계산된 start/end("YYYY-MM-DD", end는 null 가능)
function initialPeriod() {
  return { preset: DEFAULT_PRESET, ...presetRange(DEFAULT_PRESET) }
}

export default function TourExplorePage() {
  const { user } = useAuth()
  const [theme, setTheme] = useState(null)
  const [region, setRegion] = useState(null)
  const [sigungu, setSigungu] = useState(null)
  const [period, setPeriod] = useState(initialPeriod)
  const isFestival = theme?.kind === 'festival'
  const [searchInput, setSearchInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [spots, setSpots] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedContentId, setSelectedContentId] = useState(null)
  // 홈 등에서 ?open=<contentId>로 들어온 여행지 — 그리드 맨 위에 고정해서 보여준다
  const [pinnedSpot, setPinnedSpot] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const openContentId = searchParams.get('open')
  // 탐색 카드 "담기" 상태 동기화 — 실제 장바구니 목록을 한 번 받아서, 이미 담긴 콘텐츠는
  // 세션 첫 진입에도(그리드 카드·상세 패널 모두) "담음"으로 보이게 한다.
  // contentId → cartItemId 맵으로 들고 있어야, 담긴 걸 다시 눌렀을 때 그 카트 아이템을 바로 지울 수 있다.
  const [cartMap, setCartMap] = useState(() => new Map())

  useEffect(() => {
    if (!user) {
      setCartMap(new Map())
      return
    }
    let ignore = false
    function sync() {
      getCartItems()
        .then((items) => { if (!ignore) setCartMap(new Map(items.map((i) => [i.contentId, i.id]))) })
        .catch(() => {})
    }
    sync()
    // FloatingCart 패널 등 다른 곳에서 담기/빼기가 일어나도 이 페이지 카드 상태가 같이 바뀌게
    window.addEventListener(CART_CHANGED_EVENT, sync)
    return () => {
      ignore = true
      window.removeEventListener(CART_CHANGED_EVENT, sync)
    }
  }, [user])

  const fetchPage = useCallback((pageNum, { append }) => {
    const setBusy = append ? setLoadingMore : setLoading
    setBusy(true)
    // 축제·행사는 기간 조회 API로 — 시군구는 받지 않고 시/도는 법정동 코드로 바꿔 보낸다
    const request = isFestival
      ? getTourFestivals({
          startDate: period.start,
          endDate: period.end || undefined,
          lDongRegnCd: toLDongRegnCd(region?.code),
          page: pageNum,
          size: PAGE_SIZE,
        })
      : getTourContents({
          contentTypeId: theme?.contentTypeId,
          keyword: searchKeyword || theme?.keyword,
          areaCode: region?.code,
          sigunguCode: sigungu?.code,
          page: pageNum,
          size: PAGE_SIZE,
          arrange: 'R', // 최신 등록순 + 대표이미지 있는 콘텐츠만 (이미지 없는 관광지 제외)
        })
    return request
      .then((data) => {
        // 새로 받아온 배치만 섞는다 — 이미 붙어있는 이전 페이지 순서는 건드리지 않는다
        setSpots((prev) => (append ? [...prev, ...shuffle(data.items || [])] : shuffle(data.items || [])))
        setTotalCount(data.totalCount || 0)
        setPage(data.page || pageNum)
      })
      .catch(() => {
        if (!append) setSpots([])
      })
      .finally(() => setBusy(false))
  }, [theme, region, sigungu, searchKeyword, isFestival, period.start, period.end])

  // 홈 "여행지 탐색" 카드 등에서 ?open=<contentId>로 들어오면 상세를 바로 열고, 목록엔 없을 수도
  // 있으니(다른 지역/테마 결과라) 그 여행지 정보를 따로 받아 그리드 맨 위에도 꽂아 보여준다.
  useEffect(() => {
    if (!openContentId) return
    setSelectedContentId(openContentId)
    let ignore = false
    getTourContentDetail(openContentId)
      .then((data) => {
        if (ignore) return
        setPinnedSpot({ contentId: openContentId, title: data.title, imageUrl: data.imageUrl, address: data.address })
      })
      .catch(() => {})
      // 쿼리 제거는 조회가 끝난 뒤에 — 먼저 지우면 openContentId가 바뀌어 이 이펙트가 곧장 재실행되고,
      // 그 cleanup이 위 ignore를 먼저 true로 만들어버려 응답이 와도 pinnedSpot이 반영되지 않는다.
      .finally(() => {
        if (ignore) return
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('open')
          return next
        }, { replace: true })
      })
    return () => { ignore = true }
  }, [openContentId, setSearchParams])

  // 프리셋을 고르면 날짜를 여기서 계산하고, 직접 고른 날짜는 그대로 받는다
  function handlePeriodChange(next) {
    setPeriod(next.preset === 'custom' ? next : { preset: next.preset, ...presetRange(next.preset) })
  }

  useEffect(() => {
    fetchPage(1, { append: false })
  }, [fetchPage])

  // 입력을 멈춘 뒤에만 검색 — 외부 TourAPI를 거치는 호출이라 타이핑마다 바로 쏘지 않는다.
  useEffect(() => {
    const timer = setTimeout(() => setSearchKeyword(searchInput.trim()), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  function handleLoadMore() {
    if (loadingMore) return
    fetchPage(page + 1, { append: true })
  }

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1600)
  }

  // 이미 담긴 콘텐츠를 다시 누르면 담기 대신 빼기 — 장바구니 패널의 삭제와 동일하게 동작한다.
  async function handleToggleCart(contentId) {
    if (!user) {
      showToast('로그인이 필요해요')
      return false
    }
    const cartItemId = cartMap.get(contentId)
    if (cartItemId) {
      try {
        await removeCartItem(cartItemId)
        setCartMap((m) => { const next = new Map(m); next.delete(contentId); return next })
        showToast('장바구니에서 뺐어요')
        return true
      } catch {
        showToast('장바구니에서 빼지 못했어요')
        return false
      }
    }
    try {
      const created = await addCartItem(contentId)
      setCartMap((m) => new Map(m).set(contentId, created.id))
      showToast('여행 장바구니에 담았어요')
      return true
    } catch (err) {
      if (err.response?.status === 409) {
        // 이미 있는데 우리 맵엔 없던 경우(다른 탭 등에서 담김) — 목록을 다시 받아 동기화
        const items = await getCartItems().catch(() => [])
        setCartMap(new Map(items.map((i) => [i.contentId, i.id])))
        showToast('이미 장바구니에 있어요')
        return true
      }
      showToast('장바구니에 담지 못했어요')
      return false
    }
  }

  const hasMore = spots.length < totalCount
  // 축제 탭은 필드 형태가 달라 핀 고정을 적용하지 않는다(일반 여행지 탐색에서만 홈 딥링크로 들어온다)
  const gridSpots = useMemo(() => {
    if (!pinnedSpot || isFestival) return spots
    return [pinnedSpot, ...spots.filter((s) => s.contentId !== pinnedSpot.contentId)]
  }, [spots, pinnedSpot, isFestival])

  return (
    <div className="bg-surface text-slate-900">
      <Navbar />

      {/* 사이드바 왼쪽 끝은 탑바 로고, 카드 오른쪽 끝은 프로필 알약과 같은 선에 오도록 탑바 컨테이너(1200px, px-4 sm:px-6)와 폭을 맞춘다 */}
      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-col gap-6 py-8 md:flex-row md:gap-5">
        <ExploreSidebar
          theme={theme}
          region={region}
          sigungu={sigungu}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onSearchSubmit={() => setSearchKeyword(searchInput.trim())}
          onSearchClear={() => {
            setSearchInput('')
            setSearchKeyword('')
          }}
          onSelectAll={() => {
            setTheme(null)
            setRegion(null)
            setSigungu(null)
          }}
          onSelectTheme={(t) => {
            setTheme((v) => (v?.label === t.label ? null : t))
            // 축제 테마는 시군구 필터를 지원하지 않으므로 넘어갈 때 비워둔다
            if (t.kind === 'festival') setSigungu(null)
          }}
          onSelectRegion={(r) => {
            setRegion((v) => (v?.code === r.code ? null : r))
            setSigungu(null)
          }}
          onSelectSigungu={setSigungu}
        />

        <div className="min-w-0 flex-1">
          {isFestival && (
            <FestivalPeriodBar
              period={period}
              onChange={handlePeriodChange}
              regionName={region?.name}
              loading={loading}
              totalCount={totalCount}
            />
          )}
          <TourCardGrid
            spots={gridSpots}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onOpen={(spot) => setSelectedContentId(spot.contentId)}
            onToggleCart={handleToggleCart}
            cartMap={cartMap}
            variant={isFestival ? 'festival' : 'spot'}
            emptyMessage={isFestival ? '이 기간에 열리는 축제·행사가 없어요.' : undefined}
            emptyAction={
              isFestival && period.preset !== 'upcoming' ? (
                <button
                  type="button"
                  onClick={() => handlePeriodChange({ preset: 'upcoming' })}
                  className="rounded-full bg-brand-light px-4 py-2 text-[12.5px] font-bold text-brand-dark transition-colors hover:bg-brand hover:text-white"
                >
                  예정된 행사 전체 보기
                </button>
              ) : null
            }
          />
        </div>
      </Section>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />

      <TourDetailDrawer
        contentId={selectedContentId}
        onClose={() => setSelectedContentId(null)}
        onToggleCart={handleToggleCart}
        carted={selectedContentId ? cartMap.has(selectedContentId) : false}
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
