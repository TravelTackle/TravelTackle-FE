import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage, LANGUAGES } from '../i18n'
import logoHorizontal from '../assets/logo-horizontal.svg'
import { getReceivedFeedback } from '../api/feed'
import { formatDate } from '../lib/homeFormat'
import Skeleton from './ui/Skeleton'

const NAV = [
  { label: '여행지 탐색', to: '/explore', icon: 'solar:map-point-linear' },
  { label: '여행자 피드', to: '/feed', icon: 'solar:gallery-wide-linear' },
  { label: '나의 여행', to: '/trips', icon: 'solar:suitcase-tag-linear' },
]

const POPOVER = 'nav-pop absolute right-0 mt-2 z-50 rounded-2xl border border-slate-100 bg-white shadow-popup ring-1 ring-black/5'

function initialOf(user) {
  const source = user?.name || user?.email || ''
  return source.trim().charAt(0).toUpperCase() || '·'
}

// 아바타 — 이름 첫 글자를 브랜드 그라디언트 원 안에
function Avatar({ user, size = 28 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-mid font-extrabold text-white ring-2 ring-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {initialOf(user)}
    </span>
  )
}

// 가운데 메뉴 — 마우스가 머무는 항목 아래로 알약이 미끄러지고, 손을 떼면 현재 페이지로 돌아간다
function DesktopNav({ pathname }) {
  const itemRefs = useRef([])
  const [hover, setHover] = useState(null)
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false })

  const activeIdx = NAV.findIndex((n) => n.to === pathname)
  const target = hover ?? (activeIdx >= 0 ? activeIdx : null)
  const trackRef = useRef(null)

  // 알약 위치는 항목의 실제 크기로 잰다. 아이콘(Iconify)과 웹폰트가 늦게 로드되면 항목 너비가 뒤늦게 바뀌므로
  // ResizeObserver로 항목 크기 변화를 지켜보다가 다시 잰다 — 페이지를 옮겼을 때 알약이 어긋나던 원인.
  useLayoutEffect(() => {
    const measure = () => {
      const el = target != null ? itemRefs.current[target] : null
      if (!el) {
        setPill((p) => ({ ...p, visible: false }))
        return
      }
      setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true })
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    itemRefs.current.forEach((el) => el && observer?.observe(el))
    if (trackRef.current) observer?.observe(trackRef.current)
    document.fonts?.ready?.then(measure)
    window.addEventListener('resize', measure)
    // 감시가 붙기 전에 아이콘이 들어온 경우까지 덮는 시간차 재측정
    const timers = [120, 400, 1000, 2000].map((ms) => setTimeout(measure, ms))
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      timers.forEach(clearTimeout)
    }
  }, [target, pathname])

  return (
    <div
      ref={trackRef}
      className="absolute left-1/2 hidden -translate-x-1/2 md:flex items-center rounded-full bg-slate-900/[0.035] p-1"
      onMouseLeave={() => setHover(null)}
    >
      <span
        aria-hidden="true"
        className={`nav-pill pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-full bg-white shadow-card ${
          pill.visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `translateX(${pill.left}px)`, width: pill.width, left: 0 }}
      />
      {NAV.map((n, i) => {
        const active = i === activeIdx
        return (
          <Link
            key={n.to}
            to={n.to}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-current={active ? 'page' : undefined}
            className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors duration-200 ${
              active ? 'text-brand' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon icon={n.icon} width={15} className={active ? 'text-brand' : 'text-slate-400'} />
            {n.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [received, setReceived] = useState({ items: [], loading: false, error: false })
  const { user, loading: authLoading, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const profileRef = useRef(null)
  const location = useLocation()
  const langRef = useRef(null)
  const notiRef = useRef(null)

  // 내 계획에 달린 참견(미읽음 수) — 로그인 시 한 번, 알림을 열 때마다 새로 고침
  const loadReceived = useCallback(() => {
    setReceived((r) => ({ ...r, loading: true, error: false }))
    getReceivedFeedback()
      .then((items) => setReceived({ items: Array.isArray(items) ? items : [], loading: false, error: false }))
      .catch(() => setReceived({ items: [], loading: false, error: true }))
  }, [])

  useEffect(() => {
    if (user) loadReceived()
    else setReceived({ items: [], loading: false, error: false })
  }, [user, loadReceived])

  const unreadTotal = received.items.reduce((sum, t) => sum + (t.unreadCount || 0), 0)
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  // 스크롤이 시작되면 바가 살짝 떠오른다 (더 하얗게 + 그림자)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
      if (notiRef.current && !notiRef.current.contains(e.target)) setNotiOpen(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setLangOpen(false)
        setNotiOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  // 페이지가 바뀌면 열려 있던 모바일 메뉴를 닫는다
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* 무시 */
    }
    setProfileOpen(false)
  }

  const iconButton =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
  const pillButton =
    'flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 transition-all hover:border-slate-300 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

  return (
    <nav
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled ? 'border-slate-200/80 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)]' : 'border-transparent bg-[#F4F7FA]/85'
      }`}
    >
      <div className="relative mx-auto flex h-16 max-w-[1200px] items-center gap-5 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center transition-transform hover:scale-[1.02]" aria-label="트레블 참견 홈">
          <img src={logoHorizontal} alt="트레블 참견" className="h-8 w-auto sm:h-9" />
        </Link>

        <DesktopNav pathname={location.pathname} />

        {/* 우측 */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {authLoading ? (
            // 로그인 확인 중 — "로그인" 버튼이 떴다가 이름으로 바뀌는 깜빡임 대신 자리를 잡아 둔다
            <div className="flex items-center gap-2" role="status" aria-label="로그인 정보를 확인하는 중">
              <Skeleton className="hidden h-9 w-9 rounded-full sm:block" />
              <Skeleton className="hidden h-9 w-[76px] rounded-full sm:block" />
              <Skeleton className="h-9 w-[92px] rounded-full" />
            </div>
          ) : (
            <>
              {user && (
                <div className="relative hidden sm:block" ref={notiRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      setLangOpen(false)
                      setNotiOpen((v) => {
                        if (!v) loadReceived()
                        return !v
                      })
                    }}
                    className={`${iconButton} ${notiOpen ? 'bg-slate-900/5 text-slate-900' : ''}`}
                    aria-label={unreadTotal > 0 ? `알림 · 읽지 않은 참견 ${unreadTotal}개` : '알림'}
                    aria-expanded={notiOpen}
                    aria-haspopup="dialog"
                  >
                    <Icon icon={unreadTotal > 0 ? 'solar:bell-bing-bold' : 'solar:bell-linear'} width={20} />
                    {unreadTotal > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-white">
                        {unreadTotal > 99 ? '99+' : unreadTotal}
                      </span>
                    )}
                  </button>

                  {notiOpen && (
                    <div role="dialog" aria-label="내 계획에 달린 참견" className={`${POPOVER} w-72 py-2`}>
                      <div className="flex items-center justify-between border-b border-slate-100 px-3.5 pb-2">
                        <span className="text-[12.5px] font-bold text-slate-800">내 계획에 달린 참견</span>
                        {unreadTotal > 0 && <span className="text-[11px] font-bold text-rose-500">새 참견 {unreadTotal}</span>}
                      </div>
                      {received.loading && received.items.length === 0 ? (
                        <ul className="flex flex-col gap-2.5 px-3.5 py-3" role="status" aria-label="알림을 불러오는 중">
                          {[0, 1].map((i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <Skeleton className="mt-1.5 h-2 w-2 rounded-full" />
                              <div className="flex-1">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="mt-1.5 h-2.5 w-1/2" />
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : received.error ? (
                        <p className="px-3.5 py-4 text-[12px] text-rose-500">알림을 불러오지 못했어요.</p>
                      ) : received.items.length === 0 ? (
                        <p className="px-3.5 py-4 text-[12px] leading-relaxed text-slate-400">
                          아직 달린 참견이 없어요. 계획을 공개하면 다른 여행자의 참견을 받을 수 있어요.
                        </p>
                      ) : (
                        <ul className="max-h-[320px] overflow-y-auto py-1">
                          {received.items.map((t) => (
                            <li key={t.tripId}>
                              <Link
                                to="/trips"
                                onClick={() => setNotiOpen(false)}
                                className="flex items-start gap-2.5 px-3.5 py-2 transition-colors hover:bg-slate-50"
                              >
                                <span
                                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.unreadCount > 0 ? 'bg-rose-500' : 'bg-slate-200'}`}
                                  aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-bold text-slate-800">{t.tripTitle}</span>
                                  <span className="block text-[11px] text-slate-400">
                                    참견 {t.totalFeedbackCount}개
                                    {t.unreadCount > 0 && <span className="font-semibold text-rose-500"> · 새 참견 {t.unreadCount}</span>}
                                    {t.latestFeedbackAt && ` · ${formatDate(t.latestFeedbackAt)}`}
                                  </span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="relative hidden sm:block" ref={langRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    setNotiOpen(false)
                    setLangOpen((v) => !v)
                  }}
                  className={`${pillButton} ${langOpen ? 'border-slate-300 shadow-card' : ''}`}
                  aria-label="언어 선택"
                  aria-expanded={langOpen}
                  aria-haspopup="listbox"
                >
                  <Icon icon="solar:global-linear" width={15} className="text-slate-500" />
                  <span>{currentLang.short}</span>
                  <Icon
                    icon="solar:alt-arrow-down-linear"
                    width={11}
                    className={`text-slate-400 transition-transform duration-300 ${langOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {langOpen && (
                  <ul role="listbox" aria-label="언어 선택" className={`${POPOVER} max-h-[320px] w-44 overflow-y-auto py-1.5`}>
                    {LANGUAGES.map((lang) => {
                      const active = lang.code === language
                      return (
                        <li key={lang.code}>
                          <button
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              setLanguage(lang.code)
                              setLangOpen(false)
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-[13px] transition-colors ${
                              active ? 'bg-brand-light/60 font-bold text-brand' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{lang.label}</span>
                            {active && <Icon icon="solar:check-bold" width={14} />}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setLangOpen(false)
                      setNotiOpen(false)
                      setProfileOpen((v) => !v)
                    }}
                    className={`${pillButton} pl-1 pr-2.5 ${profileOpen ? 'border-slate-300 shadow-card' : ''}`}
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                    aria-label={`${user.name || user.email || '회원'} 계정 메뉴`}
                  >
                    <Avatar user={user} />
                    <span className="hidden max-w-[96px] truncate sm:inline">{user.name || user.email || '회원'}</span>
                    <Icon
                      icon="solar:alt-arrow-down-linear"
                      width={11}
                      className={`hidden text-slate-400 transition-transform duration-300 sm:inline ${profileOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {profileOpen && (
                    <div role="menu" className={`${POPOVER} w-52 py-1.5`}>
                      <div className="flex items-center gap-2.5 border-b border-slate-100 px-3.5 pb-2.5 pt-1.5">
                        <Avatar user={user} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold text-slate-800">{user.name || '회원'}</div>
                          {user.email && <div className="truncate text-[11px] text-slate-400">{user.email}</div>}
                        </div>
                      </div>
                      <Link
                        to="/mypage"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Icon icon="solar:user-circle-linear" width={16} /> 마이페이지
                      </Link>
                      <Link
                        to="/trips"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Icon icon="solar:suitcase-tag-linear" width={16} /> 나의 여행
                      </Link>
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-rose-500 transition-colors hover:bg-rose-50"
                      >
                        <Icon icon="solar:logout-2-linear" width={16} /> 로그아웃
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="group relative flex h-9 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-gradient-to-b from-brand-mid to-brand pl-3 pr-4 text-[13px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(15,23,42,0.12)] transition-all duration-200 hover:from-brand hover:to-brand-dark hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {/* 마우스를 올리면 왼쪽에서 오른쪽으로 한 번 스치는 빛 */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]"
                  />
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <Icon icon="solar:user-rounded-bold" width={12} />
                  </span>
                  로그인
                </Link>
              )}
            </>
          )}

          {/* 모바일 메뉴 토글 */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`${iconButton} md:hidden`}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
          >
            <span className={`flex transition-transform duration-300 ${menuOpen ? 'rotate-90' : ''}`}>
              <Icon icon={menuOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} width={20} />
            </span>
          </button>
        </div>
      </div>

      {/* 모바일 시트 */}
      {menuOpen && (
        <div className="nav-sheet border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col">
            {NAV.map((n) => {
              const active = location.pathname === n.to
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-semibold transition-colors ${
                    active ? 'bg-brand-light text-brand' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-white text-brand' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon icon={n.icon} width={16} />
                  </span>
                  {n.label}
                  <Icon icon="solar:alt-arrow-right-linear" width={14} className="ml-auto text-slate-300" />
                </Link>
              )
            })}
          </div>

          {/* 데스크톱 선택기가 sm 미만에서 숨겨지므로 모바일에서는 여기서 언어를 바꾼다 */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="flex items-center gap-1.5 px-3 text-[12px] font-bold text-slate-400">
              <Icon icon="solar:global-linear" width={14} /> 언어 선택
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 px-3" role="listbox" aria-label="언어 선택">
              {LANGUAGES.map((lang) => {
                const active = lang.code === language
                return (
                  <button
                    key={lang.code}
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLanguage(lang.code)
                      setMenuOpen(false)
                    }}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      active ? 'border-brand bg-brand-light font-bold text-brand' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lang.label}
                  </button>
                )
              })}
            </div>
          </div>

          {!authLoading && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              {user ? (
                <div className="flex items-center gap-3 px-3">
                  <Avatar user={user} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-slate-800">{user.name || '회원'}</div>
                    {user.email && <div className="truncate text-[11.5px] text-slate-400">{user.email}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-mid to-brand text-[13.5px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-colors hover:from-brand hover:to-brand-dark"
                >
                  <Icon icon="solar:user-rounded-bold" width={15} />
                  로그인하고 참견 시작하기
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
