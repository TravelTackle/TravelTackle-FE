import client from './client'

// params: keyword, areaCode, sigunguCode, contentTypeId, page, size, arrange,
// petFriendly(true면 반려동물 동반 가능 장소만 — 한국관광공사 반려동물 동반여행 데이터, 한국어만 제공)
export function getTourContents(params) {
  return client.get('/tour/contents', { params }).then((res) => res.data)
}

export function getTourContentDetail(contentId) {
  return client.get(`/tour/contents/${contentId}`).then((res) => res.data)
}

// 티맵 이동 데이터 기반 연관 관광지 — 연관 순위순, TourAPI에 없는 항목은 서버가 이미 건너뛴다.
// 음식점·숙박이거나 연관 데이터가 없으면 빈 배열.
export function getRelatedTourContents(contentId, limit = 8) {
  return client.get(`/tour/contents/${contentId}/related`, { params: { limit } }).then((res) => res.data)
}

// 좌표 기반 주변 관광 콘텐츠 (연관 데이터가 없을 때의 대체)
export function getNearbyTourContents(params) {
  return client.get('/tour/contents/nearby', { params }).then((res) => res.data)
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
