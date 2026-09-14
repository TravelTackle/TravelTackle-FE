import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar, { Avatar } from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Skeleton from '../components/ui/Skeleton'
import { FeedTypeFilter, FILTERS } from '../components/travelerFeed/FeedFilterBar'
import PlanFeedCard from '../components/travelerFeed/PlanFeedCard'
import RecordFeedCard from '../components/travelerFeed/RecordFeedCard'
import FeedDetailDrawer from '../components/travelerFeed/FeedDetailDrawer'
import FeedbackDrawer from '../components/travelerFeed/FeedbackDrawer'
import { FeedActionsProvider, targetTripId } from '../components/travelerFeed/FeedActionsContext'
import { useAuth } from '../context/AuthContext'
import { getMyTrips, getTripDetail } from '../api/trip'
import { getTripRecord } from '../api/record'
import { getReceivedFeedback } from '../api/feed'
import { adaptPlanDetail, adaptRecordDetail } from '../data/feedAdapter'

const GALLERY_COLUMNS = 3

function buildFeedbackMap(list) {
  return new Map((list || []).map((f) => [f.tripId, f.totalFeedbackCount]))
}

// 내 것만 관리하는 페이지라 여행자 피드의 "전체"는 빼고 계획/기록 두 개만 둔다.
const PROFILE_FILTERS = FILTERS.filter((f) => f.value !== 'all')

