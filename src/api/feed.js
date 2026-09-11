import client from './client'

export function getFeed(params) {
  return client.get('/feed', { params }).then((res) => res.data)
}

export function getFeedDetail(tripId) {
  return client.get(`/feed/${tripId}`).then((res) => res.data)
}

// 공개된 여행 계획에 참견(피드백) 남기기 — 로그인 필요
export function createFeedback(tripId, content) {
  return client.post(`/trips/${tripId}/feedback`, { content }).then((res) => res.data)
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
