// 모바일 화면이 좁아 챗봇(ChatbotWidget)과 장바구니(FloatingCart)가 동시에 열리지 않게
// 서로에게 열림 상태를 알리는 신호
export const FLOATING_PANEL_EVENT = 'floatingPanel:open'

export function announceFloatingPanelOpen(id, isOpen) {
  window.dispatchEvent(new CustomEvent(FLOATING_PANEL_EVENT, { detail: { id, isOpen } }))
}
