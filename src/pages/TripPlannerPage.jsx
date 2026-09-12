import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import Section from '../components/ui/Section'
import TripHeader from '../components/tripPlanner/TripHeader'
import TripCreateModal from '../components/tripPlanner/TripCreateModal'
import DayColumn from '../components/tripPlanner/DayColumn'
import TripCartPanel from '../components/tripPlanner/TripCartPanel'
import TripCartFloatingButton from '../components/tripPlanner/TripCartFloatingButton'
import TripMapView from '../components/tripPlanner/TripMapView'
import EmptyTripState from '../components/tripPlanner/EmptyTripState'
import SaveStatusIndicator from '../components/tripPlanner/SaveStatusIndicator'
import {
  addTripItem,
  createTrip,
  deleteTrip,
  deleteTripItem,
  getMyTrips,
  getTripDetail,
  moveTripItem,
  publishTrip,
  reorderTripItems,
  unpublishTrip,
  updateTrip,
  updateTripItem,
} from '../api/trip'
import {
  deleteItem,
  diffChangedTimes,
  insertCartItemIntoDay,
  moveItemToDay,
  replaceItemId,
  reorderWithinDay,
  togglePublished,
  updateItemMemo,
  updateItemTime,
  updateTripTitle,
} from '../lib/tripMutations'

// 13인치(1440px 기준) 화면에서 보이는 좌우 여백을 그대로 최댓값으로 고정한다 — 그보다 큰 화면에서는 여백이
// 계속 커지는 대신 헤더/Day 영역의 폭 자체가 늘어난다. 566 = (헤더 콘텐츠 폭 1180px - 좌우 패딩 24px*2)/2.
const SIDE_PADDING = 'clamp(1.5rem, calc(50vw - 566px), 9.625rem)'
// Day 박스의 최대 폭 = 헤더의 콘텐츠 폭과 항상 같다 — 카트가 닫혀 있어도 day 우측이 헤더(제목/토글)의
// 우측 경계를 넘지 않게 하기 위함.
const DAY_BOX_MAX_WIDTH = `calc(100vw - 2 * (${SIDE_PADDING}))`

// 마지막으로 보고 있던 계획을 기억해뒀다가 다음 진입 시 그대로 열어준다.
const LAST_TRIP_ID_KEY = 'tripPlanner:lastActiveTripId'

