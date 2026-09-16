import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar, { Avatar } from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Skeleton from '../components/ui/Skeleton'
import { FeedTypeFilter, getFilters } from '../components/travelerFeed/FeedFilterBar'
import PlanFeedCard from '../components/travelerFeed/PlanFeedCard'
import RecordFeedCard from '../components/travelerFeed/RecordFeedCard'
import FeedDetailDrawer from '../components/travelerFeed/FeedDetailDrawer'
import FeedbackDrawer from '../components/travelerFeed/FeedbackDrawer'
import { FeedActionsProvider, targetTripId } from '../components/travelerFeed/FeedActionsContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n'
import { getSavedTrips, saveTrip, unsaveTrip } from '../api/trip'
import { getUserFeed, getUserProfile } from '../api/feed'
import { adaptFeedItem } from '../data/feedAdapter'

const GALLERY_COLUMNS = 3
const PAGE_SIZE = 30

const T = {
  ko: {
    userNotFound: '사용자를 찾을 수 없어요.',
    planLabel: '계획',
    recordLabel: '기록',
    emptyPlan: '아직 만든 여행 계획이 없어요.',
    emptyRecord: '아직 남긴 여행 기록이 없어요.',
    loginToSave: '로그인하면 내 여행으로 스크랩할 수 있어요',
    unsaved: '스크랩을 해제했어요',
    saved: '보관함에 스크랩했어요',
    loginRequired: '로그인이 필요해요',
    saveErrorOwnPlan: '내 계획은 스크랩할 수 없어요',
    saveErrorGeneric: '스크랩에 실패했어요. 잠시 후 다시 시도해주세요',
  },
  en: {
    userNotFound: 'Could not find this user.',
    planLabel: 'Plans',
    recordLabel: 'Records',
    emptyPlan: "This user hasn't created any trip plans yet.",
    emptyRecord: "This user hasn't left any trip records yet.",
    loginToSave: 'Log in to save this to your trips',
    unsaved: 'Removed from saved',
    saved: 'Saved',
    loginRequired: 'Login required',
    saveErrorOwnPlan: "You can't save your own plan",
    saveErrorGeneric: "Couldn't save that. Please try again later",
  },
}

