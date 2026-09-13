import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Button from '../components/ui/Button'
import PlanFeedCard from '../components/travelerFeed/PlanFeedCard'
import RecordFeedCard from '../components/travelerFeed/RecordFeedCard'
import FeedDetailDrawer from '../components/travelerFeed/FeedDetailDrawer'
import FeedbackDrawer from '../components/travelerFeed/FeedbackDrawer'
import { FeedActionsProvider, targetTripId } from '../components/travelerFeed/FeedActionsContext'
import { useAuth } from '../context/AuthContext'
import { getSavedTrips, saveTrip, unsaveTrip, copySavedTrip } from '../api/trip'
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
  const { user } = useAuth()
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
    let ignore = false
    setLoading(true)
    getSavedTrips()
      .then((list) => { if (!ignore) setItems(list.map(adaptSavedTrip)) })
      .catch(() => { if (!ignore) setItems([]) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [reloadKey])

  // 여행자 피드와 같은 FeedActionsContext를 여기서도 직접 채워서, 카드/상세 패널 하단 아이콘이
  // 피드와 완전히 같은 컴포넌트(FeedActionBar)로 그려지고 동작도 똑같이 맞는다.
  // 보관함에 보이는 항목은 전부 이미 스크랩된 상태라, 목록을 받을 때마다 savedIds를 그 값으로 채운다.
  const [savedIds, setSavedIds] = useState(() => new Map())
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [saveDelta, setSaveDelta] = useState({})
  const [feedbackDelta, setFeedbackDelta] = useState({})
  const [feedbackTarget, setFeedbackTarget] = useState(null)

  useEffect(() => {
    setSavedIds(new Map(items.map((it) => [targetTripId(it), it.savedTripId])))
  }, [items])

  // 목록을 처음부터 다시 받으면 그 안엔 이미 최신 참견·스크랩 수가 들어있다 — 이전 낙관적 델타를
  // 그대로 두면 서버 값 위에 또 더해져 숫자가 어긋난다.
  useEffect(() => {
    setSaveDelta({})
    setFeedbackDelta({})
  }, [reloadKey])

  const toggleSave = useCallback(async (item) => {
    const tripId = targetTripId(item)
    if (!tripId || pendingIds.has(tripId)) return
    setPendingIds((s) => new Set(s).add(tripId))
    const savedTripId = savedIds.get(tripId)
    try {
      if (savedTripId) {
        await unsaveTrip(savedTripId)
        setSavedIds((m) => { const next = new Map(m); next.delete(tripId); return next })
        showToast('보관함에서 지웠어요')
        // 여기서 지운(스크랩 해제) 항목은 목록에서도 빠져야 하니 다시 불러온다
        setReloadKey((k) => k + 1)
      } else {
        const res = await saveTrip(tripId, item.type === 'record' ? 'RECORD' : 'PLAN')
        setSavedIds((m) => new Map(m).set(tripId, res.savedTripId))
        setSaveDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) + 1 }))
        showToast('보관함에 저장했어요')
      }
    } catch {
      showToast('처리하지 못했어요. 잠시 후 다시 시도해주세요')
    } finally {
      setPendingIds((s) => { const next = new Set(s); next.delete(tripId); return next })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds, pendingIds])

  const openFeedback = useCallback((item) => {
    const tripId = targetTripId(item)
    if (!tripId) return
    // 기록에서 열면 참견 대상은 그 기록의 계획 — 제목은 목록에 있으면 계획 제목, 없으면 기록 제목을 쓴다
    const plan = item.type === 'plan' ? item : items.find((i) => i.type === 'plan' && i.id === tripId)
    setFeedbackTarget({ tripId, title: plan?.title ?? item.title, ownerName: (plan ?? item).user?.nickname })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const feedActions = useMemo(
    () => ({ user, savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback }),
    [user, savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback],
  )

  // 기록 카드가 뒤집힐 때 그 계획이 이미 목록에 있으면 조회 없이 바로 보여준다
  function findPlan(planId) {
    return items.find((i) => i.type === 'plan' && i.id === planId) ?? null
  }

  // 여행자 피드 갤러리형과 같은 마스킹 방식(좌우 컬럼 독립 스택) — 3열로 확장
  const columns = Array.from({ length: COLUMNS }, (_, c) => items.filter((_, i) => i % COLUMNS === c))

  function renderCard(it) {
    const extra = <CopyToPlanButton item={it} onCopied={() => showToast('나의 계획으로 복사했어요')} />
    return it.type === 'record' ? (
      <RecordFeedCard key={it.savedTripId} item={it} onOpen={setDrawerItem} findPlan={findPlan} extra={extra} />
    ) : (
      <PlanFeedCard key={it.savedTripId} item={it} onOpen={setDrawerItem} extra={extra} />
    )
  }

  return (
    <div className="bg-surface text-slate-900">
      <Navbar />

      <FeedActionsProvider value={feedActions}>
        <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-col gap-5 pb-16 pt-8">
          <div className="border-b border-slate-100 pb-5">
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
                  {col.map(renderCard)}
                </div>
              ))}
            </div>
          )}
        </Section>

        <FeedDetailDrawer
          item={drawerItem}
          items={items}
          onClose={() => setDrawerItem(null)}
          onSavePlan={toggleSave}
          fromSaved
        />

        <FeedbackDrawer
          target={feedbackTarget}
          onClose={() => setFeedbackTarget(null)}
          onPosted={(tripId) => setFeedbackDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) + 1 }))}
          onDeleted={(tripId) => setFeedbackDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) - 1 }))}
        />
      </FeedActionsProvider>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />

      <div
        className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  )
}
