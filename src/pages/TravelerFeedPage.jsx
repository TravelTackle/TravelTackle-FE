import { useEffect, useRef, useState } from 'react'
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
import { FEED_REGIONS, MOCK_FEED_ITEMS, MOCK_GALLERY_ITEMS, MOCK_TOP5_PLANS } from '../data/feed'
import { getFeed } from '../api/feed'
import { adaptFeedItem } from '../data/feedAdapter'

export default function TravelerFeedPage() {
  const [realItems, setRealItems] = useState([])

  // 실 데이터를 목업 앞에 붙여서 표시 — 목업은 항상 맨 아래 유지
  useEffect(() => {
    getFeed({ size: 50 })
      .then((page) => setRealItems(page.content.map(adaptFeedItem)))
      .catch(() => setRealItems([]))
  }, [])

  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('all')
  const [region, setRegion] = useState(null)
  const [drawerItem, setDrawerItem] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1600)
  }

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

  const allItems = [...realItems, ...MOCK_FEED_ITEMS]
  const items = allItems.filter(matchesFilters)
  // 갤러리형은 계획→기록→기록→계획 Z자 순서로 보이도록 별도 배치 데이터 사용.
  // grid는 행 높이가 좌우 중 큰 쪽에 맞춰져 짧은 카드 아래 빈 공간이 생기므로,
  // 좌/우 컬럼을 독립된 세로 스택 두 개로 나눠 각자 빈틈없이 붙게 렌더링한다.
  const galleryItems = [...realItems, ...MOCK_GALLERY_ITEMS].filter(matchesFilters)
  const galleryLeft = galleryItems.filter((_, i) => i % 2 === 0)
  const galleryRight = galleryItems.filter((_, i) => i % 2 === 1)

  function renderCard(item) {
    return item.type === 'plan' ? (
      <PlanFeedCard key={item.id} item={item} onOpen={setDrawerItem} />
    ) : (
      <RecordFeedCard key={item.id} item={item} onOpen={setDrawerItem} />
    )
  }

  return (
    <div className="bg-white text-slate-900">
      <Navbar />

      <Section as="main" className="flex flex-col gap-5 pb-8">
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
          <div className="flex flex-col gap-6 md:flex-row md:justify-center">
            <div className="order-2 flex min-w-0 flex-1 flex-col gap-5 md:order-1 md:max-w-[520px]">
              {items.length === 0 ? (
                <div className="py-20 text-center text-[13px] text-slate-400">해당하는 피드가 없어요.</div>
              ) : (
                items.map(renderCard)
              )}
            </div>
            <aside className="order-1 flex w-full shrink-0 flex-col gap-4 md:order-2 md:sticky md:top-[134px] md:w-[260px] md:self-start">
              <Card className="p-4">
                <RegionChipRow regions={FEED_REGIONS} active={region} onSelect={setRegion} layout="grid" title="인기 지역" />
              </Card>
              <PopularPlansTop5 plans={MOCK_TOP5_PLANS} onOpen={setDrawerItem} />
            </aside>
          </div>
        ) : (
          galleryItems.length === 0 ? (
            <div className="max-w-[1060px] py-20 text-center text-[13px] text-slate-400">해당하는 피드가 없어요.</div>
          ) : (
            <div className="flex max-w-[1060px] gap-5">
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
        onSavePlan={() => showToast('내 여행 계획으로 저장했어요')}
      />

      <RecordUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

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
