import { createContext, useContext } from 'react'

// 피드 카드 액션바(참견·스크랩)가 쓰는 공용 동작. 피드 페이지가 제공하고, 없는 곳(홈 등)에선 기본값으로 아무 일도 하지 않는다.
const FeedActionsContext = createContext({
  user: null,
  savedIds: new Map(), // originalTripId → savedTripId
  pendingIds: new Set(), // 저장/해제 요청 중인 tripId
  saveDelta: {}, // tripId → 이 세션에서 바뀐 저장 수(+1/-1)
  feedbackDelta: {}, // tripId → 이 세션에서 새로 단 참견 수
  toggleSave: () => {},
  openFeedback: () => {},
})

export const FeedActionsProvider = FeedActionsContext.Provider

export function useFeedActions() {
  return useContext(FeedActionsContext)
}

// 카드가 계획이면 자기 id, 기록이면 연결된 계획 id — 참견·스크랩은 모두 계획 단위다
export function targetTripId(item) {
  return item?.type === 'plan' ? item.id : item?.planId
}
