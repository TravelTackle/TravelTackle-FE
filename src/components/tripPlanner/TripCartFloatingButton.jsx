import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { CART_CHANGED_EVENT, getCartItems } from '../../api/cart'
import { useLanguage } from '../../i18n'

const T = {
  ko: { open: '여행 장바구니 열기' },
  en: { open: 'Open trip cart' },
}

// 여행 계획 사이드바 장바구니가 닫혀 있을 때만 뜨는 전용 플로팅 버튼.
// 다른 페이지의 FloatingCart와 같은 생김새(파란 원 버튼 + 개수 배지)를 그대로 쓰되,
// 누르면 자기 팝업이 아니라 이 페이지의 사이드바(onOpen)를 다시 연다.
export default function TripCartFloatingButton({ onOpen }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    getCartItems().then((items) => setCount(items.length)).catch(() => setCount(0))
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(CART_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(CART_CHANGED_EVENT, refresh)
  }, [refresh])

  return (
    <div className="animate-cart-pop-in pointer-events-none fixed bottom-24 right-6 z-40">
      <button
        onClick={onOpen}
        aria-label={copy.open}
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-surface bg-brand text-white shadow-float transition-all hover:scale-105 hover:bg-brand-dark hover:shadow-float-hover"
      >
        <Icon icon="solar:cart-large-2-bold" width={24} />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    </div>
  )
}
