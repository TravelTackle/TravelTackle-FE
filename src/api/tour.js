import client from './client'

export function getTourContents(params) {
  return client.get('/tour/contents', { params }).then((res) => res.data)
}

export function getTourContentDetail(contentId) {
  return client.get(`/tour/contents/${contentId}`).then((res) => res.data)
}

export function getTourAreas(areaCode) {
  return client.get('/tour/areas', { params: { areaCode } }).then((res) => res.data)
}

// 선호도 기반 섹션 추천 (맞춤 추천 / 맛집 / 카페 / 이달의 축제) — 로그인 필요
export function getRecommendedSpots() {
  return client.get('/tour/recommended').then((res) => res.data)
}
