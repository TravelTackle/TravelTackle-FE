import { useCallback, useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import ExploreSidebar from '../components/tourExplore/ExploreSidebar'
import TourCardGrid from '../components/tourExplore/TourCardGrid'
import TourDetailDrawer from '../components/tourExplore/TourDetailDrawer'
import { useAuth } from '../context/AuthContext'
import { getTourContents } from '../api/tour'
import { addCartItem } from '../api/cart'
import { PAGE_SIZE } from '../data/tourSpots'

export default function TourExplorePage() {
  const { user } = useAuth()
  const [theme, setTheme] = useState(null)
  const [region, setRegion] = useState(null)
  const [sigungu, setSigungu] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [spots, setSpots] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedContentId, setSelectedContentId] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const fetchPage = useCallback((pageNum, { append }) => {
    const setBusy = append ? setLoadingMore : setLoading
    setBusy(true)
    return getTourContents({
      contentTypeId: theme?.contentTypeId,
      keyword: searchKeyword || theme?.keyword,
      areaCode: region?.code,
      sigunguCode: sigungu?.code,
      page: pageNum,
      size: PAGE_SIZE,
      arrange: 'O', // 제목순 + 대표이미지 있는 콘텐츠만 (이미지 없는 관광지 제외)
    })
      .then((data) => {
        setSpots((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []))
        setTotalCount(data.totalCount || 0)
        setPage(data.page || pageNum)
      })
      .catch(() => {
        if (!append) setSpots([])
      })
      .finally(() => setBusy(false))
  }, [theme, region, sigungu, searchKeyword])

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

  async function handleAddToCart(contentId) {
    if (!user) {
      showToast('로그인이 필요해요')
      return false
    }
    try {
      await addCartItem(contentId)
      showToast('여행 장바구니에 담았어요')
      return true
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('이미 장바구니에 있어요')
        return true
      }
      showToast('장바구니에 담지 못했어요')
      return false
    }
  }

  const hasMore = spots.length < totalCount

  return (
    <div className="bg-white text-slate-900">
      <Navbar />

      <Section as="main" className="flex flex-col gap-6 py-8 md:flex-row">
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
          onSelectTheme={(t) => setTheme((v) => (v?.label === t.label ? null : t))}
          onSelectRegion={(r) => {
            setRegion((v) => (v?.code === r.code ? null : r))
            setSigungu(null)
          }}
          onSelectSigungu={setSigungu}
        />

        <div className="min-w-0 flex-1">
          <TourCardGrid
            spots={spots}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onOpen={(spot) => setSelectedContentId(spot.contentId)}
            onAddToCart={handleAddToCart}
          />
        </div>
      </Section>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />

      <TourDetailDrawer
        contentId={selectedContentId}
        onClose={() => setSelectedContentId(null)}
        onAddToCart={handleAddToCart}
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
