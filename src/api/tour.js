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

// 기간별 축제·행사 — startDate(필수)~endDate와 겹치는 행사를 돌려준다(진행 중 포함).
// lDongRegnCd는 TourAPI 법정동 시/도 코드(서울=11 …) — data/tourSpots.js의 toLDongRegnCd로 변환해서 넘긴다.
export function getTourFestivals(params) {
  return client.get('/tour/festivals', { params }).then((res) => res.data)
}
