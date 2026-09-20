// 홈 "여행지 탐색" 탭의 추천 섹션 고르기 — GET /tour/recommended 응답을 화면이 쓰는 형태로 정리한다.
// 컴포넌트에서 떼어 둔 순수 함수라 입력만 주면 결과를 그대로 확인할 수 있다.
const DAILY_TITLE = '오늘의 추천 여행지'

// 로그인 사용자의 "전체" 탭은 선호도 기반 추천으로 채운다.
// 서버가 주는 섹션 중 personal(맞춤 추천)과 pet(반려동물 동반, 취향에 PET_FRIENDLY가 있을 때만 옴)을 쓰고,
// 둘 다 없으면 default 섹션(무작위)으로 내려간다 — default의 서버 제목은 쓰지 않고 DAILY_TITLE로 바꿔 단다.
export function pickRecommended(sections) {
  const bySection = Object.fromEntries((sections || []).map((s) => [s.sectionId, s]))
  const options = []
  if (bySection.personal?.items?.length) {
    options.push({ key: 'personal', title: bySection.personal.title, items: bySection.personal.items, personal: true })
  }
  if (bySection.pet?.items?.length) {
    options.push({ key: 'pet', title: bySection.pet.title, items: bySection.pet.items, personal: true, pet: true })
  }
  if (options.length) return { options }
  const fallback = bySection.default
  return fallback?.items?.length ? { options: [{ key: 'default', title: DAILY_TITLE, items: fallback.items }] } : null
}
