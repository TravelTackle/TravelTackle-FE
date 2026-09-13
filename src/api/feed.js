import client from './client'
import { CART_CHANGED_EVENT } from './cart'

export function getFeed(params) {
  return client.get('/feed', { params }).then((res) => res.data)
}

export function getFeedDetail(tripId) {
  return client.get(`/feed/${tripId}`).then((res) => res.data)
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

// 특정 계획에 달린 참견 목록 (최신순, 비로그인도 조회 가능)
export function getTripFeedback(tripId, params) {
  return client.get(`/trips/${tripId}/feedback`, { params }).then((res) => res.data)
}

// 내 계획에 달린 참견 모아보기 — 계획별 전체/미읽음 수 (로그인 필요)
export function getReceivedFeedback() {
  return client.get('/trips/feedback/received').then((res) => res.data)
}

// 내 선호도와 맞는 다른 사용자의 공개 계획/기록 (로그인 필요)
export function getRecommendedTrips(limit = 20) {
  return client.get('/recommendations/trips', { params: { limit } }).then((res) => res.data)
}

export function getRecommendedRecords(limit = 20) {
  return client.get('/recommendations/records', { params: { limit } }).then((res) => res.data)
}