// 다른 사용자의 공개 프로필 — 마이페이지(MyPageSettings)의 본인 갤러리와 같은 모양이지만,
// 편집 UI(설정 버튼·공개 토글·수정/삭제)는 전부 없다. FeedDetailDrawer/FeedUserHeader가
// 이미 로그인 유저 id와 글 작성자 id를 비교해 내 것이 아니면 그 UI들을 스스로 숨기므로,
// 여기서는 "여행자 피드에서 남의 카드를 보는 것"과 동일한 fromSaved=false 모드로만 붙여주면 된다.
export default function PublicProfilePage() {
  const { userId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  // 남의 프로필이라 관리 대상은 계획/기록뿐 — 여행자 피드의 "전체"는 빼고 마이페이지와 같은 두 탭만 둔다.
  const PROFILE_FILTERS = getFilters(language).filter((f) => f.value !== 'all')
  const isSelf = !authLoading && !!user && String(user.userId) === String(userId)

  // 본인 프로필로 들어오면 편집 가능한 마이페이지로 보낸다 — 이 화면은 읽기 전용이라 자기 글도 편집할 수 없다.
  useEffect(() => {
    if (isSelf) navigate('/mypage', { replace: true })
  }, [isSelf, navigate])

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(false)
  const [filter, setFilter] = useState('plan')
  const [items, setItems] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [drawerItem, setDrawerItem] = useState(null)
  const [feedbackTarget, setFeedbackTarget] = useState(null)
  const [feedbackDelta, setFeedbackDelta] = useState({})
  const [savedIds, setSavedIds] = useState(() => new Map())
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [saveDelta, setSaveDelta] = useState({})
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1600)
  }

  useEffect(() => {
    if (isSelf) return
    let ignore = false
    setProfileLoading(true)
    setProfileError(false)
    getUserProfile(userId)
      .then((data) => { if (!ignore) setProfile(data) })
      .catch(() => { if (!ignore) setProfileError(true) })
      .finally(() => { if (!ignore) setProfileLoading(false) })
    return () => { ignore = true }
  }, [userId, isSelf])

  useEffect(() => {
    if (isSelf) return
    let ignore = false
    setFeedLoading(true)
    setPage(0)
    getUserFeed(userId, { page: 0, size: PAGE_SIZE, sort: 'latest' })
      .then((res) => {
        if (ignore) return
        setItems(res.content.map(adaptFeedItem))
        setHasMore(!res.last)
      })
      .catch(() => {
        if (ignore) return
        setItems([])
        setHasMore(false)
      })
      .finally(() => { if (!ignore) setFeedLoading(false) })
    return () => { ignore = true }
  }, [userId, isSelf])

  const loadMore = useCallback(() => {
    if (feedLoading || loadingMore || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    getUserFeed(userId, { page: nextPage, size: PAGE_SIZE, sort: 'latest' })
      .then((res) => {
        setItems((prev) => [...prev, ...res.content.map(adaptFeedItem)])
        setPage(nextPage)
        setHasMore(!res.last)
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false))
  }, [feedLoading, loadingMore, hasMore, page, userId])

  const sentinelRef = useRef(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  // 로그인한 사람이 남의 프로필에서도 스크랩할 수 있어야 하니(여행자 피드와 동일) 내 스크랩 목록을 받아둔다.
  useEffect(() => {
    if (!user) {
      setSavedIds(new Map())
      return
    }
    let ignore = false
    getSavedTrips()
      .then((list) => { if (!ignore) setSavedIds(new Map(list.map((t) => [t.originalTripId, t.savedTripId]))) })
      .catch(() => {})
    return () => { ignore = true }
  }, [user])

  const toggleSave = useCallback(async (item) => {
    const tripId = targetTripId(item)
    if (!tripId) return
    if (!user) {
      showToast(copy.loginToSave)
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
        showToast(copy.unsaved)
      } else {
        const saved = await saveTrip(tripId, item.type === 'record' ? 'RECORD' : 'PLAN')
        setSavedIds((m) => new Map(m).set(tripId, saved.savedTripId))
        setSaveDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) + 1 }))
        showToast(copy.saved)
      }
    } catch (err) {
      const data = err?.response?.data
      showToast(
        err?.response?.status === 401
          ? copy.loginRequired
          : data?.code === 'TRIP_011'
            ? copy.saveErrorOwnPlan
            : data?.message || copy.saveErrorGeneric,
      )
    } finally {
      setPendingIds((s) => { const next = new Set(s); next.delete(tripId); return next })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedIds, pendingIds])

  const openFeedback = useCallback((item) => {
    const tripId = targetTripId(item)
    if (!tripId) return
    const plan = item.type === 'plan' ? item : items.find((i) => i.type === 'plan' && i.id === tripId)
    setFeedbackTarget({ tripId, title: plan?.title ?? item.title, ownerName: (plan ?? item).user?.nickname, ownerId: (plan ?? item).user?.id ?? null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const feedActions = useMemo(
    () => ({ user, savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback }),
    [user, savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback],
  )

  function findPlan(planId) {
    return items.find((i) => i.type === 'plan' && i.id === planId) ?? null
  }

  const filteredItems = useMemo(() => items.filter((i) => i.type === filter), [items, filter])
  // 모바일(<sm)에서는 3열이 카드를 너무 눌러서 1열로 — MyPageSettings의 같은 갤러리와 동일한 분기
  const [columnCount] = useState(() => (window.matchMedia('(min-width: 640px)').matches ? GALLERY_COLUMNS : 1))
  const columns = Array.from({ length: columnCount }, (_, c) => filteredItems.filter((_, i) => i % columnCount === c))

  function renderCard(item) {
    return item.type === 'record' ? (
      <RecordFeedCard key={item.id} item={item} onOpen={setDrawerItem} findPlan={findPlan} />
    ) : (
      <PlanFeedCard key={item.id} item={item} onOpen={setDrawerItem} />
    )
  }

  // 본인 프로필이면 위 이펙트가 /mypage로 보내는 중 — 그 잠깐 동안 남의 프로필 화면이 깜빡 보이지 않게 아무것도 그리지 않는다.
  if (isSelf) return null

  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-900">
      <Navbar />

      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-1 flex-col gap-8 py-12">
        <FeedActionsProvider value={feedActions}>
          {profileError ? (
            <div className="py-20 text-center text-[13px] text-slate-400">{copy.userNotFound}</div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-5">
                {profileLoading ? (
                  <>
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar user={{ name: profile?.name, profileImageUrl: profile?.profileImageUrl }} size={80} />
                    <div>
                      <h1 className={`text-[24px] font-extrabold ${profile?.name ? 'text-slate-900' : 'text-slate-300'}`}>{profile?.name || '—'}</h1>
                      <div className="mt-2 flex items-center gap-4">
                        <span className="text-[16px] text-slate-500">
                          {copy.planLabel} <b className="text-slate-900">{profile?.planCount ?? 0}</b>
                        </span>
                        <span className="text-[16px] text-slate-500">
                          {copy.recordLabel} <b className="text-slate-900">{profile?.recordCount ?? 0}</b>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="self-start">
                <FeedTypeFilter filter={filter} onFilterChange={setFilter} options={PROFILE_FILTERS} />
              </div>

              {feedLoading ? (
                <div className="flex gap-5">
                  {Array.from({ length: columnCount }).map((_, c) => (
                    <div key={c} className="flex min-w-0 flex-1 flex-col gap-5">
                      <Skeleton className="h-56 w-full rounded-2xl" style={{ animationDelay: `${c * 80}ms` }} />
                      <Skeleton className="h-56 w-full rounded-2xl" style={{ animationDelay: `${c * 80 + 120}ms` }} />
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-20 text-center text-[13px] text-slate-400">
                  {filter === 'record' ? copy.emptyRecord : copy.emptyPlan}
                </div>
              ) : (
                <>
                  <div className="flex gap-5">
                    {columns.map((col, c) => (
                      <div key={c} className="flex min-w-0 flex-1 flex-col gap-5">
                        {col.map(renderCard)}
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <div ref={sentinelRef} className="flex h-10 items-center justify-center">
                      {loadingMore && <Icon icon="mdi:loading" width={18} className="animate-spin text-slate-300" />}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <FeedDetailDrawer item={drawerItem} items={items} onClose={() => setDrawerItem(null)} onSavePlan={toggleSave} />

          <FeedbackDrawer
            target={feedbackTarget}
            onClose={() => setFeedbackTarget(null)}
            onPosted={(tripId) => setFeedbackDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) + 1 }))}
            onDeleted={(tripId) => setFeedbackDelta((d) => ({ ...d, [tripId]: (d[tripId] ?? 0) - 1 }))}
          />
        </FeedActionsProvider>
      </Section>

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
