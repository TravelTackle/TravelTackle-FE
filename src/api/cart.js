import client from './client'

// 장바구니 변경을 열려 있는 패널(FloatingCart)에 알리는 신호
export const CART_CHANGED_EVENT = 'cart:changed'

// 탐색 카드 → 장바구니 드래그 페이로드 타입 (TourCard가 싣고 FloatingCart가 받음)
export const SPOT_DRAG_TYPE = 'application/x-travel-tackle-spot'

// 장바구니 아이템 → 여행 계획 Day 드래그 페이로드 타입 (TripCartPanel이 싣고 DayColumn이 받음)
export const CART_ITEM_DRAG_TYPE = 'application/x-travel-tackle-cart-item'

function notifyCartChanged() {
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT))
}

export function getCartItems() {
  // 비배열 응답(토큰 갱신 직후 등 비정상 케이스)이 패널 렌더를 깨뜨리지 않게 배열만 통과
  return client.get('/cart-items').then((res) => (Array.isArray(res.data) ? res.data : []))
}

export function addCartItem(contentId) {
  // 언어별 TourAPI 서비스는 contentId 네임스페이스가 서로 달라(예: 경복궁이 한국어/영어 서비스에서
  // 완전히 다른 contentId) 요청 바디에도 언어를 실어 보내야 한다 — 쿼리파라미터가 아니라 바디라
  // client.js의 공용 인터셉터가 채워주지 못하므로 여기서 직접 넣는다.
  let language = 'ko'
  try {
    language = localStorage.getItem('tt-language') || 'ko'
  } catch {
    // 프라이빗 모드 등 localStorage 접근이 막힌 환경에서는 기본값(ko)으로 요청
  }
  return client.post('/cart-items', { contentId, language }).then((res) => {
    notifyCartChanged()
    return res.data
  })
}

export function removeCartItem(cartItemId) {
  return client.delete(`/cart-items/${cartItemId}`).then((res) => {
    notifyCartChanged()
    return res
  })
}
