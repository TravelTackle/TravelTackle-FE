import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { CART_CHANGED_EVENT, CART_ITEM_DRAG_TYPE, getCartItems, removeCartItem } from '../../api/cart'
import { CART_TABS, areaName, cartTheme, themeKey } from '../../lib/cartThemes'

// 계획 편집 화면 우측의 여행 장바구니 사이드바 패널. FloatingCart와 같은 실 데이터(api/cart.js)를 쓴다.
// 접힌 상태는 이 컴포넌트가 아니라 부모(TripPlannerPage)가 아예 마운트를 안 하는 식으로 처리하고,
// 대신 우측 하단에 뜨는 전용 플로팅 버튼(TripCartFloatingButton)이 그 자리를 대신한다.
export default function TripCartPanel({ onToggle }) {
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
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
  const countByTab = CART_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? items.length : items.filter((i) => themeKey(i.contentTypeId) === t.key).length
    return acc
  }, {})
  const visibleTabs = CART_TABS.filter((t) => t.key === 'all' || countByTab[t.key] > 0 || t.key === tab)
  const visibleItems = items
    .filter((i) => tab === 'all' || themeKey(i.contentTypeId) === tab)
    .filter((i) => !q || i.title?.toLowerCase().includes(q) || areaName(i.areaCode).toLowerCase().includes(q))

  return (
    <div className="flex max-h-[calc(100vh-160px)] w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
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

      {/* 테마 칩 — 담긴 개수와 함께, 많아지면 줄바꿈 (FloatingCart와 동일) */}
      <div className="flex flex-wrap gap-1.5 px-4 py-3" role="tablist" aria-label="테마별 보기">
        {visibleTabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[12px] font-bold transition-all ${
                active ? 'border-brand bg-brand text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {t.icon && <Icon icon={t.icon} width={12} />}
              {t.label}
              <span className={`tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>{countByTab[t.key]}</span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {visibleItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <Icon icon="solar:cart-large-2-linear" width={26} className="text-slate-300" />
            <p className="text-[12.5px] font-semibold text-slate-500">담아둔 장소가 없어요</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visibleItems.map((item, i) => (
              <li
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy'
                  e.dataTransfer.setData(CART_ITEM_DRAG_TYPE, JSON.stringify(item))
                  const rect = e.currentTarget.getBoundingClientRect()
                  e.dataTransfer.setDragImage(e.currentTarget, e.clientX - rect.left, e.clientY - rect.top)
                }}
                className="group animate-slide-in flex cursor-grab items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-card transition-all duration-300 hover:-translate-y-px hover:shadow-card-hover active:cursor-grabbing"
                style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
              >
                <span className="shrink-0 text-slate-300 group-hover:text-slate-400" aria-hidden="true">
                  <Icon icon="solar:menu-dots-bold" width={16} className="rotate-90" />
                </span>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                    <Icon icon={cartTheme(item.contentTypeId).icon} width={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${cartTheme(item.contentTypeId).badgeBg}`} aria-hidden="true" />
                    {cartTheme(item.contentTypeId).label}
                  </span>
                  <p className="mt-0.5 truncate text-[12.5px] font-bold text-slate-800">{item.title}</p>
                  <p className="truncate text-[11px] text-slate-400">{areaName(item.areaCode)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  aria-label={`${item.title} 빼기`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <Icon icon="solar:trash-bin-minimalistic-linear" width={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