// 여행 계획 짜기 페이지 — 목록 페이지 없이 이 화면 하나가 편집기 역할을 겸한다.
// 계획 생성/목록·제목·기간·Day 일정·메모·게시 여부는 실 API(/api/trips)로 저장되고, 화면엔 낙관적으로 즉시 반영한다.
// 지도 탭은 아직 미구현이다.
export default function TripPlannerPage() {
  const [tripSummaries, setTripSummaries] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [activeTripId, setActiveTripId] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [detailError, setDetailError] = useState(false)
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [cartOpen, setCartOpen] = useState(true)
  const [cartMounted, setCartMounted] = useState(true)
  const cartCloseTimer = useRef(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [view, setView] = useState('list')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const pendingSaves = useRef(0)
  const saveResetTimer = useRef(null)
  const dayScrollRef = useRef(null)
  const dayDragState = useRef({ dragging: false, startX: 0, startScrollLeft: 0, moved: false, justDragged: false })

  // 처음 진입 시 내 계획 목록만 먼저 불러오고, 마지막으로 보던 계획이 있으면 그걸(없거나 삭제됐으면 가장
  // 최근 계획을) 활성 계획으로 잡는다.
  useEffect(() => {
    getMyTrips()
      .then((list) => {
        setTripSummaries(list)
        const lastId = localStorage.getItem(LAST_TRIP_ID_KEY)
        const lastStillExists = list.some((t) => t.id === lastId)
        setActiveTripId(lastStillExists ? lastId : (list[0]?.id ?? null))
      })
      .catch(() => setTripSummaries([]))
      .finally(() => setLoadingTrips(false))
  }, [])

  // 계획을 전환/생성할 때마다 마지막으로 본 계획을 기억해둔다. 로딩 중(activeTripId=null)엔 아무것도 하지
  // 않는다 — 여기서 지워버리면, 초기 목록을 아직 못 받아온 사이에 저장해둔 값이 사라져 버린다.
  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem(LAST_TRIP_ID_KEY, activeTripId)
    }
  }, [activeTripId])

  // 활성 계획이 바뀔 때마다 Day/일정까지 포함된 상세를 새로 받아온다.
  // 실패하면(네트워크 오류 등) 무한 로딩으로 멈추는 대신 에러 상태를 보여주고 재시도할 수 있게 한다.
  useEffect(() => {
    if (!activeTripId) {
      setActiveTrip(null)
      setDetailError(false)
      return
    }
    let cancelled = false
    setDetailError(false)
    getTripDetail(activeTripId)
      .then((detail) => {
        if (!cancelled) setActiveTrip(detail)
      })
      .catch(() => {
        if (!cancelled) setDetailError(true)
      })
    return () => {
      cancelled = true
    }
  }, [activeTripId, detailReloadKey])

  useEffect(() => {
    if (activeTrip && !activeTrip.days.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(activeTrip.days[0]?.id ?? null)
    }
  }, [activeTrip, selectedDayId])

  useEffect(() => () => clearTimeout(cartCloseTimer.current), [])

  useEffect(
    () => () => {
      window.removeEventListener('mousemove', handleDayScrollMouseMove)
      window.removeEventListener('mouseup', handleDayScrollMouseUp)
      document.body.style.cursor = ''
    },
    [],
  )

  // 저장이 아직 안 끝난 채로 창을 닫거나 새로고침하면 경고
  useEffect(() => {
    function onBeforeUnload(e) {
      if (pendingSaves.current > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  async function withRetry(fn, attempts = 3, delayMs = 700) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (err) {
        if (i === attempts - 1) throw err
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)))
      }
    }
    return undefined
  }

  // 화면엔 이미 반영된 변경을 서버에 저장한다 — 실패하면 몇 번 재시도하고, 그래도 안 되면 onError(보통 롤백)를
  // 부르고 좌하단에 실패를 잠깐 보여준다. 성공/실패 모두 저장 표시는 잠깐 뒤 사라진다.
  function runSync(taskFn, { onError } = {}) {
    clearTimeout(saveResetTimer.current)
    pendingSaves.current += 1
    setSaveStatus('saving')
    const startedAt = Date.now()
    const MIN_SAVING_MS = 500 // 바로 저장되더라도 "저장 중" 스피너가 최소 이만큼은 보이게

    withRetry(taskFn)
      .then(() => 'saved')
      .catch((err) => {
        onError?.(err)
        return 'error'
      })
      .then((status) => {
        pendingSaves.current -= 1
        const remaining = MIN_SAVING_MS - (Date.now() - startedAt)
        setTimeout(
          () => {
            setSaveStatus(status)
            saveResetTimer.current = setTimeout(() => setSaveStatus('idle'), 1800)
          },
          Math.max(0, remaining),
        )
      })
  }

  // FloatingCart의 팝업 패널과 완전히 동일한 전환(origin-bottom-right, scale+fade, 200ms) —
  // 닫을 때는 그 트랜지션이 끝난 뒤에야 실제로 언마운트한다.
  function openCart() {
    clearTimeout(cartCloseTimer.current)
    setCartMounted(true)
    setCartOpen(true)
  }

  function closeCart() {
    setCartOpen(false)
    cartCloseTimer.current = setTimeout(() => setCartMounted(false), 200)
  }

  // Day 헤더(날짜 부분)를 잡고 좌우로 끌면 그대로 가로 스크롤되게 한다 — 클릭(Day 선택)과 구분하기 위해
  // 일정 거리 이상 움직였을 때만 "드래그였다"로 치고, 그 직후의 클릭 이벤트는 캡처 단계에서 막는다.
  function handleDayScrollMouseDown(e) {
    if (!e.target.closest('[data-day-drag-handle]')) return
    const container = dayScrollRef.current
    if (!container) return
    dayDragState.current = { dragging: true, startX: e.clientX, startScrollLeft: container.scrollLeft, moved: false, justDragged: false }
    document.body.style.cursor = 'grabbing'
    window.addEventListener('mousemove', handleDayScrollMouseMove)
    window.addEventListener('mouseup', handleDayScrollMouseUp)
  }

  function handleDayScrollMouseMove(e) {
    const state = dayDragState.current
    const container = dayScrollRef.current
    if (!state.dragging || !container) return
    const dx = e.clientX - state.startX
    if (Math.abs(dx) > 4) state.moved = true
    container.scrollLeft = state.startScrollLeft - dx
  }

  function handleDayScrollMouseUp() {
    window.removeEventListener('mousemove', handleDayScrollMouseMove)
    window.removeEventListener('mouseup', handleDayScrollMouseUp)
    document.body.style.cursor = ''
    dayDragState.current.dragging = false
    dayDragState.current.justDragged = dayDragState.current.moved
  }

  // 드래그로 끌고 난 직후엔 그 클릭이 버튼의 onSelect(Day 선택)까지 이어지지 않게 캡처 단계에서 끊는다.
  function handleDayScrollClickCapture(e) {
    if (dayDragState.current.justDragged) {
      e.stopPropagation()
      dayDragState.current.justDragged = false
    }
  }

  async function handleCreate(title, startDate, endDate) {
    const summary = await createTrip(title, startDate, endDate)
    setTripSummaries((prev) => [summary, ...prev])
    setActiveTripId(summary.id)
    setCreateModalOpen(false)
  }

  function handleDeleteTrip(tripId) {
    const snapshotSummaries = tripSummaries
    const snapshotActiveId = activeTripId
    const snapshotActiveTrip = activeTrip
    const remaining = tripSummaries.filter((t) => t.id !== tripId)
    setTripSummaries(remaining)
    if (tripId === activeTripId) {
      setActiveTripId(remaining[0]?.id ?? null)
    }
    runSync(() => deleteTrip(tripId), {
      onError: () => {
        setTripSummaries(snapshotSummaries)
        setActiveTripId(snapshotActiveId)
        setActiveTrip(snapshotActiveTrip)
      },
    })
  }

  function handlePublishToggle() {
    const willPublish = !activeTrip.published
    const snapshot = activeTrip
    const tripId = activeTrip.id
    setActiveTrip((t) => togglePublished(t))
    setTripSummaries((prev) => prev.map((t) => (t.id === tripId ? { ...t, published: willPublish } : t)))
    showToast(willPublish ? '게시했어요! 여행자 피드에서 확인할 수 있어요.' : '비공개로 전환했어요.')
    runSync(() => (willPublish ? publishTrip(tripId) : unpublishTrip(tripId)), {
      onError: () => {
        setActiveTrip(snapshot)
        setTripSummaries((prev) => prev.map((t) => (t.id === tripId ? { ...t, published: !willPublish } : t)))
      },
    })
  }

  function handleUpdateTitle(title) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    const next = updateTripTitle(activeTrip, title)
    setActiveTrip(next)
    setTripSummaries((prev) => prev.map((t) => (t.id === tripId ? { ...t, title } : t)))
    runSync(() => updateTrip(tripId, title, activeTrip.startDate, activeTrip.endDate), {
      onError: () => {
        setActiveTrip(snapshot)
        setTripSummaries((prev) => prev.map((t) => (t.id === tripId ? { ...t, title: snapshot.title } : t)))
      },
    })
  }

  // 기간을 바꾸면 서버가 기존 Day/일정을 전부 새로 만들기 때문에(진짜 id가 필요) 미리 낙관적으로 반영하지
  // 않고, 저장이 끝난 뒤 상세를 다시 받아와 그대로 반영한다.
  function handleUpdateDates(startDate, endDate) {
    const tripId = activeTrip.id
    const title = activeTrip.title
    runSync(
      () =>
        updateTrip(tripId, title, startDate, endDate)
          .then(() => getTripDetail(tripId))
          .then((detail) => {
            setActiveTrip(detail)
            setTripSummaries((prev) => prev.map((t) => (t.id === tripId ? { ...t, startDate, endDate } : t)))
          }),
    )
  }

  function handleAddCartItem(dayId, cartItem, index) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    const tempId = crypto.randomUUID()
    const beforeDay = activeTrip.days.find((d) => d.id === dayId)
    const appendedAtEnd = index >= beforeDay.items.length
    const { trip: next, item: newItem } = insertCartItemIntoDay(activeTrip, dayId, cartItem, index, tempId)
    setActiveTrip(next)
    setSelectedDayId(dayId)

    runSync(
      async () => {
        const created = await addTripItem(tripId, dayId, cartItem.id, newItem.startTime, newItem.endTime)
        // 서버 응답으로 통째로 덮어쓰지 않고 id만 교체한다 — 응답(TripItemResponse)엔 카테고리 정보가 없어서
        // 그대로 덮어쓰면 방금 붙은 카테고리 아이콘 색이 사라진다. 순서는 어차피 우리가 정해서 보낸 값 그대로다.
        setActiveTrip((t) => replaceItemId(t, dayId, tempId, created.id))
        if (!appendedAtEnd) {
          const day = next.days.find((d) => d.id === dayId)
          const orderedIds = day.items.map((i) => (i.id === tempId ? created.id : i.id))
          await reorderTripItems(tripId, dayId, orderedIds)
        }
      },
      { onError: () => setActiveTrip(snapshot) },
    )
  }

  function handleReorderItem(dayId, itemId, index) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    const prevDay = activeTrip.days.find((d) => d.id === dayId)
    const next = reorderWithinDay(activeTrip, dayId, itemId, index)
    setActiveTrip(next)
    setSelectedDayId(dayId)

    const nextDay = next.days.find((d) => d.id === dayId)
    const orderedIds = nextDay.items.map((i) => i.id)
    const changedTimes = diffChangedTimes(prevDay, nextDay)

    runSync(
      async () => {
        await reorderTripItems(tripId, dayId, orderedIds)
        // 서버는 순서(orderIndex)만 바꾸고 시간은 그대로 두므로, 로컬에서 재계산한 시간은 별도로 저장해야 한다.
        await Promise.all(
          changedTimes.map(({ item }) => updateTripItem(tripId, dayId, item.id, item.startTime, item.endTime, item.memo)),
        )
      },
      { onError: () => setActiveTrip(snapshot) },
    )
  }

  function handleMoveItem(fromDayId, toDayId, itemId, index) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    const prevFromDay = activeTrip.days.find((d) => d.id === fromDayId)
    const prevToDay = activeTrip.days.find((d) => d.id === toDayId)
    const next = moveItemToDay(activeTrip, fromDayId, toDayId, itemId, index)
    setActiveTrip(next)
    setSelectedDayId(toDayId)

    const nextFromDay = next.days.find((d) => d.id === fromDayId)
    const nextToDay = next.days.find((d) => d.id === toDayId)
    const movedItem = nextToDay.items.find((i) => i.id === itemId)
    const newOrderIndex = nextToDay.items.findIndex((i) => i.id === itemId)
    // 이동한 항목 자신은 다른 날에서 왔으니 diff로는 안 잡힌다 — 시간은 항상 별도로 저장해준다.
    const changedTimes = [
      ...diffChangedTimes(prevFromDay, nextFromDay),
      ...diffChangedTimes(prevToDay, nextToDay),
      { item: movedItem, dayId: toDayId },
    ]

    runSync(
      async () => {
        await moveTripItem(tripId, itemId, toDayId, newOrderIndex)
        await Promise.all(
          changedTimes.map(({ item, dayId }) => updateTripItem(tripId, dayId, item.id, item.startTime, item.endTime, item.memo)),
        )
      },
      { onError: () => setActiveTrip(snapshot) },
    )
  }

  function handleSaveTime(dayId, itemId, time) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    const memo = activeTrip.days.find((d) => d.id === dayId)?.items.find((i) => i.id === itemId)?.memo
    const next = updateItemTime(activeTrip, dayId, itemId, time)
    setActiveTrip(next)
    setSelectedDayId(dayId)
    runSync(() => updateTripItem(tripId, dayId, itemId, time.startTime, time.endTime, memo), {
      onError: () => setActiveTrip(snapshot),
    })
  }

  function handleSaveMemo(dayId, itemId, memo) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    const item = activeTrip.days.find((d) => d.id === dayId)?.items.find((i) => i.id === itemId)
    const next = updateItemMemo(activeTrip, dayId, itemId, memo)
    setActiveTrip(next)
    setSelectedDayId(dayId)
    runSync(() => updateTripItem(tripId, dayId, itemId, item.startTime, item.endTime, memo), {
      onError: () => setActiveTrip(snapshot),
    })
  }

  function handleDeleteItem(dayId, itemId) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    const next = deleteItem(activeTrip, dayId, itemId)
    setActiveTrip(next)
    setSelectedDayId(dayId)
    runSync(() => deleteTripItem(tripId, dayId, itemId), { onError: () => setActiveTrip(snapshot) })
  }

  const showEmpty = !loadingTrips && tripSummaries.length === 0
  const showDetailLoading = activeTripId && !activeTrip && !detailError

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Navbar />

      {activeTrip ? (
        // sticky는 자기 "부모"의 박스 높이만큼만 붙어있을 수 있다 — 예전엔 이 헤더가 Section 하나만 감싸고 있어서
        // Section 높이 = 헤더 높이라 붙어있을 여유가 사실상 없었다(그래서 스크롤하면 카트와 어긋나 보였음).
        // Day+카트도 함께 담고 있는 페이지 루트를 부모로 삼도록 Section 밖으로 빼고, 1180px 정렬만 안쪽에서 그대로 재현한다.
        <div className="sticky top-16 z-30 bg-white pb-5 pt-2.5">
          <div style={{ paddingLeft: SIDE_PADDING, paddingRight: SIDE_PADDING }}>
            <TripHeader
              trip={activeTrip}
              trips={tripSummaries}
              view={view}
              onChangeView={setView}
              onSelectTrip={setActiveTripId}
              onCreateNew={() => setCreateModalOpen(true)}
              onUpdateTitle={handleUpdateTitle}
              onUpdateDates={handleUpdateDates}
              onTogglePublish={handlePublishToggle}
              onDeleteTrip={handleDeleteTrip}
            />
          </div>
        </div>
      ) : detailError ? (
        <Section as="main" className="flex flex-col gap-5 pb-5">
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <Icon icon="solar:danger-triangle-bold" width={26} className="text-rose-300" />
            <p className="text-[13px] text-slate-400">계획을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => setDetailReloadKey((k) => k + 1)}
              className="rounded-full bg-brand-light px-4 py-1.5 text-[12.5px] font-bold text-brand hover:bg-brand-light/70"
            >
              다시 시도
            </button>
          </div>
        </Section>
      ) : (
        !showDetailLoading && (
          <Section as="main" className="flex flex-col gap-5 pb-5">
            {showEmpty ? (
              <EmptyTripState onCreate={() => setCreateModalOpen(true)} />
            ) : (
              !loadingTrips && (
                <div className="flex flex-col items-center gap-2 py-24 text-center">
                  <Icon icon="mdi:loading" width={22} className="animate-spin text-slate-300" />
                  <p className="text-[13px] text-slate-400">불러오는 중이에요...</p>
                </div>
              )
            )}
          </Section>
        )
      )}

      {/* 헤더는 다른 페이지처럼 1180px로 맞추되, Day+장바구니 영역만 따로 빼서 창 폭 전체(좌우 여백만 유지)를
          쓰게 한다 — 그래야 장바구니가 진짜 창 우측 끝에 붙고 Day 박스가 남는 폭을 최대로 쓸 수 있다. */}
      {activeTrip && (
        // 좌측은 Section(max-w-1180px mx-auto px-6)과 똑같은 계산식으로 맞추고, 우측만 고정 24px로 열어둬서
        // 창이 넓어질수록 Day 박스만 그만큼 넓어지고 왼쪽 시작점은 헤더의 제목과 항상 일치한다.
        <div className="pb-8" style={{ paddingLeft: SIDE_PADDING, paddingRight: '1.5rem' }}>
          <div className="flex items-start gap-2">
            {/* DAY_BOX_MAX_WIDTH = 헤더 콘텐츠 폭과 동일 — 카트가 닫혀 폭이 남아돌아도 day 우측이 헤더
                (제목/리스트·지도 토글)의 우측 경계를 넘지 않는다. transition으로 카트 열림/닫힘에 따른
                폭 변화가 순간 스냅되지 않고 부드럽게 이어지게 한다. */}
            {view === 'list' ? (
              <div
                ref={dayScrollRef}
                onMouseDown={handleDayScrollMouseDown}
                onClickCapture={handleDayScrollClickCapture}
                className="flex min-w-0 flex-1 gap-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300"
                style={{ maxWidth: DAY_BOX_MAX_WIDTH }}
              >
                {activeTrip.days.map((day) => (
                  <DayColumn
                    key={day.id}
                    day={day}
                    selected={day.id === selectedDayId}
                    onSelect={() => setSelectedDayId(day.id)}
                    onAddCartItem={handleAddCartItem}
                    onReorderItem={handleReorderItem}
                    onMoveItem={handleMoveItem}
                    onSaveTime={handleSaveTime}
                    onSaveMemo={handleSaveMemo}
                    onDeleteItem={handleDeleteItem}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex min-h-[720px] min-w-0 flex-1 gap-3 rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300"
                style={{ maxWidth: DAY_BOX_MAX_WIDTH }}
              >
                <TripMapView
                  trip={activeTrip}
                  selectedDayId={selectedDayId}
                  onSelectDay={setSelectedDayId}
                  onAddCartItem={handleAddCartItem}
                  onReorderItem={handleReorderItem}
                  onMoveItem={handleMoveItem}
                  onSaveTime={handleSaveTime}
                  onSaveMemo={handleSaveMemo}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            )}

            {cartMounted && (
              <div
                className={`sticky top-[135px] self-start origin-bottom-right ${
                  cartOpen ? 'animate-cart-pop-in' : 'pointer-events-none scale-90 opacity-0 transition-all duration-200'
                }`}
              >
                <TripCartPanel onToggle={closeCart} />
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
      <ChatbotWidget />
      {activeTrip && !cartMounted && <TripCartFloatingButton onOpen={openCart} />}

      {createModalOpen && (
        <TripCreateModal
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-popup">
          {toast}
        </div>
      )}

      <SaveStatusIndicator status={saveStatus} />
    </div>
  )
}
