// icon: Iconify Solar 아이콘 이름 (@iconify/react) — 이모지 대신 디자인 시스템 아이콘 사용
export const INTEREST_TAGS = [
  { value: 'FOOD', label: '맛집', icon: 'solar:chef-hat-linear' },
  { value: 'PHOTOGRAPHY', label: '사진', icon: 'solar:camera-linear' },
  { value: 'NATURE', label: '자연', icon: 'solar:leaf-linear' },
  { value: 'HISTORY', label: '역사', icon: 'solar:buildings-2-linear' },
  { value: 'ACTIVITY', label: '액티비티', icon: 'solar:bolt-linear' },
  { value: 'SHOPPING', label: '쇼핑', icon: 'solar:bag-4-linear' },
  { value: 'K_POP', label: 'K-POP', icon: 'solar:microphone-3-linear' },
  { value: 'ART', label: '전시', icon: 'solar:palette-linear' },
  { value: 'FESTIVAL', label: '축제', icon: 'solar:confetti-linear' },
  { value: 'NIGHTLIFE', label: '야경', icon: 'solar:moon-stars-linear' },
  { value: 'CAFE', label: '카페', icon: 'solar:cup-hot-linear' },
  { value: 'WELLBEING', label: '휴양/힐링', icon: 'solar:meditation-round-linear' },
]

export const TRAVEL_STYLES = [
  { value: 'RELAXED', label: '여유롭게 둘러보는 편', description: '하루 1~2곳 정도 방문', icon: 'solar:sun-2-linear' },
  { value: 'MODERATE', label: '적당히 즐기는 편', description: '하루 3~4곳 정도 방문', icon: 'solar:map-linear' },
  { value: 'ACTIVE', label: '하루를 꽉 채우는 편', description: '가능한 많은 장소 방문', icon: 'solar:fire-linear' },
]

export const BUDGET_LEVELS = [
  { value: 'LOW', label: '가성비', description: '하루 5만원 이하', icon: 'solar:wallet-linear' },
  { value: 'MEDIUM', label: '적당히', description: '하루 5~10만원', icon: 'solar:wallet-money-linear' },
  { value: 'HIGH', label: '투자', description: '하루에 10~20만원', icon: 'solar:card-linear' },
  { value: 'LUXURY', label: '럭셔리', description: '하루 20만원 이상', icon: 'solar:crown-linear' },
]

// 지역은 아이콘 없이 라벨만 — 지역별 은유가 억지스러워 텍스트가 더 깔끔하다
export const PREFERRED_REGIONS = [
  { value: 'SEOUL', label: '서울' },
  { value: 'BUSAN', label: '부산' },
  { value: 'JEJU', label: '제주' },
  { value: 'GANGWON', label: '강원' },
  { value: 'GYEONGJU', label: '경주' },
  { value: 'JEONJU', label: '전주' },
  { value: 'INCHEON', label: '인천' },
  { value: 'JEONNAM', label: '전남' },
  { value: 'CHUNGCHEONG', label: '충청' },
  { value: 'GYEONGBUK', label: '경북' },
  { value: 'OTHER', label: '기타 지역' },
]
