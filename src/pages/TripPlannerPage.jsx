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
  // 모바일에서는 장바구니가 화면 전체를 덮기 때문에 기본으로 닫아 두고, 데스크톱은 기존처럼 항상 열어 둔다.
  const [cartOpen, setCartOpen] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  const [cartMounted, setCartMounted] = useState(() => window.matchMedia('(min-width: 640px)').matches)
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

  // 데스크톱에서 장바구니를 열어둔 채로 창 폭을 모바일 크기로 줄이면, 그대로 두면 전체화면 장바구니가
  // 갑자기 뒤덮은 채로 남는다 — 모바일 폭으로 넘어가는 순간 자동으로 닫는다.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    function handleChange(e) {
      if (!e.matches) closeCart()
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

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
        // 4xx는 규칙 위반(공개 조건 등)이라 다시 보내도 결과가 같다 — 바로 실패 처리
        const status = err?.response?.status
        if (i === attempts - 1 || (status >= 400 && status < 500)) throw err
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
        // 백엔드 규칙 위반(TRIP_022 공개 조건, TRIP_023 공개 계획 보호, TRIP_024 공개 중 날짜 변경 등)은
        // 서버 message에 어떤 일차가 문제인지까지 담겨 오므로 그대로 보여준다
        const status = err?.response?.status
        const message = err?.response?.data?.message
        if (status >= 400 && status < 500 && message) showToast(message)
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
    if (cartMounted) {
      setCartOpen(true)
      return
    }
    // 마운트가 안 된 상태(모바일 기본값)에서 마운트와 열림을 같은 프레임에 함께 켜면 처음 그려질 때부터
    // 이미 "열린" 모습이라 챗봇/장바구니 위젯과 달리 슬라이드·페이드 전환이 재생되지 않는다 — 닫힌 모습으로
    // 한 프레임 먼저 그려지게 한 뒤 다음 프레임에 열림 상태로 바꿔 애니메이션이 실제로 보이게 한다.
    setCartMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setCartOpen(true)))
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

  // 전체공개 조건(백엔드 TRIP_022): 모든 일차에 일정이 1개 이상. 미리 계산해 토글과 안내에 쓴다
  const emptyDays = activeTrip ? activeTrip.days.filter((d) => d.items.length === 0).map((d) => d.dayNumber) : []
  const selectedDay = activeTrip?.days.find((d) => d.id === selectedDayId) ?? null
  const selectedDayIndex = activeTrip?.days.findIndex((d) => d.id === selectedDayId) ?? -1

  // 모바일에서는 Day를 옆으로 스크롤하는 대신 이 버튼으로 한 번에 하루씩 이동한다.
  function goToAdjacentDay(offset) {
    if (!activeTrip) return
    const nextIndex = selectedDayIndex + offset
    if (nextIndex < 0 || nextIndex >= activeTrip.days.length) return
    setSelectedDayId(activeTrip.days[nextIndex].id)
  }

  function handlePublishToggle() {
    const willPublish = !activeTrip.published
    if (willPublish && emptyDays.length > 0) {
      showToast(`모든 일차에 일정이 1개 이상 있어야 전체공개할 수 있어요. 비어 있는 일차: ${emptyDays.map((n) => `Day ${n}`).join(', ')}`)
      return
    }
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
    // 공개 중엔 날짜 변경 불가(백엔드 TRIP_024) — 날짜를 바꾸면 일정이 전부 초기화돼 공개 조건이 깨진다
    if (activeTrip.published) {
      showToast('공개 중인 계획은 날짜를 바꿀 수 없어요. 나만 보기로 전환한 뒤 바꿔주세요.')
      return
    }
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

  // 모바일에선 드래그가 안 먹혀서(터치엔 HTML5 드래그가 안 붙는다) 대신 이걸 쓴다 — Day의
  // "장소 추가" 버튼을 누르면 그 Day를 선택 상태로 만들고 장바구니를 여는데, 이 상태에서
  // 장바구니 항목을 누르면 지금 선택된 Day 맨 끝에 그대로 추가된다.
  function openCartToAddInto(dayId) {
    setSelectedDayId(dayId)
    openCart()
  }

  function handleCartItemTap(cartItem) {
    if (!selectedDay) return
    // 모바일에선 장바구니가 화면 전체를 덮어 그 뒤 Day가 안 보이니, 추가됐다는 걸 토스트로 바로 알려준다
    // (데스크톱은 사이드바 옆에서 바로 눈에 보이지만, 조용히 담기면 모바일에선 됐는지 안 됐는지 알 수 없었음).
    showToast(`${cartItem.title}을(를) Day ${selectedDay.dayNumber}에 추가했어요`)
    handleAddCartItem(selectedDay.id, cartItem, selectedDay.items.length)
    // 모바일 전체화면 장바구니는 담자마자 바로 닫아서 방금 추가된 결과(Day)가 바로 보이게 한다.
    // 데스크톱은 사이드바라 열어둔 채로 계속 담을 수 있게 그대로 둔다.
    if (!window.matchMedia('(min-width: 640px)').matches) closeCart()
  }

  function handleAddCartItem(dayId, cartItem, index) {
    const snapshot = activeTrip
    const tripId = activeTrip.id
    // crypto.randomUUID()는 보안 컨텍스트(https 또는 localhost)에서만 존재한다 — 폰에서 LAN IP(http)로
    // 접속하면 이 함수 자체가 없어서 여기서 예외가 나 조용히 추가가 실패했다(토스트는 그 전에 이미 떴었음).
    const tempId = globalThis.crypto?.randomUUID?.() || `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

  // 공개 중인 계획은 어느 날도 비면 안 된다(백엔드 TRIP_023) — 그 날의 마지막 일정을 지우거나 다른 날로 옮기는 걸 막는다
  const PROTECT_MESSAGE = '공개 중인 계획은 각 일차에 일정이 하나 이상 남아 있어야 해요. 나만 보기로 전환하면 자유롭게 지울 수 있어요.'
  function wouldEmptyDay(dayId) {
    const day = activeTrip.days.find((d) => d.id === dayId)
    return activeTrip.published && day && day.items.length <= 1
  }

  function handleMoveItem(fromDayId, toDayId, itemId, index) {
    if (fromDayId !== toDayId && wouldEmptyDay(fromDayId)) {
      showToast(PROTECT_MESSAGE)
      return
    }
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
    if (wouldEmptyDay(dayId)) {
      showToast(PROTECT_MESSAGE)
      return
    }
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
    <div className="flex min-h-screen flex-col bg-surface text-slate-900">
      <Navbar />

      {activeTrip ? (
        // sticky는 자기 "부모"의 박스 높이만큼만 붙어있을 수 있다 — 예전엔 이 헤더가 Section 하나만 감싸고 있어서
        // Section 높이 = 헤더 높이라 붙어있을 여유가 사실상 없었다(그래서 스크롤하면 카트와 어긋나 보였음).
        // Day+카트도 함께 담고 있는 페이지 루트를 부모로 삼도록 Section 밖으로 빼고, 1180px 정렬만 안쪽에서 그대로 재현한다.
        // 모바일에서는 제목 영역이 스티키로 붙으면 자리를 너무 많이 차지해서, sm 이상에서만 스티키로 둔다.
        <div className="z-30 bg-surface pb-5 pt-2.5 sm:sticky sm:top-16">
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
              publishBlockedDays={emptyDays}
              onDeleteTrip={handleDeleteTrip}
            />
          </div>
        </div>
      ) : detailError ? (
        <Section as="main" className="flex flex-col gap-5 pt-8 pb-5">
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
          <Section as="main" className="flex flex-col gap-5 pt-8 pb-5">
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
              <div className="flex min-w-0 flex-1 flex-col gap-2" style={{ maxWidth: DAY_BOX_MAX_WIDTH }}>
                {/* 모바일에서는 Day를 옆으로 스크롤하는 대신, 항상 보이는 이전/다음 버튼으로 한 번에
                    하루씩만 보여준다 — sm 이상에서는 이 바를 숨기고 기존 가로 스크롤 방식 그대로 쓴다. */}
                <div className="flex items-center justify-between gap-2 sm:hidden">
                  <button
                    type="button"
                    onClick={() => goToAdjacentDay(-1)}
                    disabled={selectedDayIndex <= 0}
                    className="flex items-center gap-1 rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors disabled:opacity-30"
                  >
                    <Icon icon="solar:alt-arrow-left-linear" width={14} />
                    이전 날
                  </button>
                  <span className="text-[13px] font-extrabold text-slate-700">
                    {selectedDay ? `Day ${selectedDay.dayNumber}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToAdjacentDay(1)}
                    disabled={selectedDayIndex === -1 || selectedDayIndex >= activeTrip.days.length - 1}
                    className="flex items-center gap-1 rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors disabled:opacity-30"
                  >
                    다음 날
                    <Icon icon="solar:alt-arrow-right-linear" width={14} />
                  </button>
                </div>

                <div
                  ref={dayScrollRef}
                  onMouseDown={handleDayScrollMouseDown}
                  onClickCapture={handleDayScrollClickCapture}
                  className="flex gap-3 rounded-2xl border border-slate-200 bg-surface p-6 transition-all duration-300 sm:overflow-x-auto"
                >
                  {activeTrip.days.map((day) => (
                    // 모바일에서는 선택된 Day만 남기고 나머지는 display:none — contents로 감싸서 sm 이상에서는
                    // 이 wrapper 자체가 레이아웃에서 사라지고 DayColumn이 그대로 가로 스크롤 행의 항목이 된다.
                    <div key={day.id} className={day.id === selectedDayId ? 'contents' : 'hidden sm:contents'}>
                      <DayColumn
                        day={day}
                        selected={day.id === selectedDayId}
                        onSelect={() => setSelectedDayId(day.id)}
                        onAddCartItem={handleAddCartItem}
                        onOpenCart={() => openCartToAddInto(day.id)}
                        onReorderItem={handleReorderItem}
                        onMoveItem={handleMoveItem}
                        onSaveTime={handleSaveTime}
                        onSaveMemo={handleSaveMemo}
                        onDeleteItem={handleDeleteItem}
                        deleteLocked={activeTrip.published && day.items.length <= 1}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                // 모바일에서는 지도가 위, Day 목록이 그 아래로 세로 배치 — sm 이상에서는 기존처럼 좌우로 나란히 놓인다.
                className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-slate-200 bg-surface p-6 transition-all duration-300 sm:min-h-[720px] sm:flex-row"
                style={{ maxWidth: DAY_BOX_MAX_WIDTH }}
              >
                <TripMapView
                  trip={activeTrip}
                  selectedDayId={selectedDayId}
                  onSelectDay={setSelectedDayId}
                  onAddCartItem={handleAddCartItem}
                  onOpenCart={() => openCartToAddInto(selectedDayId)}
                  onReorderItem={handleReorderItem}
                  onMoveItem={handleMoveItem}
                  onSaveTime={handleSaveTime}
                  onSaveMemo={handleSaveMemo}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            )}

            {cartMounted && (
              // 모바일에서는 챗봇/장바구니 위젯과 같은 방식으로 화면 전체를 덮고, sm 이상에서는
              // 기존처럼 헤더 아래 sticky 위치에 고정된 패널로 되돌아온다.
              <div
                className={`fixed inset-0 z-[70] origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:sticky sm:inset-auto sm:top-[135px] sm:z-auto sm:self-start ${
                  cartOpen
                    ? 'translate-y-0 opacity-100 pointer-events-auto sm:animate-cart-pop-in'
                    : 'translate-y-full opacity-0 pointer-events-none sm:translate-y-0 sm:scale-90 sm:transition-all sm:duration-200'
                }`}
              >
                <TripCartPanel onToggle={closeCart} onAddItem={handleCartItemTap} targetDayLabel={selectedDay ? `Day ${activeTrip.days.findIndex((d) => d.id === selectedDay.id) + 1}` : null} />
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
        // 모바일 전체화면 장바구니(z-[70])보다 위에 떠야 담았다는 게 그 위에서도 바로 보인다
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/90 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-popup">
          {toast}
        </div>
      )}

      <SaveStatusIndicator status={saveStatus} />
    </div>
  )
}
