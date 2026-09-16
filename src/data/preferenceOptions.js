// icon: Iconify Solar 아이콘 이름 (@iconify/react) — 이모지 대신 디자인 시스템 아이콘 사용
// 이 4개 상수는 한국어 고정 — MyPageAccountSettings.jsx 등 다른 화면이 그대로 참조하고 있어
// 하위호환을 위해 남겨둔다. 언어별 라벨이 필요한 곳(PreferenceWizard.jsx)은 아래 getPreferenceOptions를 쓴다.
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

// value는 백엔드로 전송되는 값이라 언어와 무관하게 고정 — label/description만 언어별로 바뀐다.
// (PreferenceWizard.jsx가 useLanguage()의 language를 넘겨 호출한다)
export function getPreferenceOptions(language) {
  if (language !== 'ko') {
    return {
      INTEREST_TAGS: [
        { value: 'FOOD', label: 'Food', icon: 'solar:chef-hat-linear' },
        { value: 'PHOTOGRAPHY', label: 'Photography', icon: 'solar:camera-linear' },
        { value: 'NATURE', label: 'Nature', icon: 'solar:leaf-linear' },
        { value: 'HISTORY', label: 'History', icon: 'solar:buildings-2-linear' },
        { value: 'ACTIVITY', label: 'Activities', icon: 'solar:bolt-linear' },
        { value: 'SHOPPING', label: 'Shopping', icon: 'solar:bag-4-linear' },
        { value: 'K_POP', label: 'K-Pop', icon: 'solar:microphone-3-linear' },
        { value: 'ART', label: 'Art & Exhibits', icon: 'solar:palette-linear' },
        { value: 'FESTIVAL', label: 'Festivals', icon: 'solar:confetti-linear' },
        { value: 'NIGHTLIFE', label: 'Night Views', icon: 'solar:moon-stars-linear' },
        { value: 'CAFE', label: 'Cafes', icon: 'solar:cup-hot-linear' },
        { value: 'WELLBEING', label: 'Relaxation', icon: 'solar:meditation-round-linear' },
      ],
      TRAVEL_STYLES: [
        { value: 'RELAXED', label: 'Relaxed pace', description: '1–2 spots per day', icon: 'solar:sun-2-linear' },
        { value: 'MODERATE', label: 'Moderate pace', description: '3–4 spots per day', icon: 'solar:map-linear' },
        { value: 'ACTIVE', label: 'Packed schedule', description: 'As many spots as possible', icon: 'solar:fire-linear' },
      ],
      // 원화 표기(하루 5만/10만/20만원)를 그대로 옮기지 않고 대략적인 환율(1,330원/$ 기준)로
      // 반올림한 달러 표기로 바꿔서 보여준다 — value(백엔드 전송값)는 원화 구간 그대로라 바뀌지 않는다.
      BUDGET_LEVELS: [
        { value: 'LOW', label: 'Budget-friendly', description: 'Under $40/day', icon: 'solar:wallet-linear' },
        { value: 'MEDIUM', label: 'Moderate', description: '$40–75/day', icon: 'solar:wallet-money-linear' },
        { value: 'HIGH', label: 'Invest more', description: '$75–150/day', icon: 'solar:card-linear' },
        { value: 'LUXURY', label: 'Luxury', description: 'Over $150/day', icon: 'solar:crown-linear' },
      ],
      PREFERRED_REGIONS: [
        { value: 'SEOUL', label: 'Seoul' },
        { value: 'BUSAN', label: 'Busan' },
        { value: 'JEJU', label: 'Jeju' },
        { value: 'GANGWON', label: 'Gangwon' },
        { value: 'GYEONGJU', label: 'Gyeongju' },
        { value: 'JEONJU', label: 'Jeonju' },
        { value: 'INCHEON', label: 'Incheon' },
        { value: 'JEONNAM', label: 'Jeonnam' },
        { value: 'CHUNGCHEONG', label: 'Chungcheong' },
        { value: 'GYEONGBUK', label: 'Gyeongbuk' },
        { value: 'OTHER', label: 'Other regions' },
      ],
    }
  }

  return { INTEREST_TAGS, TRAVEL_STYLES, BUDGET_LEVELS, PREFERRED_REGIONS }
}
