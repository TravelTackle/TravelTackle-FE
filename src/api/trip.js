import client from './client'

// 여행 계획(Trip Planner) 실 API — 백엔드 TripController(/api/trips) 그대로 매핑.
// 지도 탭은 아직 백엔드/프론트 모두 미구현이라 이 모듈에 없다.

// 백엔드는 LocalTime을 "10:00:00"처럼 초 단위까지 내려준다 — 화면·<input type="time">엔 "HH:mm"만
// 필요하므로 응답을 받는 시점에 여기서 한 번에 잘라둔다.
function toHHmm(t) {
  return typeof t === 'string' ? t.slice(0, 5) : t
}

function normalizeItem(item) {
  return { ...item, startTime: toHHmm(item.startTime), endTime: toHHmm(item.endTime) }
}

function normalizeTripDetail(detail) {
  return { ...detail, days: detail.days.map((day) => ({ ...day, items: day.items.map(normalizeItem) })) }
}

export function getMyTrips() {
  return client.get('/trips').then((res) => res.data)
}

export function getTripDetail(tripId) {
  return client.get(`/trips/${tripId}`).then((res) => normalizeTripDetail(res.data))
}

export function createTrip(title, startDate, endDate) {
  return client.post('/trips', { title, startDate, endDate }).then((res) => res.data)
}

export function updateTrip(tripId, title, startDate, endDate) {
  return client.patch(`/trips/${tripId}`, { title, startDate, endDate }).then((res) => res.data)
}

export function deleteTrip(tripId) {
  return client.delete(`/trips/${tripId}`)
}

// index는 서버가 모른다 — addTripItem은 항상 해당 Day 맨 끝에 추가하므로, 드롭 위치가 끝이 아니면
// 호출부에서 이어서 reorderTripItems를 한 번 더 호출해 최종 위치로 옮긴다.
export function addTripItem(tripId, dayId, cartItemId, startTime, endTime) {
  return client
    .post(`/trips/${tripId}/days/${dayId}/items`, { cartItemId, startTime, endTime })
    .then((res) => normalizeItem(res.data))
}

// 이 엔드포인트는 부분 수정이 아니라 통째로 덮어쓴다 — memo를 안 보내면 서버가 null로 지워버리므로,
// 시간만 바꾸는 호출이라도 항상 현재 memo 값을 같이 실어 보내야 한다.
export function updateTripItem(tripId, dayId, itemId, startTime, endTime, memo) {
  return client
    .patch(`/trips/${tripId}/days/${dayId}/items/${itemId}`, { startTime, endTime, memo })
    .then((res) => normalizeItem(res.data))
}

export function deleteTripItem(tripId, dayId, itemId) {
  return client.delete(`/trips/${tripId}/days/${dayId}/items/${itemId}`)
}

// itemIds는 해당 Day에 실제로 있는 항목 id 전체(순서만 새로 배열)여야 한다 — 일부만 보내면 서버가 거부한다.
export function reorderTripItems(tripId, dayId, itemIds) {
  return client
    .patch(`/trips/${tripId}/days/${dayId}/items/reorder`, { itemIds })
    .then((res) => res.data.map(normalizeItem))
}

export function moveTripItem(tripId, itemId, newDayId, newOrderIndex) {
  return client
    .patch(`/trips/${tripId}/items/${itemId}/move`, { newDayId, newOrderIndex })
    .then((res) => normalizeItem(res.data))
}

export function publishTrip(tripId) {
  return client.patch(`/trips/${tripId}/publish`).then((res) => res.data)
}

export function unpublishTrip(tripId) {
  return client.patch(`/trips/${tripId}/unpublish`).then((res) => res.data)
}

// 다른 사용자의 공개 계획을 스크랩(찜) — 복사는 아직 안 됨, 보관함에서 copySavedTrip을 따로 호출해야 내 계획이 된다.
// sourceType: 어느 카드에서 스크랩했는지('PLAN' | 'RECORD') — 보관함에서 그 형태 그대로 카드를 보여주는 데 쓴다.
export function saveTrip(tripId, sourceType = 'PLAN') {
  return client.post('/saved-trips', { tripId, sourceType }).then((res) => res.data)
}

// 스크랩 해제 — 이미 복사해서 만든 내 계획(Trip)은 그대로 남는다
export function unsaveTrip(savedTripId) {
  return client.delete(`/saved-trips/${savedTripId}`)
}

// 내가 스크랩한 여행 목록 (보관함)
export function getSavedTrips() {
  return client.get('/saved-trips').then((res) => (Array.isArray(res.data) ? res.data : []))
}

// 보관함에 스크랩해둔 여행을 실제로 내 계획으로 복사
export function copySavedTrip(savedTripId) {
  return client.post(`/saved-trips/${savedTripId}/copy`).then((res) => res.data)
}
