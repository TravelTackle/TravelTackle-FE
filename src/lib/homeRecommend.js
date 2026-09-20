// 홈 "여행지 탐색" 탭의 추천 섹션 고르기 — GET /tour/recommended 응답을 화면이 쓰는 형태로 정리한다.
// 컴포넌트에서 떼어 둔 순수 함수라 입력만 주면 결과를 그대로 확인할 수 있다.
const DAILY_TITLE = '오늘의 추천 여행지'

// 맞춤 추천(personal)이 있으면 그것, 없으면 default 섹션(무작위)으로 내려간다 —
// default의 서버 제목은 쓰지 않고 DAILY_TITLE로 바꿔 단다.
export function pickRecommended(sections) {
  const bySection = Object.fromEntries((sections || []).map((s) => [s.sectionId, s]))
  const personal = bySection.personal
  if (personal?.items?.length) {
    return { options: [{ key: 'personal', title: personal.title, items: personal.items, personal: true }] }
  }
  const fallback = bySection.default
  return fallback?.items?.length ? { options: [{ key: 'default', title: DAILY_TITLE, items: fallback.items }] } : null
}
