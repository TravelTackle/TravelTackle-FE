import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CART_CHANGED_EVENT, SPOT_DRAG_TYPE, addCartItem, getCartItems, removeCartItem } from '../api/cart'
import { CART_TABS, areaName, cartTheme, cartThemeLabel, themeKey } from '../lib/cartThemes'
import Skeleton from './ui/Skeleton'
import { useLanguage } from '../i18n'

const MIN_SKELETON_MS = 450

// 플로팅 장바구니 버튼·패널의 문구 — 담긴 장소(item.title)는 사용자가 만든 콘텐츠라 번역하지 않는다
const T = {
  ko: {
    cartTitle: '여행 장바구니',
    itemCount: (n) => `${n}개`,
    closeCart: '장바구니 닫기',
    openCart: '장바구니 열기',
    searchPlaceholder: '여행지 이름 또는 지역',
    prevFilter: '이전 필터',
    nextFilter: '다음 필터',
    loginRequired: '로그인이 필요해요',
    addedToCart: '여행 장바구니에 담았어요',
    alreadyInCart: '이미 장바구니에 있어요',
    addFailed: '장바구니에 담지 못했어요',
    removedFromCart: '장바구니에서 뺐어요',
    removeFailed: '장바구니에서 빼지 못했어요',
    loginToAddTitle: '로그인하면 장소를 담을 수 있어요',
    loginToAddDesc: '담아 둔 장소로 바로 여행 계획을 만들어요.',
    loginCta: '로그인하기',
    loadingCart: '담은 장소를 불러오는 중',
    emptyAllTitle: '아직 담은 장소가 없어요',
    emptyThemeTitle: (label) => `담아둔 ${label} 장소가 없어요`,
    emptyAllDesc: '여행지 탐색에서 카드를 끌어다 놓거나 담기를 눌러보세요.',
    emptySearchDesc: '검색어를 바꿔보세요.',
    emptyThemeDesc: '다른 테마를 골라보세요.',
    exploreCta: '여행지 탐색하기',
    removeItemLabel: (title) => `${title} 빼기`,
    dropHere: '여기에 놓아서 담기',
    createTripCta: (n) => `담은 장소 ${n}곳으로 계획 만들기`,
  },
  en: {
    cartTitle: 'Travel Cart',
    itemCount: (n) => `${n}`,
    closeCart: 'Close cart',
    openCart: 'Open cart',
    searchPlaceholder: 'Place name or region',
    prevFilter: 'Previous filter',
    nextFilter: 'Next filter',
    loginRequired: 'Please log in first',
    addedToCart: 'Added to your travel cart',
    alreadyInCart: 'Already in your cart',
    addFailed: "Couldn't add to cart",
    removedFromCart: 'Removed from cart',
    removeFailed: "Couldn't remove from cart",
    loginToAddTitle: 'Log in to save places',
    loginToAddDesc: 'Turn saved places into a trip plan instantly.',
    loginCta: 'Log in',
    loadingCart: 'Loading your saved places',
    emptyAllTitle: 'No places saved yet',
    emptyThemeTitle: (label) => `No ${label} places saved`,
    emptyAllDesc: 'Drag a card from Explore or tap Add to save a place.',
    emptySearchDesc: 'Try a different search term.',
    emptyThemeDesc: 'Try another theme.',
    exploreCta: 'Explore destinations',
    removeItemLabel: (title) => `Remove ${title}`,
    dropHere: 'Drop here to add',
    createTripCta: (n) => `Plan a trip with ${n} saved place${n === 1 ? '' : 's'}`,
  },
}

function isSpotDrag(e) {
  return e.dataTransfer?.types?.includes(SPOT_DRAG_TYPE)
}

