import client from './client'
import { CART_CHANGED_EVENT } from './cart'

export function getFeed(params) {
  return client.get('/feed', { params }).then((res) => res.data)
}

export function getFeedDetail(tripId) {
  return client.get(`/feed/${tripId}`).then((res) => res.data)
}

// 기간 내 인기 지역 집계 (비로그인 가능). 공개 계획을 첫 일정 지역별로 센 [{ region, tripCount }]가
// 계획 수 내림차순으로 온다. from/to는 YYYY-MM-DD(계획 생성일 기준, 양끝 포함), 생략하면 무제한. size 최대 50.
export function getFeedRegionCounts(params) {
  return client.get('/feed/regions', { params }).then((res) => res.data)
}

// 공개된 여행 계획에 참견(피드백) 남기기 — 로그인 필요.
// recommendations: 추천 장소 contentId 목록(선택). 응답의 recommendations엔 { id, contentId, title, imageUrl, areaCode }가 온다.
export function createFeedback(tripId, content, { recommendations = [] } = {}) {
  const body = { content }
  if (recommendations.length) body.recommendations = recommendations.map((contentId) => ({ contentId }))
  return client.post(`/trips/${tripId}/feedback`, body).then((res) => res.data)
}

// 참견 수정 — 본인만 가능(서버가 최종 검증). recommendations를 안 보내면 서버가 기존 추천을 전부 지워버리므로
// (PATCH는 "추천 전체 교체" 방식) 손대지 않을 거면 기존 값을 그대로 다시 넣어 보내야 한다.
export function updateFeedback(tripId, feedbackId, content, { recommendations = [] } = {}) {
  const body = { content, recommendations: recommendations.map((contentId) => ({ contentId })) }
  return client.patch(`/trips/${tripId}/feedback/${feedbackId}`, body).then((res) => res.data)
}

// 참견 삭제 — 본인 또는 계획 소유자가 가능(서버가 최종 검증). 지금 프론트는 작성자 본인 삭제만 노출한다.
export function deleteFeedback(tripId, feedbackId) {
  return client.delete(`/trips/${tripId}/feedback/${feedbackId}`)
}

// 참견에 붙은 추천 장소를 내 장바구니에 담기 — 계획 소유자만
export function addRecommendationToCart(tripId, recommendationId) {
  return client
    .post(`/trips/${tripId}/feedback/recommendations/${recommendationId}/cart`)
    .then((res) => {
      window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT))
      return res.data
    })
}

// 특정 계획에 달린 참견 목록 (최신순, 비로그인도 조회 가능).
// /feedback(레벨별 필터용, dayId/itemId 없으면 "계획 전체" 레벨만 옴)이 아니라 /feedback/all을 쓴다 —
// 안 그러면 Day·장소 단위로 남긴 참견이 목록에서 빠져서, 카드 배지 수(전체 레벨 합산)보다 적게 보인다.
export function getTripFeedback(tripId, params) {
  return client.get(`/trips/${tripId}/feedback/all`, { params }).then((res) => res.data)
}

// 내 계획에 달린 참견 모아보기 — 계획별 전체/미읽음 수 (로그인 필요)
export function getReceivedFeedback() {
  return client.get('/trips/feedback/received').then((res) => res.data)
}

// 참견 알림 지우기 — 지운 시점 이후 새 참견이 없으면 getReceivedFeedback 목록에서 숨긴다(읽음 처리 포함).
// 백엔드에 요청해둔 엔드포인트라 아직 없을 수 있음 — 호출부에서 실패를 조용히 무시하고 로컬 제거만으로 동작한다.
export function dismissReceivedFeedback(tripId) {
  return client.post(`/trips/${tripId}/feedback/notifications/dismiss`)
}

// 내 선호도와 맞는 다른 사용자의 공개 계획/기록 (로그인 필요)
export function getRecommendedTrips(limit = 20) {
  return client.get('/recommendations/trips', { params: { limit } }).then((res) => res.data)
}

export function getRecommendedRecords(limit = 20) {
  return client.get('/recommendations/records', { params: { limit } }).then((res) => res.data)
}