// 새 프로필 탭 — 맨 위 큰 프로필(좌측 정렬) + 계획/기록 개수, 여행자 피드와 같은 계획/기록 토글
// (전체는 제외), 그 아래는 나의 여행 보관함(SavedTripsPage)과 완전히 같은 PlanFeedCard/RecordFeedCard를
// 3열로 그대로 배치한다 — 새 카드 UI를 따로 만들지 않는다.
function MyProfileGallery({ user, authLoading, planItems, recordItems, loading, filter, onFilterChange, onOpenSettings, onOpenCard }) {
  const items = filter === 'plan' ? planItems : recordItems
  const columns = Array.from({ length: GALLERY_COLUMNS }, (_, c) => items.filter((_, i) => i % GALLERY_COLUMNS === c))

  function findPlan(planId) {
    return planItems.find((p) => p.id === planId) ?? null
  }

  function renderCard(item) {
    return item.type === 'record' ? (
      <RecordFeedCard key={item.id} item={item} onOpen={onOpenCard} findPlan={findPlan} />
    ) : (
      <PlanFeedCard key={item.id} item={item} onOpen={onOpenCard} />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          {authLoading ? (
            <>
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </>
          ) : (
            <>
              <Avatar user={user} size={80} />
              <div>
                {/* 목업 더미 텍스트("nickname") 대신 값이 없을 때만 옅은 회색 대시로 — 실사용자에게 가짜 이름처럼 보이지 않게 */}
                <h1 className={`text-[24px] font-extrabold ${user?.name ? 'text-slate-900' : 'text-slate-300'}`}>{user?.name || '—'}</h1>
                {/* 개수 텍스트는 기본 13px 대비 20% 키운 16px, "계획 4 · 기록 3"처럼 라벨 다음에 숫자가 오는 순서 */}
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-[16px] text-slate-500">
                    계획 <b className="text-slate-900">{loading ? '-' : planItems.length}</b>
                  </span>
                  <span className="text-[16px] text-slate-500">
                    기록 <b className="text-slate-900">{loading ? '-' : recordItems.length}</b>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 아이콘만 있던 예전 버튼은 존재감이 약해 잘 안 눌려서, 다른 곳의 보조 버튼("변경" 등)과 같은
            slate-100 배경으로 존재감을 주되 텍스트 라벨 없이 아이콘만 남긴다 */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="설정"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
        >
          <Icon icon="solar:settings-linear" width={18} />
        </button>
      </div>

      {/* 여행자 피드 상단과 같은 토글이지만 "전체"는 빼고 계획/기록만 — 자기 것만 관리하는
          페이지라 섞어 보는 목록은 필요 없다. self-start로 감싸 버튼이 있는 만큼만 회색 배경을
          차지하게 한다(감싸지 않으면 flex-col의 stretch로 가로 전체를 차지해버린다) */}
      <div className="self-start">
        <FeedTypeFilter filter={filter} onFilterChange={onFilterChange} options={PROFILE_FILTERS} />
      </div>

      {loading ? (
        <div className="flex gap-5">
          {Array.from({ length: GALLERY_COLUMNS }).map((_, c) => (
            <div key={c} className="flex min-w-0 flex-1 flex-col gap-5">
              <Skeleton className="h-56 w-full rounded-2xl" style={{ animationDelay: `${c * 80}ms` }} />
              <Skeleton className="h-56 w-full rounded-2xl" style={{ animationDelay: `${c * 80 + 120}ms` }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-[13px] text-slate-400">
          {filter === 'record' ? '아직 남긴 여행 기록이 없어요.' : '아직 만든 여행 계획이 없어요.'}
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
    </div>
  )
}

export default function MyPageSettings() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  // Navbar 알림에서 ?feedback=<tripId>(참견)나 ?open=<tripId>(스크랩)로 들어오면 그 계획의 사이드바를 바로 연다
  const [searchParams, setSearchParams] = useSearchParams()
  const feedbackTripId = searchParams.get('feedback')
  const openTripId = searchParams.get('open')
  const [feedFilter, setFeedFilter] = useState('plan')
  const [planItems, setPlanItems] = useState([])
  const [recordItems, setRecordItems] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [drawerItem, setDrawerItem] = useState(null)
  const [feedbackTarget, setFeedbackTarget] = useState(null)
  const [feedbackDelta, setFeedbackDelta] = useState({})

  // 계획은 getMyTrips 목록마다 getTripDetail로 Day/장소까지 채우고, 기록은 트립마다
  // GET /trips/{id}/record를 개별 조회해 있는 것만 모은다 — "내 기록 전체 목록"을 한 번에 주는
  // API가 아직 없어 N+1 조회다(내 여행 개수가 많지 않아 감당 가능한 수준). 참견 수는 getReceivedFeedback로 채운다.
  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const [summaries, feedback] = await Promise.all([getMyTrips(), getReceivedFeedback().catch(() => [])])
        const feedbackMap = buildFeedbackMap(feedback)
        const results = await Promise.all(
          summaries.map(async (t) => {
            const [detail, record] = await Promise.all([getTripDetail(t.id).catch(() => null), getTripRecord(t.id).catch(() => null)])
            // saveCount: 백엔드가 TripDetailResponse에 아직 안 내려주면 undefined → null로 떨어져
            // FeedActionBar가 스크랩 수를 안 보여준다(지금과 동일). 필드가 추가되면 별도 수정 없이 뜬다.
            const saveCount = typeof detail?.saveCount === 'number' ? detail.saveCount : null
            const plan = detail
              ? {
                  ...adaptPlanDetail({ ...detail, ownerName: user?.name, ownerProfileImageUrl: user?.profileImageUrl, region: '' }),
                  createdAt: detail.createdAt,
                  feedbackCount: feedbackMap.get(t.id) ?? 0,
                  // 나만보기/전체공개 토글(FeedUserHeader)이 이 값이 있을 때만 보인다 — TripDetailResponse에만 있는 필드.
                  published: detail.published,
                  saveCount,
                }
              : null
            const rec = record
              ? {
                  ...adaptRecordDetail({
                    id: t.id,
                    ownerName: user?.name,
                    region: '',
                    record,
                    feedbackCount: feedbackMap.get(t.id) ?? 0,
                    savedTripId: null,
                  }),
                  // 기록도 같은 계획(트립) 소속이라 스크랩 수는 계획과 동일한 값을 쓴다
                  saveCount,
                }
              : null
            return { plan, rec }
          }),
        )
        if (ignore) return
        setPlanItems(results.map((r) => r.plan).filter(Boolean))
        setRecordItems(results.map((r) => r.rec).filter(Boolean))
        // 방금 받아온 목록엔 이미 최신 참견 수가 들어있다 — 이전 낙관적 델타가 남아있으면 중복 가산된다.
        setFeedbackDelta({})
      } catch {
        if (!ignore) {
          setPlanItems([])
          setRecordItems([])
        }
      } finally {
        if (!ignore) setGalleryLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [user?.name])

  const allItems = useMemo(
    () => [...planItems, ...recordItems].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [planItems, recordItems],
  )

  // 기록에서 열면 참견 대상은 그 기록의 계획(targetTripId) — 제목은 계획 제목을 우선 쓴다
  const openFeedback = useCallback((item) => {
    const tripId = targetTripId(item)
    if (!tripId) return
    const plan = item.type === 'plan' ? item : allItems.find((i) => i.type === 'plan' && i.id === tripId)
    setFeedbackTarget({ tripId, title: plan?.title ?? item.title, ownerName: user?.name, ownerId: user?.userId ?? null })
  }, [allItems, user])

  // 갤러리(계획 목록)가 다 뜬 다음에 대상 계획을 찾아 — 카드를 눌러 상세를 연 것처럼 계획 상세
  // 드로어부터 열고, 그 위에 참견 드로어를 띄운다(상세 안의 참견 버튼을 누른 것과 같은 상태).
  // 주소는 한 번 처리했으면 지운다(안 지우면 새로고침·뒤로가기 때 다시 열림).
  useEffect(() => {
    if (!feedbackTripId || galleryLoading) return
    const target = planItems.find((p) => p.id === feedbackTripId)
    if (!target) return
    setFeedFilter('plan')
    setDrawerItem(target)
    openFeedback(target)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('feedback')
        return next
      },
      { replace: true },
    )
  }, [feedbackTripId, galleryLoading, planItems, openFeedback, setSearchParams])

  // 스크랩 알림 — 참견 드로어 없이 계획 상세 드로어만 연다
  useEffect(() => {
    if (!openTripId || galleryLoading) return
    const target = planItems.find((p) => p.id === openTripId)
    if (!target) return
    setFeedFilter('plan')
    setDrawerItem(target)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('open')
        return next
      },
      { replace: true },
    )
  }, [openTripId, galleryLoading, planItems, setSearchParams])

  // 내 계획/기록이라 스크랩은 의미가 없어(FeedActionBar가 본인 글이면 알아서 막는다) 저장 관련 값은 빈 상태로 둔다.
  const feedActions = useMemo(
    () => ({ user, savedIds: new Map(), pendingIds: new Set(), saveDelta: {}, feedbackDelta, toggleSave: () => {}, openFeedback }),
    [user, feedbackDelta, openFeedback],
  )

  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-900">
      <Navbar />

      {/* 토글 좌우 끝을 Navbar 컨테이너(1200px, px-4 sm:px-6)와 맞춘다 — TourExplorePage와 동일한 패턴 */}
      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-1 flex-col gap-8 py-12">
        <FeedActionsProvider value={feedActions}>
          <MyProfileGallery
            user={user}
            authLoading={authLoading}
            planItems={planItems}
            recordItems={recordItems}
            loading={galleryLoading}
            filter={feedFilter}
            onFilterChange={setFeedFilter}
            onOpenSettings={() => navigate('/mypage/settings')}
            onOpenCard={setDrawerItem}
          />
          {/* fromSaved: 내 계획 상세에서 (남의 계획을 스크랩할 때 쓰는) 스크랩 버튼 대신
              "이 여행의 기록 보기"를 쓰게 한다 — 어차피 hasRecord는 항상 false라 버튼 자체가 안 뜬다.
              onDeleted: 계획을 지우면 백엔드가 그 계획의 기록도 함께 지우므로, 프론트도 같은 planId를
              가진 기록을 목록에서 같이 걷어낸다. */}
          <FeedDetailDrawer
            item={drawerItem}
            items={allItems}
            onClose={() => setDrawerItem(null)}
            fromSaved
            onDeleted={(deleted) => {
              if (deleted.type === 'record') {
                setRecordItems((list) => list.filter((r) => r.id !== deleted.id))
              } else {
                setPlanItems((list) => list.filter((p) => p.id !== deleted.id))
                setRecordItems((list) => list.filter((r) => r.planId !== deleted.id))
              }
            }}
          />

          {/* 내 계획/기록이라 새 참견은 못 남기지만(FeedbackDrawer가 본인 글이면 알아서 막는다),
              받은 참견 목록은 볼 수 있어야 하니 열어준다. */}
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
    </div>
  )
}
