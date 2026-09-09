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
  return client.post('/cart-items', { contentId }).then((res) => {
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