// 챗봇 버튼(bottom-6) 위에 위치하는 장바구니 플로팅 버튼 + 담은 장소 패널.
// 탐색 카드(SPOT_DRAG_TYPE) 드래그가 시작되면 버튼·패널이 드롭 존으로 깨어난다.
export default function FloatingCart() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [justAddedId, setJustAddedId] = useState(null)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const tabsRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef(null)
  const highlightTimer = useRef(null)
  const dragDepth = useRef(0)
  // 담기/빼기 결과를 다른 페이지들과 같은 위치(화면 하단 중앙)에도 띄운다 — notice는 카트 버튼 옆에 뜨는 것과 별개
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1600)
  }

  // 패널을 열 때(withSkeleton)는 최소 MIN_SKELETON_MS 동안 스켈레톤을 보여 준 뒤 목록으로 바꾼다
  const refresh = useCallback((withSkeleton) => {
    if (withSkeleton) setLoading(true)
    const startedAt = Date.now()
    getCartItems()
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]))
      .finally(() => {
        const wait = withSkeleton ? Math.max(0, MIN_SKELETON_MS - (Date.now() - startedAt)) : 0
        setTimeout(() => setLoading(false), wait)
      })
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

  // 칩 줄 넘기기 — 나의 여행 사이드바(TripCartPanel)와 같은 동작
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

  useEffect(() => {
    updateScrollButtons()
    const el = tabsRef.current
    if (!el) return undefined
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
  }, [updateScrollButtons, open, user])

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
      showNotice(copy.loginRequired)
      return
    }
    try {
      await addCartItem(spot.contentId) // 성공 시 cart:changed 신호로 목록·배지 갱신
      setTab('all') // 다른 테마 탭이 선택돼 있어도 방금 담은 항목이 보이게
      setJustAddedId(spot.contentId)
      clearTimeout(highlightTimer.current)
      highlightTimer.current = setTimeout(() => setJustAddedId(null), 2000)
      showNotice(copy.addedToCart)
    } catch (err) {
      showNotice(err.response?.status === 409 ? copy.alreadyInCart : copy.addFailed)
    }
  }

  async function handleRemove(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    try {
      await removeCartItem(item.id)
      showToast(copy.removedFromCart)
    } catch {
      setItems((prev) => [item, ...prev]) // 실패 시 되돌림
      showToast(copy.removeFailed)
    }
  }

  const dropZoneProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }

  const q = query.trim().toLowerCase()
  const visibleItems = items
    .filter((i) => tab === 'all' || themeKey(i.contentTypeId) === tab)
    .filter((i) => !q || i.title?.toLowerCase().includes(q) || areaName(i.areaCode, language).toLowerCase().includes(q))

  return (
    <>
    {/* 루트는 pointer-events-none — 닫힌 패널의 투명 영역이 클릭을 가로채지 않게 */}
    <div className="pointer-events-none fixed bottom-24 right-6 z-40 flex flex-col items-end">
      <div className="pointer-events-none absolute -top-2 right-0 -translate-y-full">
        <div
          className={`whitespace-nowrap rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
            notice ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          {notice}
        </div>
      </div>

      {/* 모바일(<sm)에서는 화면 전체(네비바 포함)를 채우고, sm 이상에서는 기존처럼 버튼 위에 뜨는
          작은 패널 — 챗봇과 동일한 패턴, 모서리 라운드도 그대로 유지한다 */}
      <div
        className={`fixed inset-0 z-[70] origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:static sm:z-auto sm:mb-3 sm:inset-auto ${
          open
            ? 'translate-y-0 opacity-100 pointer-events-auto sm:scale-100'
            : 'translate-y-full opacity-0 pointer-events-none sm:translate-y-3 sm:scale-90'
        }`}
      >
        {/* 떠 있는 느낌을 주는 부드러운 접지 그림자 — 전체화면에선 의미 없어서 sm 이상에서만 */}
        <div className="hidden sm:block absolute -bottom-4 left-8 right-8 -z-10 h-9 rounded-full bg-slate-900/25 blur-2xl" />

        <div
          {...dropZoneProps}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-surface shadow-popup sm:h-[min(620px,calc(100vh-200px))] sm:w-[340px]"
        >
          {/* 헤더 · 검색 · 칩 — 나의 여행 사이드바(TripCartPanel)와 같은 디자인 */}
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-[14px] font-bold text-slate-800">{copy.cartTitle}</h2>
            <div className="flex items-center gap-2">
              {user && <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">{copy.itemCount(items.length)}</span>}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={copy.closeCart}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark"
              >
                <Icon icon="solar:close-circle-bold" width={18} />
              </button>
            </div>
          </div>

          {user && (
            <>
              <div className="px-4 pt-3">
                <div className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5">
                  <Icon icon="solar:magnifer-linear" width={14} className="text-slate-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="h-full w-full text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center px-4 py-3">
                <button
                  type="button"
                  onClick={() => scrollTabs(-1)}
                  aria-label={copy.prevFilter}
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
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                        tab === t.key ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-surface text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {cartThemeLabel(t.key, language)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollTabs(1)}
                  aria-label={copy.nextFilter}
                  tabIndex={canScrollRight ? 0 : -1}
                  className={`flex h-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface text-brand shadow-card transition-all duration-300 hover:border-brand hover:bg-brand-light ${
                    canScrollRight ? 'ml-1 w-6 border-slate-200 opacity-100' : 'w-0 border-transparent opacity-0'
                  }`}
                >
                  <Icon icon="mdi:chevron-right" width={16} className="shrink-0" />
                </button>
              </div>
            </>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {!user ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <Icon icon="solar:cart-large-2-linear" width={26} />
                </span>
                <p className="mt-4 text-[13.5px] font-bold text-slate-700">{copy.loginToAddTitle}</p>
                <p className="mt-1 text-[12px] text-slate-400">{copy.loginToAddDesc}</p>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  <Icon icon="solar:user-rounded-bold" width={13} /> {copy.loginCta}
                </Link>
              </div>
            ) : loading ? (
              <div className="flex flex-col gap-2.5" role="status" aria-label={copy.loadingCart}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-surface p-3">
                    <Skeleton className="h-14 w-14 shrink-0 rounded-xl" style={{ animationDelay: `${i * 120}ms` }} />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3.5 w-12 rounded" style={{ animationDelay: `${i * 120 + 40}ms` }} />
                      <Skeleton className="mt-2 h-3.5 w-3/4" style={{ animationDelay: `${i * 120 + 80}ms` }} />
                      <Skeleton className="mt-1.5 h-2.5 w-1/3" style={{ animationDelay: `${i * 120 + 120}ms` }} />
                    </div>
                    <Skeleton className="h-7 w-7 shrink-0 rounded-lg" style={{ animationDelay: `${i * 120 + 160}ms` }} />
                  </div>
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
                  <Icon icon="solar:map-point-linear" width={26} />
                </span>
                <p className="mt-4 text-[13.5px] font-bold text-slate-700">
                  {items.length === 0
                    ? copy.emptyAllTitle
                    : copy.emptyThemeTitle(cartThemeLabel(tab, language))}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                  {items.length === 0 ? copy.emptyAllDesc : q ? copy.emptySearchDesc : copy.emptyThemeDesc}
                </p>
                {items.length === 0 && (
                  <Link
                    to="/explore"
                    onClick={() => setOpen(false)}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-surface px-4 py-2 text-[12.5px] font-bold text-slate-700 transition-all hover:border-brand hover:text-brand"
                  >
                    <Icon icon="solar:compass-linear" width={14} /> {copy.exploreCta}
                  </Link>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {visibleItems.map((item) => (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(item))}
                    className={`flex cursor-grab items-center gap-3 rounded-xl border p-2.5 shadow-card transition-colors duration-700 active:cursor-grabbing ${
                      item.contentId === justAddedId ? 'border-brand/40 bg-brand-light' : 'border-slate-100 bg-surface'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-cover" />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-px text-[10px] font-semibold text-slate-400">
                        <Icon icon={cartTheme(item.contentTypeId).icon} width={10} />
                        {cartThemeLabel(cartTheme(item.contentTypeId).key, language)}
                      </span>
                      <p className="mt-0.5 truncate text-[12.5px] font-bold text-slate-800">{item.title}</p>
                      <p className="text-[11px] text-slate-400">{areaName(item.areaCode, language)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      aria-label={copy.removeItemLabel(item.title)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100"
                    >
                      <Icon icon="solar:trash-bin-minimalistic-linear" width={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 푸터 — 담은 장소로 바로 계획 만들기 */}
          {user && items.length > 0 && !loading && (
            <div className="shrink-0 border-t border-slate-100 bg-surface p-3">
              <Link
                to="/trips"
                onClick={() => setOpen(false)}
                className="group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-brand-mid to-brand text-[13.5px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_6px_16px_rgba(37,99,235,0.28)] transition-all hover:from-brand hover:to-brand-dark"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]"
                />
                <Icon icon="solar:calendar-add-bold" width={16} />
                {copy.createTripCta(items.length)}
              </Link>
            </div>
          )}

          {dragActive && (
            <div
              className={`pointer-events-none absolute inset-1.5 z-10 flex items-center justify-center rounded-[24px] border-2 border-dashed transition-colors ${
                dragOver ? 'border-brand bg-brand-light/85' : 'border-brand/40 bg-surface/75'
              }`}
            >
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-brand">
                <Icon icon="solar:cart-plus-bold" width={18} />
                {copy.dropHere}
              </p>
            </div>
          )}
        </div>
      </div>

      {dragActive && !open && (
        <div className="pointer-events-none mb-2 whitespace-nowrap rounded-full bg-black/90 px-3 py-1.5 text-[11.5px] font-bold text-white shadow-popup">
          {copy.dropHere}
        </div>
      )}

      {/* 열려 있을 때 모바일에서는 패널 자체 헤더에 닫기 버튼이 있으므로 원형 버튼은 숨긴다
          (sm 이상에서는 기존처럼 작은 패널 옆에 계속 보여준다) */}
      <button
        {...dropZoneProps}
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto relative h-14 w-14 items-center justify-center rounded-full border-[3px] border-surface bg-brand text-white shadow-float transition-all hover:scale-105 hover:bg-brand-dark hover:shadow-float-hover ${
          open ? 'hidden sm:flex' : 'flex'
        } ${
          dragActive
            ? dragOver
              ? 'scale-125 shadow-float-hover ring-4 ring-brand/40'
              : 'scale-110 ring-4 ring-brand/25'
            : open
              ? ''
              : 'animate-float'
        }`}
        aria-label={open ? copy.closeCart : copy.openCart}
        aria-expanded={open}
      >
        <span className={`flex transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-90' : 'rotate-0'}`}>
          <Icon icon={open ? 'solar:close-circle-bold' : 'solar:cart-large-2-bold'} width={24} />
        </span>
        {user && items.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {items.length > 99 ? '99+' : items.length}
          </span>
        )}
      </button>
    </div>

    {/* 여행지 탐색 등 다른 페이지들과 같은 화면 하단 중앙 팝업 — 담기/빼기 결과를 여기서도 알린다 */}
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
        toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      {toast}
    </div>
    </>
  )
}
