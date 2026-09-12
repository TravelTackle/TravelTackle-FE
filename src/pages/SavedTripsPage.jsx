import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Button from '../components/ui/Button'
import PlanFeedCard from '../components/travelerFeed/PlanFeedCard'
import FeedDetailDrawer from '../components/travelerFeed/FeedDetailDrawer'
import { getSavedTrips, copySavedTrip } from '../api/trip'
import { adaptSavedTrip } from '../data/feedAdapter'

const COLUMNS = 3

// 스크랩만으로는 내 계획이 되지 않는다 — 이 버튼을 눌러야 실제 Trip으로 복사된다.
// 이미 복사한 항목은 버튼 대신 "내 계획에 있어요" 상태로 바뀐다.
function CopyToPlanButton({ item, onCopied }) {
  const [copying, setCopying] = useState(false)
  const [copiedTripId, setCopiedTripId] = useState(item.copiedTripId)

  async function handleCopy(e) {
    e.stopPropagation()
    if (copying || copiedTripId) return
    setCopying(true)
    try {
      const trip = await copySavedTrip(item.savedTripId)
      setCopiedTripId(trip.id)
      onCopied?.()
    } catch {
      // 조용히 실패 — 버튼이 원래 상태로 남아있어 다시 시도할 수 있다
    } finally {
      setCopying(false)
    }
  }

  if (copiedTripId) {
    return (
      <Link
        to="/trips"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-brand-light text-[12.5px] font-bold text-brand-dark transition-colors hover:bg-teal-100"
      >
        <Icon icon="solar:check-circle-linear" width={14} />
        내 계획에 있어요 · 보기
      </Link>
    )
  }

  return (
    <Button
      onClick={handleCopy}
      disabled={copying}
      className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold disabled:opacity-60"
    >
      <Icon icon="solar:copy-linear" width={14} />
      {copying ? '복사하는 중…' : '나의 계획으로 복사하기'}
    </Button>
  )
}

export default function SavedTripsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerItem, setDrawerItem] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1600)
  }

  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    setLoading(true)
    getSavedTrips()
      .then((list) => setItems((Array.isArray(list) ? list : []).map(adaptSavedTrip)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [reloadKey])

  // 여행자 피드 갤러리형과 같은 마스킹 방식(좌우 컬럼 독립 스택) — 3열로 확장
  const columns = Array.from({ length: COLUMNS }, (_, c) => items.filter((_, i) => i % COLUMNS === c))

  return (
    <div className="bg-white text-slate-900">
      <Navbar />

      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-col gap-5 pb-16 pt-8">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">보관함</h1>
          <p className="mt-1 text-[13px] text-slate-400">
            여행자 피드에서 스크랩한 다른 여행자의 계획이에요. 마음에 들면 나의 계획으로 복사해보세요.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[13px] text-slate-400">불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-[13px] text-slate-400">
            아직 스크랩한 여행이 없어요. 여행자 피드에서 마음에 드는 계획을 찜해보세요.
          </div>
        ) : (
          <div className="flex gap-5">
            {columns.map((col, c) => (
              <div key={c} className="flex min-w-0 flex-1 flex-col gap-5">
                {col.map((it) => (
                  <PlanFeedCard
                    key={it.savedTripId}
                    item={it}
                    onOpen={setDrawerItem}
                    extra={<CopyToPlanButton item={it} onCopied={() => showToast('나의 계획으로 복사했어요')} />}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />

      <FeedDetailDrawer
        item={drawerItem}
        items={items}
        onClose={() => setDrawerItem(null)}
        onSaved={(justSaved) => {
          showToast(justSaved ? '보관함에 저장했어요' : '보관함에서 지웠어요')
          if (!justSaved) setReloadKey((k) => k + 1)
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
