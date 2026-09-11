// 관광지 탐색 탭 — TourAPI contentTypeId 매핑은 기존 검증된 연동 코드 기준
export const THEMES = [
  { label: '액티비티', icon: 'mdi:run-fast', contentTypeId: '28' },
  { label: '역사 / 문화', icon: 'mdi:bank', contentTypeId: '14' },
  { label: '자연', icon: 'mdi:leaf', contentTypeId: '12' },
  { label: '쇼핑', icon: 'mdi:shopping-outline', contentTypeId: '38' },
  { label: '맛집', icon: 'mdi:silverware-fork-knife', contentTypeId: '39' },
  { label: '카페', icon: 'mdi:coffee-outline', contentTypeId: '39', keyword: '카페' },
  // kind: 'festival' — 일반 콘텐츠 목록 대신 기간 조회 API(/tour/festivals)로 동작하는 테마
  { label: '축제 / 행사', icon: 'mdi:party-popper', contentTypeId: '15', kind: 'festival' },
  { label: '숙박', icon: 'mdi:bed', contentTypeId: '32' },
]

// GET /tour/areas 실패 시 폴백 (실제 응답과 동일한 17개 시/도)
export const FALLBACK_AREAS = [
  { code: '1', name: '서울' },
  { code: '2', name: '인천' },
  { code: '3', name: '대전' },
  { code: '4', name: '대구' },
  { code: '5', name: '광주' },
  { code: '6', name: '부산' },
  { code: '7', name: '울산' },
  { code: '8', name: '세종특별자치시' },
  { code: '31', name: '경기도' },
  { code: '32', name: '강원특별자치도' },
  { code: '33', name: '충청북도' },
  { code: '34', name: '충청남도' },
  { code: '35', name: '경상북도' },
  { code: '36', name: '경상남도' },
  { code: '37', name: '전북특별자치도' },
  { code: '38', name: '전라남도' },
  { code: '39', name: '제주특별자치도' },
]

export const REGIONS_VISIBLE_COUNT = 6
export const PAGE_SIZE = 9

// 인기 여행지 순 정렬 기준 (한국관광 데이터랩·국민여행조사 등 국내여행 선호도 통계 참고)
// 제주 > 서울 > 부산 > 강원 > 경기 > 경북 > 전남 > 인천 > 대전 > 대구 > 충북 > 전북 > 충남 > 경남 > 광주 > 울산 > 세종
const AREA_POPULARITY_ORDER = ['39', '1', '6', '32', '31', '35', '38', '2', '3', '4', '33', '37', '34', '36', '5', '7', '8']

export function sortAreasByPopularity(areas) {
  return [...areas].sort((a, b) => {
    const rankA = AREA_POPULARITY_ORDER.indexOf(a.code)
    const rankB = AREA_POPULARITY_ORDER.indexOf(b.code)
    return (rankA === -1 ? AREA_POPULARITY_ORDER.length : rankA) - (rankB === -1 ? AREA_POPULARITY_ORDER.length : rankB)
  })
}

// TourAPI 지역코드(areaCode) → 법정동 시/도 코드(lDongRegnCd). 축제 API는 후자만 받는다.
const AREA_TO_LDONG = {
  1: '11', 2: '28', 3: '30', 4: '27', 5: '29', 6: '26', 7: '31', 8: '36',
  31: '41', 32: '51', 33: '43', 34: '44', 35: '47', 36: '48', 37: '52', 38: '46', 39: '50',
}

export function toLDongRegnCd(areaCode) {
  return areaCode ? AREA_TO_LDONG[String(areaCode)] : undefined
}
