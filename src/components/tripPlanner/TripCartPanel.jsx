import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { PetFriendlyMark } from '../ui/PetFriendly'
import { CART_CHANGED_EVENT, CART_ITEM_DRAG_TYPE, getCartItems, removeCartItem } from '../../api/cart'
import { CART_TABS, areaName, cartTheme, themeKey } from '../../lib/cartThemes'

// 계획 편집 화면 우측의 여행 장바구니 사이드바 패널. FloatingCart와 같은 실 데이터(api/cart.js)를 쓴다.
// 접힌 상태는 이 컴포넌트가 아니라 부모(TripPlannerPage)가 아예 마운트를 안 하는 식으로 처리하고,
// 대신 우측 하단에 뜨는 전용 플로팅 버튼(TripCartFloatingButton)이 그 자리를 대신한다.
export default function TripCartPanel({ onToggle, onAddItem, targetDayLabel }) {
  // 모바일(터치)에서 draggable="true"인 요소는 탭이 드래그 제스처 인식기에 먼저 먹혀서 클릭이
  // 씹히는 경우가 있다 — 데스크톱(마우스)에서만 드래그를 켜고, 모바일에서는 탭으로만 담게 한다.
  const [isDesktop] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const tabsRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // 보이는 폭만큼 넘기되 한 칩 정도는 겹치게 남겨서 이어지는 느낌을 준다.
  // 단, 남은 거리가 한 화면 폭 이내면(마지막 조금 남은 상태) 애매하게 덜 넘어가지 않도록 바로 끝으로 스냅한다.
  function scrollTabs(direction) {
    const el = tabsRef.current
    if (!el) return
    const overlap = 40
    const maxScroll = el.scrollWidth - el.clientWidth
    const remaining = direction > 0 ? maxScroll - el.scrollLeft : el.scrollLeft
    const target =
      remaining <= el.clientWidth
        ? direction > 0
          ? maxScroll
          : 0
        : el.scrollLeft + direction * (el.clientWidth - overlap)
    el.scrollTo({ left: target, behavior: 'smooth' })
  }

  const updateScrollButtons = useCallback(() => {
    const el = tabsRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  // 스크롤 도중(특히 smooth scrollTo 애니메이션 중)에 버튼이 마운트/언마운트되면 필터 목록의 flex-1 폭이
  // 바뀌어 진행 중이던 스크롤 목표 지점이 밀린다 — 그래서 스크롤이 완전히 멈춘 뒤(마지막 스크롤 이벤트로부터
  // 150ms 뒤)에만 버튼 표시 여부를 갱신한다.
  useEffect(() => {
    updateScrollButtons()
    const el = tabsRef.current
    if (!el) return
    let timer
    function onScroll() {
      clearTimeout(timer)
      timer = setTimeout(updateScrollButtons, 150)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateScrollButtons)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [updateScrollButtons])

  // 버튼이 나타나거나 사라지면(위 이펙트가 그 반영을 렌더링한 뒤) 스크롤 가능 폭 자체가 바뀐다 —
  // "끝까지 온 줄 알았는데 버튼 하나만큼 덜 스크롤된" 상태가 되지 않도록, 그 직후 실제 끝으로 조용히(즉시) 보정한다.
  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (canScrollRight === false && el.scrollLeft < maxScroll - 1) {
      el.scrollTo({ left: maxScroll, behavior: 'instant' })
    } else if (canScrollLeft === false && el.scrollLeft > 1) {
      el.scrollTo({ left: 0, behavior: 'instant' })
    }
  }, [canScrollLeft, canScrollRight])

  const refresh = useCallback(() => {
    getCartItems().then(setItems).catch(() => setItems([]))
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(CART_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(CART_CHANGED_EVENT, refresh)
  }, [refresh])

  async function handleRemove(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    try {
      await removeCartItem(item.id)
    } catch {
      setItems((prev) => [item, ...prev])
    }
  }

  const q = query.trim().toLowerCase()
  const visibleItems = items
    .filter((i) => tab === 'all' || themeKey(i.contentTypeId) === tab)
    .filter((i) => !q || i.title?.toLowerCase().includes(q) || areaName(i.areaCode).toLowerCase().includes(q))

  return (
    // 모바일에서는 챗봇/장바구니 위젯처럼 화면 전체를 채우고(28px 라운드), sm 이상에서는 기존 사이드 패널 크기로 되돌아온다.
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-surface shadow-card sm:h-auto sm:max-h-[calc(100vh-160px)] sm:w-[340px] sm:shrink-0 sm:rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-[14px] font-bold text-slate-800">여행 장바구니</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">{items.length}개</span>
          {/* 기존 플로팅 장바구니의 닫기(X) 버튼과 같은 생김새 — 파란 원 + 흰 X + 개수 배지 */}
          <button
            onClick={onToggle}
            aria-label="여행 장바구니 닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark"
          >
            <Icon icon="solar:close-circle-bold" width={18} />
          </button>
        </div>
      </div>

      {onAddItem && targetDayLabel && (
        <p className="mx-4 mt-2 rounded-lg bg-brand-light px-3 py-2 text-[11.5px] font-bold text-brand">
          {targetDayLabel}에 추가할 장소를 선택하세요
        </p>
      )}

      <div className="px-4 pt-3">
        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5">
          <Icon icon="solar:magnifer-linear" width={14} className="text-slate-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="여행지 이름 또는 지역"
            className="h-full w-full text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="flex items-center px-4 py-3">
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          aria-label="이전 필터"
          tabIndex={canScrollLeft ? 0 : -1}
          className={`flex h-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface text-brand shadow-card transition-all duration-300 hover:border-brand hover:bg-brand-light ${
            canScrollLeft ? 'mr-1 w-6 border-slate-200 opacity-100' : 'w-0 border-transparent opacity-0'
          }`}
        >
          <Icon icon="mdi:chevron-left" width={16} className="shrink-0" />
        </button>
        <div
          ref={tabsRef}
          className="scrollbar-hide flex flex-1 gap-1.5 overflow-x-auto"
          style={{
            maskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent, black 12px' : 'black'}, ${
              canScrollRight ? 'black calc(100% - 12px), transparent' : 'black'
            })`,
            WebkitMaskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent, black 12px' : 'black'}, ${
              canScrollRight ? 'black calc(100% - 12px), transparent' : 'black'
            })`,
          }}
        >
          {CART_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                tab === t.key ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-surface text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollTabs(1)}
          aria-label="다음 필터"
          tabIndex={canScrollRight ? 0 : -1}
          className={`flex h-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface text-brand shadow-card transition-all duration-300 hover:border-brand hover:bg-brand-light ${
            canScrollRight ? 'ml-1 w-6 border-slate-200 opacity-100' : 'w-0 border-transparent opacity-0'
          }`}
        >
          <Icon icon="mdi:chevron-right" width={16} className="shrink-0" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {visibleItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <Icon icon="solar:cart-large-2-linear" width={26} className="text-slate-300" />
            <p className="text-[12.5px] font-semibold text-slate-500">담아둔 장소가 없어요</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visibleItems.map((item) => (
              <li
                key={item.id}
                // 모바일에서는 탭으로만 담게 하므로 draggable 속성 자체를 안 붙인다 — 데스크톱에서만 카트에서
                // Day로 직접 끌어다 놓는 것도 가능하게 켠다.
                {...(isDesktop
                  ? {
                      draggable: true,
                      onDragStart: (e) => {
                        e.dataTransfer.effectAllowed = 'copy'
                        e.dataTransfer.setData(CART_ITEM_DRAG_TYPE, JSON.stringify(item))
                        const rect = e.currentTarget.getBoundingClientRect()
                        e.dataTransfer.setDragImage(e.currentTarget, e.clientX - rect.left, e.clientY - rect.top)
                      },
                    }
                  : {})}
                onClick={() => onAddItem?.(item)}
                className={`flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 shadow-card ${
                  isDesktop ? 'cursor-grab active:cursor-grabbing' : ''
                } ${onAddItem ? 'cursor-pointer hover:border-brand/30 hover:bg-brand-light/20' : ''}`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-px text-[10px] font-semibold text-slate-400">
                    <Icon icon={cartTheme(item.contentTypeId).icon} width={10} />
                    {cartTheme(item.contentTypeId).label}
                  </span>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] font-bold text-slate-800">
                    <span className="truncate">{item.title}</span>
                    <PetFriendlyMark value={item.petFriendly} />
                  </p>
                  <p className="text-[11px] text-slate-400">{areaName(item.areaCode)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(item)
                  }}
                  aria-label={`${item.title} 빼기`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100"
                >
                  <Icon icon="solar:trash-bin-minimalistic-linear" width={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
