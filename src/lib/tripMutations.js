// 여행 계획(trip) 객체를 다루는 순수 함수 모음 — TripPlannerPage가 낙관적(optimistic) 업데이트를 적용할 때
// 쓴다. 실제 저장은 api/trip.js가 담당하고, 여기 함수들은 화면에 즉시 반영할 "다음 state"만 계산한다.
import { areaName } from './cartThemes'
import { DEFAULT_DAY_START_TIME, addMinutes, durationMinutes, minutesToTime, timeToMinutes } from './tripTime'

function cloneTrip(trip) {
  return { ...trip, days: trip.days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) })) }
}

function reindex(items) {
  items.forEach((item, i) => {
    item.orderIndex = i
  })
  return items
}

function findDay(trip, dayId) {
  return trip.days.find((d) => d.id === dayId)
}

// 드롭 지점 앞뒤 아이템 사이 시간으로 새 아이템을 끼워 넣는다 (기존 아이템 시간은 건드리지 않음)
function fitBetween(items, index, durationMin) {
  const prev = items[index - 1]
  const next = items[index]
  const start = prev ? prev.endTime : DEFAULT_DAY_START_TIME
  const naturalEnd = addMinutes(start, durationMin)
  const end = next ? minutesToTime(Math.min(timeToMinutes(naturalEnd), timeToMinutes(next.startTime))) : naturalEnd
  return { startTime: start, endTime: end }
}

export function updateTripTitle(trip, title) {
  return { ...cloneTrip(trip), title }
}

export function togglePublished(trip) {
  return { ...cloneTrip(trip), published: !trip.published }
}

// id는 호출부가 미리 만들어 넘긴다 — addTripItem API 응답(진짜 id)으로 나중에 이 항목을 찾아 교체해야 해서다.
// 반환값에 새로 만든 item도 함께 담아, 호출부가 그 시각(startTime/endTime)을 그대로 API 요청에 실어 보낼 수 있게 한다.
export function insertCartItemIntoDay(trip, dayId, cartItem, index, id) {
  const next = cloneTrip(trip)
  const day = findDay(next, dayId)
  const { startTime, endTime } = fitBetween(day.items, index, 60)
  const newItem = {
    id,
    cartItemId: cartItem.id,
    cachedTitle: cartItem.title,
    cachedImageUrl: cartItem.imageUrl ?? null,
    contentTypeId: cartItem.contentTypeId ?? null,
    tourApiContentId: cartItem.contentId ?? null,
    address: areaName(cartItem.areaCode),
    memo: '',
    startTime,
    endTime,
  }
  day.items.splice(index, 0, newItem)
  reindex(day.items)
  return { trip: next, item: newItem }
}

export function reorderWithinDay(trip, dayId, itemId, rawIndex) {
  const next = cloneTrip(trip)
  const day = findDay(next, dayId)
  const items = day.items
  const oldIndex = items.findIndex((i) => i.id === itemId)
  if (oldIndex === -1) return trip

  const anchorStart = items[Math.min(oldIndex, rawIndex)].startTime
  const newIndex = rawIndex > oldIndex ? rawIndex - 1 : rawIndex
  if (newIndex === oldIndex) return trip

  const [moved] = items.splice(oldIndex, 1)
  items.splice(newIndex, 0, moved)

  const minIdx = Math.min(oldIndex, newIndex)
  const maxIdx = Math.max(oldIndex, newIndex)
  let cursor = anchorStart
  for (let i = minIdx; i <= maxIdx; i++) {
    const item = items[i]
    const dur = durationMinutes(item.startTime, item.endTime)
    item.startTime = cursor
    item.endTime = addMinutes(cursor, dur)
    cursor = item.endTime
  }
  reindex(items)
  return next
}

export function moveItemToDay(trip, fromDayId, toDayId, itemId, index) {
  const next = cloneTrip(trip)
  const fromDay = findDay(next, fromDayId)
  const toDay = findDay(next, toDayId)
  const oldIndex = fromDay.items.findIndex((i) => i.id === itemId)
  if (oldIndex === -1) return trip

  const [moved] = fromDay.items.splice(oldIndex, 1)
  reindex(fromDay.items)

  const dur = durationMinutes(moved.startTime, moved.endTime)
  const insertAt = fromDayId === toDayId && index > oldIndex ? index - 1 : index
  const { startTime, endTime } = fitBetween(toDay.items, insertAt, dur)
  moved.startTime = startTime
  moved.endTime = endTime
  toDay.items.splice(insertAt, 0, moved)
  reindex(toDay.items)
  return next
}

export function updateItemTime(trip, dayId, itemId, { startTime, endTime }) {
  const next = cloneTrip(trip)
  const day = findDay(next, dayId)
  const item = day.items.find((i) => i.id === itemId)
  item.startTime = startTime
  item.endTime = endTime
  return next
}

export function updateItemMemo(trip, dayId, itemId, memo) {
  const next = cloneTrip(trip)
  const day = findDay(next, dayId)
  const item = day.items.find((i) => i.id === itemId)
  item.memo = memo
  return next
}

export function deleteItem(trip, dayId, itemId) {
  const next = cloneTrip(trip)
  const day = findDay(next, dayId)
  day.items = day.items.filter((i) => i.id !== itemId)
  reindex(day.items)
  return next
}

// addTripItem 저장 성공 후, 로컬 임시 id를 서버가 발급한 진짜 id로 바꿔치기한다. 서버 응답(TripItemResponse)엔
// 카테고리(contentTypeId) 정보가 아예 없어서, 응답으로 통째로 덮어쓰면 방금 붙인 카테고리 아이콘 색이 사라진다 —
// 그래서 id만 교체하고 나머지(카테고리 포함, 장바구니에서 이미 알고 있던 값)는 로컬 값을 그대로 유지한다.
export function replaceItemId(trip, dayId, oldId, newId) {
  const next = cloneTrip(trip)
  const day = findDay(next, dayId)
  const item = day.items.find((i) => i.id === oldId)
  if (item) item.id = newId
  return next
}

// 두 시점의 같은 Day를 비교해 시간이 바뀐 항목만 뽑아낸다 — 순서변경/이동 시 로컬에서 재계산한 시간을
// (서버는 order만 바꾸고 시간은 그대로 두므로) 서버에도 따로 반영해야 할 대상 목록.
export function diffChangedTimes(prevDay, nextDay) {
  if (!prevDay) return nextDay.items.map((item) => ({ item, dayId: nextDay.id }))
  const prevById = new Map(prevDay.items.map((i) => [i.id, i]))
  return nextDay.items
    .filter((item) => {
      const prev = prevById.get(item.id)
      return prev && (prev.startTime !== item.startTime || prev.endTime !== item.endTime)
    })
    .map((item) => ({ item, dayId: nextDay.id }))
}
