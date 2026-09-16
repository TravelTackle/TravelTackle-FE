import { FALLBACK_AREAS } from '../data/tourSpots'

// 테마 구분은 TourAPI contentTypeId 기준 (탐색 탭과 동일 체계). 아이콘은 탐색 사이드바(tourSpots THEMES)와 통일.
// 역사/문화(14)·여행코스(25)·타입 미상은 관광지로, 카페는 맛집과 같은 39라 맛집에 포함.
// FloatingCart와 TripCartPanel이 동일 로직을 쓰기 때문에 공용 모듈로 둔다.
// badgeBg = Day 카드 연결선/아이콘 배지 색 — 사이트 톤(브랜드 블루 중심의 채도 있는 파스텔톤 solid)에 맞춰
// 카테고리마다 다른 색을 쓰되, 삭제 버튼 등 이미 다른 의미로 쓰는 rose/red 계열은 피한다.
export const CART_THEMES = [
  { key: 'activity', label: '액티비티', typeIds: ['28'], icon: 'mdi:run-fast', badgeBg: 'bg-orange-400' },
  { key: 'spot', label: '관광지', typeIds: ['12', '14', '25'], icon: 'mdi:map-marker-outline', badgeBg: 'bg-brand' },
  { key: 'shopping', label: '쇼핑', typeIds: ['38'], icon: 'mdi:shopping-outline', badgeBg: 'bg-fuchsia-400' },
  { key: 'food', label: '맛집', typeIds: ['39'], icon: 'mdi:silverware-fork-knife', badgeBg: 'bg-amber-500' },
  { key: 'festival', label: '축제/행사', typeIds: ['15'], icon: 'mdi:party-popper', badgeBg: 'bg-violet-400' },
  { key: 'stay', label: '숙박', typeIds: ['32'], icon: 'mdi:bed', badgeBg: 'bg-emerald-400' },
]

export const CART_TABS = [{ key: 'all', label: '전체' }, ...CART_THEMES]

// CART_THEMES/CART_TABS의 label은 한국어 고정 — 표시할 때는 이 맵으로 언어별 라벨을 골라 쓴다
const CART_THEME_LABEL_EN = {
  all: 'All',
  activity: 'Activities',
  spot: 'Sights',
  shopping: 'Shopping',
  food: 'Food',
  festival: 'Festivals',
  stay: 'Stay',
}

export function cartThemeLabel(key, language = 'ko') {
  if (language === 'ko') return CART_TABS.find((t) => t.key === key)?.label ?? key
  return CART_THEME_LABEL_EN[key] ?? key
}

export function cartTheme(contentTypeId) {
  return CART_THEMES.find((t) => t.typeIds.includes(String(contentTypeId))) ?? CART_THEMES.find((t) => t.key === 'spot')
}

export function themeKey(contentTypeId) {
  return cartTheme(contentTypeId).key
}

// Day 일정 카드/연결선의 아이콘 배지 — 카테고리를 아는 경우(장바구니에서 담아온 항목)에만 해당 아이콘을,
// 모르는 경우(mock 데이터 등 contentTypeId가 없는 항목)에는 기본 지도 아이콘을 보여준다.
export function tripItemIcon(contentTypeId) {
  return contentTypeId ? cartTheme(contentTypeId).icon : 'mdi:map'
}

// 카테고리를 아는 경우에만 해당 색을, 모르는 경우(mock 데이터)에는 기본 브랜드 블루를 쓴다.
export function tripItemColor(contentTypeId) {
  return contentTypeId ? cartTheme(contentTypeId).badgeBg : 'bg-brand'
}

const AREA_LABEL_EN = {
  서울: 'Seoul',
  인천: 'Incheon',
  대전: 'Daejeon',
  대구: 'Daegu',
  광주: 'Gwangju',
  부산: 'Busan',
  울산: 'Ulsan',
  세종특별자치시: 'Sejong',
  경기도: 'Gyeonggi-do',
  강원특별자치도: 'Gangwon-do',
  충청북도: 'Chungcheongbuk-do',
  충청남도: 'Chungcheongnam-do',
  경상북도: 'Gyeongsangbuk-do',
  경상남도: 'Gyeongsangnam-do',
  전북특별자치도: 'Jeonbuk-do',
  전라남도: 'Jeollanam-do',
  제주특별자치도: 'Jeju-do',
}

export function areaName(code, language = 'ko') {
  const name = FALLBACK_AREAS.find((a) => a.code === String(code))?.name ?? ''
  if (!name) return ''
  return language !== 'ko' ? (AREA_LABEL_EN[name] ?? name) : name
}
