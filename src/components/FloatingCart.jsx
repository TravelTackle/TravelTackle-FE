import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CART_CHANGED_EVENT, SPOT_DRAG_TYPE, addCartItem, getCartItems, removeCartItem } from '../api/cart'
import { CART_TABS, areaName, cartTheme, themeKey } from '../lib/cartThemes'
import Skeleton from './ui/Skeleton'

function isSpotDrag(e) {
  return e.dataTransfer?.types?.includes(SPOT_DRAG_TYPE)
}

// 챗봇 버튼(bottom-6) 위에 위치하는 장바구니 플로팅 버튼 + 담은 장소 패널.
// 탐색 카드(SPOT_DRAG_TYPE) 드래그가 시작되면 버튼·패널이 드롭 존으로 깨어난다.
export default function FloatingCart() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [justAddedId, setJustAddedId] = useState(null)
  const [tab, setTab] = useState('all')
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef(null)
  const highlightTimer = useRef(null)
  const dragDepth = useRef(0)

  const refresh = useCallback((withSkeleton) => {
    if (withSkeleton) setLoading(true)
    getCartItems()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  // 버튼 배지 수까지 항상 최신으로: 로그인 시 1회 + 담기/빼기 신호마다 갱신
  useEffect(() => {
    if (!user) {
      setItems([])
      return
    }
    refresh(false)
    const onChanged = () => refresh(false)
    window.addEventListener(CART_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(CART_CHANGED_EVENT, onChanged)
  }, [user, refresh])

  useEffect(() => {
    if (open && user) refresh(true)
  }, [open, user, refresh])

  // 페이지 어디서든 탐색 카드 드래그가 시작/종료되면 드롭 존 상태를 켜고 끈다
  useEffect(() => {
    const onStart = (e) => {
      if (isSpotDrag(e)) setDragActive(true)
    }
    const onEnd = () => {
      dragDepth.current = 0
      setDragActive(false)
      setDragOver(false)
    }
    window.addEventListener('dragstart', onStart)
    window.addEventListener('dragend', onEnd)
    return () => {
      window.removeEventListener('dragstart', onStart)
      window.removeEventListener('dragend', onEnd)
    }
  }, [])

  useEffect(
    () => () => {
      clearTimeout(noticeTimer.current)
      clearTimeout(highlightTimer.current)
    },
    [],
  )

  function showNotice(message) {
    setNotice(message)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 1800)
  }

  function handleDragEnter(e) {
    if (!isSpotDrag(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setDragOver(true)
  }

  function handleDragOver(e) {
    if (!isSpotDrag(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave(e) {
    if (!isSpotDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }

  async function handleDrop(e) {
    if (!isSpotDrag(e)) return
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    setDragActive(false)
    let spot
    try {
      spot = JSON.parse(e.dataTransfer.getData(SPOT_DRAG_TYPE))
    } catch {
      return
    }
    setOpen(true)
    if (!user) {
      showNotice('로그인이 필요해요')
      return
    }
    try {
      await addCartItem(spot.contentId) // 성공 시 cart:changed 신호로 목록·배지 갱신
      setTab('all') // 다른 테마 탭이 선택돼 있어도 방금 담은 항목이 보이게
      setJustAddedId(spot.contentId)
      clearTimeout(highlightTimer.current)
      highlightTimer.current = setTimeout(() => setJustAddedId(null), 2000)
      showNotice('여행 장바구니에 담았어요')
    } catch (err) {
      showNotice(err.response?.status === 409 ? '이미 장바구니에 있어요' : '장바구니에 담지 못했어요')
    }
  }

  async function handleRemove(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    try {
      await removeCartItem(item.id)
    } catch {
      setItems((prev) => [item, ...prev]) // 실패 시 되돌림
    }
  }

  const dropZoneProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }

  const visibleItems = tab === 'all' ? items : items.filter((i) => themeKey(i.contentTypeId) === tab)

  return (
    // 루트는 pointer-events-none — 닫힌 패널의 투명 영역이 클릭을 가로채지 않게
    <div className="pointer-events-none fixed bottom-24 right-6 z-40 flex flex-col items-end">
      <div className="pointer-events-none absolute -top-2 right-0 -translate-y-full">
        <div
          className={`whitespace-nowrap rounded-full bg-slate-900/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
            notice ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          {notice}
        </div>
      </div>

      <div
        className={`relative mb-3 origin-bottom-right transition-all duration-200 ${
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'
        }`}
      >
        <div
          {...dropZoneProps}
          className="relative flex h-[min(620px,calc(100vh-200px))] w-[340px] flex-col overflow-hidden rounded-[24px] bg-white shadow-popup ring-1 ring-black/5"
        >
          {user && (
            <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-slate-100 px-3 py-2.5">
              {CART_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                    tab === t.key
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {!user ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Icon icon="solar:cart-large-2-linear" width={30} className="mx-auto text-slate-300" />
                <p className="mt-3 text-[13px] font-semibold text-slate-600">로그인하면 장소를 담을 수 있어요</p>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  로그인하기
                </Link>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex flex-col gap-2.5" role="status" aria-label="담은 장소를 불러오는 중">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                    <Skeleton className="h-14 w-14 shrink-0 rounded-xl" style={{ animationDelay: `${i * 120}ms` }} />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3.5 w-12 rounded" style={{ animationDelay: `${i * 120 + 40}ms` }} />
                      <Skeleton className="mt-2 h-3.5 w-3/4" style={{ animationDelay: `${i * 120 + 80}ms` }} />
                      <Skeleton className="mt-1.5 h-2.5 w-1/3" style={{ animationDelay: `${i * 120 + 120}ms` }} />
                    </div>
                    <Skeleton className="h-7 w-7 shrink-0 self-end rounded-lg" style={{ animationDelay: `${i * 120 + 160}ms` }} />
                  </div>
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Icon icon="solar:map-point-linear" width={30} className="mx-auto text-slate-300" />
                <p className="mt-3 text-[13px] font-semibold text-slate-600">
                  {items.length === 0
                    ? '아직 담은 장소가 없어요'
                    : `담아둔 ${CART_TABS.find((t) => t.key === tab)?.label} 장소가 없어요`}
                </p>
                <p className="mt-1 text-[11.5px] text-slate-400">여행지 탐색에서 마음에 드는 곳을 담아보세요.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {visibleItems.map((item) => (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(item))}
                    className={`flex cursor-grab items-center gap-3 rounded-2xl border p-3 shadow-card transition-colors duration-700 active:cursor-grabbing ${
                      item.contentId === justAddedId ? 'border-brand/40 bg-brand-light' : 'border-slate-100 bg-white'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-xl bg-slate-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-px text-[10px] font-semibold text-slate-400">
                        <Icon icon={cartTheme(item.contentTypeId).icon} width={10} />
                        {cartTheme(item.contentTypeId).label}
                      </span>
                      <p className="mt-1 truncate text-[13px] font-bold text-slate-800">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{areaName(item.areaCode)}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      aria-label={`${item.title} 빼기`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-lg bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
                    >
                      <Icon icon="solar:trash-bin-minimalistic-linear" width={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {dragActive && (
            <div
              className={`pointer-events-none absolute inset-1.5 z-10 flex items-center justify-center rounded-[20px] border-2 border-dashed transition-colors ${
                dragOver ? 'border-brand bg-brand-light/85' : 'border-brand/40 bg-white/75'
              }`}
            >
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-brand">
                <Icon icon="solar:cart-plus-bold" width={18} />
                여기에 놓아서 담기
              </p>
            </div>
          )}
        </div>
      </div>

      {dragActive && !open && (
        <div className="pointer-events-none mb-2 whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1.5 text-[11.5px] font-bold text-white shadow-popup">
          여기에 놓아서 담기
        </div>
      )}

      <button
        {...dropZoneProps}
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-brand text-white shadow-float transition-all hover:scale-105 hover:bg-brand-dark hover:shadow-float-hover ${
          dragActive
            ? dragOver
              ? 'scale-125 shadow-float-hover ring-4 ring-brand/40'
              : 'scale-110 ring-4 ring-brand/25'
            : open
              ? ''
              : 'animate-float'
        }`}
        aria-label={open ? '장바구니 닫기' : '장바구니 열기'}
      >
        <Icon icon={open ? 'solar:close-circle-bold' : 'solar:cart-large-2-bold'} width={24} />
        {user && items.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {items.length > 99 ? '99+' : items.length}
          </span>
        )}
      </button>
    </div>
  )
}
