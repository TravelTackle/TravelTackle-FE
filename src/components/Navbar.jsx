import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LANGUAGES } from '../i18n'
import { useTheme, THEME_MODES } from '../theme'
import logoHorizontal from '../assets/logo-horizontal.svg'
import logoHorizontalDark from '../assets/logo-horizontal-dark.svg' // '트레블' 글자만 밝은 색 — 다크 모드에서 검정 글자가 묻히지 않게
import { useNotifications } from '../notifications/NotificationContext'
import NotificationPanel from './NotificationPanel'
import Skeleton from './ui/Skeleton'
import Avatar from './ui/Avatar'

const NAV = [
  { label: '여행지 탐색', to: '/explore', icon: 'solar:map-point-linear' },
  { label: '여행자 피드', to: '/feed', icon: 'solar:gallery-wide-linear' },
  {
    label: '나의 여행',
    icon: 'solar:suitcase-tag-linear',
    match: (p) => p === '/trips' || p === '/trips/saved',
    children: [
      { label: '나의 계획', to: '/trips', icon: 'solar:suitcase-tag-linear' },
      { label: '보관함', to: '/trips/saved', icon: 'solar:bookmark-linear' },
    ],
  },
]

const POPOVER_BASE = 'nav-pop z-50 rounded-2xl border border-slate-100 bg-surface shadow-popup ring-1 ring-black/5'
const POPOVER = `${POPOVER_BASE} absolute right-0 mt-2`

// 아바타는 ui/Avatar로 옮겼다 — 기존 import 경로(Navbar의 Avatar) 호환용 재수출
export { Avatar }

// 가운데 메뉴 — 마우스가 머무는 항목 아래로 알약이 미끄러지고, 손을 떼면 현재 페이지로 돌아간다
function DesktopNav({ pathname }) {
  const itemRefs = useRef([])
  const [hover, setHover] = useState(null)
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const activeIdx = NAV.findIndex((n) => (n.match ? n.match(pathname) : n.to === pathname))
  const target = hover ?? (activeIdx >= 0 ? activeIdx : null)
  const trackRef = useRef(null)

  // 드롭다운(나의 계획/보관함) 안에서도 위쪽 3개 메뉴와 같은 슬라이딩 알약을 쓴다 — 세로 버전.
  // 항목 높이가 h-9(36px)로 고정돼 있어 DOM 측정 없이 인덱스만으로 위치를 계산한다.
  // 알약을 담는 ul 자체에는 패딩을 주지 않는다(패딩은 바깥 래퍼로 옮김) — ul에 패딩이 있으면
  // absolute 자식의 top:0 기준이 "패딩 바깥쪽 padding box"가 되어, 실제 li가 시작하는
  // content box 위치와 안 맞아 알약이 어긋나 보이는 문제가 있었다.
  const DROPDOWN_ITEM_HEIGHT = 36
  const DROPDOWN_ITEM_GAP = 4
  const dropdownGroup = NAV.find((n) => n.children)
  const [childHover, setChildHover] = useState(null)
  const childActiveIdx = dropdownGroup ? dropdownGroup.children.findIndex((c) => c.to === pathname) : -1
  const childTarget = childHover ?? (childActiveIdx >= 0 ? childActiveIdx : null)

  useEffect(() => {
    if (!dropdownOpen) setChildHover(null)
  }, [dropdownOpen])

  // 나의 여행 드롭다운 — 바깥 클릭/Esc로 닫고, 페이지가 바뀌면 자동으로 닫는다
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])
  useEffect(() => setDropdownOpen(false), [pathname])

  // 알약 위치는 항목의 실제 크기로 잰다. 아이콘(Iconify)과 웹폰트가 늦게 로드되면 항목 너비가 뒤늦게 바뀌므로
  // ResizeObserver로 항목 크기 변화를 지켜보다가 다시 잰다 — 페이지를 옮겼을 때 알약이 어긋나던 원인.
  // offsetLeft 대신 getBoundingClientRect 차이로 잰다 — "나의 여행" 항목은 드롭다운 때문에 감싸는
  // position:relative div가 하나 더 있어서, offsetLeft 기준으로는 그 div가 offsetParent가 되어
  // trackRef 기준 위치가 아니라 엉뚱한(거의 0에 가까운) 값이 나왔던 것이 원인.
  useLayoutEffect(() => {
    const measure = () => {
      const el = target != null ? itemRefs.current[target] : null
      if (!el || !trackRef.current) {
        setPill((p) => ({ ...p, visible: false }))
        return
      }
      const trackRect = trackRef.current.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      setPill({ left: elRect.left - trackRect.left, width: elRect.width, visible: true })
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
      className="absolute left-1/2 hidden -translate-x-1/2 md:flex items-center rounded-full bg-black/[0.035] p-1"
      onMouseLeave={() => setHover(null)}
    >
      <span
        aria-hidden="true"
        className={`nav-pill pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-full bg-surface shadow-card ${
          pill.visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `translateX(${pill.left}px)`, width: pill.width, left: 0 }}
      />
      {NAV.map((n, i) => {
        const active = i === activeIdx
        const itemClass = `relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors duration-200 ${
          active ? 'text-brand' : 'text-slate-600 hover:text-slate-900'
        }`

        if (n.children) {
          return (
            <div
              key={n.label}
              className="relative"
              ref={dropdownRef}
              onMouseEnter={() => {
                setHover(i)
                setDropdownOpen(true)
              }}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <Link
                to="/trips"
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                aria-current={active ? 'page' : undefined}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors duration-200 ${
                  active ? 'text-brand' : dropdownOpen ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                <Icon icon={n.icon} width={15} className={active ? 'text-brand' : 'text-slate-400'} />
                {n.label}
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  width={10}
                  className={`text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </Link>

              {/* 트리거 바로 아래를 빈틈없이 채워서, 포인터가 버튼→메뉴로 내려가는 동안 hover가 끊기지 않게 함.
                  nav-pop은 다른 팝오버(프로필/언어/알림)에서 이미 쓰는 등장 애니메이션 재사용 —
                  거긴 우측 정렬이라 top right가 기준점이지만 여긴 가운데 정렬이라 top center로 바꿔 쓴다 */}
              {dropdownOpen && (
                <div
                  className="nav-pop absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2"
                  style={{ transformOrigin: 'top center' }}
                >
                  {/* 패딩은 여기(바깥 래퍼)에 — 안쪽 ul은 패딩 0이라 top:0이 li가 시작하는 위치와 정확히 같다 */}
                  <div className="w-36 rounded-2xl bg-surface/90 p-1.5 backdrop-blur-sm">
                    <ul role="menu" className="relative flex flex-col gap-1">
                      <span
                        aria-hidden="true"
                        className={`nav-pill pointer-events-none absolute inset-x-0 top-0 h-9 rounded-full bg-brand-light shadow-card ${
                          childTarget != null ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          transform: `translateY(${(childTarget ?? 0) * (DROPDOWN_ITEM_HEIGHT + DROPDOWN_ITEM_GAP)}px)`,
                        }}
                      />
                      {n.children.map((c, ci) => {
                        const childHighlighted = ci === childTarget
                        return (
                          <li key={c.to}>
                            <Link
                              to={c.to}
                              role="menuitem"
                              onMouseEnter={() => setChildHover(ci)}
                              onClick={() => setDropdownOpen(false)}
                              className={`relative z-10 flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13.5px] font-bold transition-colors duration-200 ${
                                childHighlighted ? 'text-brand' : 'text-slate-600'
                              }`}
                            >
                              <Icon icon={c.icon} width={14} className={childHighlighted ? 'text-brand' : 'text-slate-400'} />
                              {c.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        }

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
            className={itemClass}
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
  const [sheetThemeOpen, setSheetThemeOpen] = useState(false) // 모바일 시트 안 "화면 모드" 줄을 눌러 펼친 상태
  const [profileOpen, setProfileOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const [notiOpen, setNotiOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, loading: authLoading, logout } = useAuth()
  const { mode: themeMode, resolved: theme, setMode: setThemeMode, toggle: toggleTheme } = useTheme()
  const profileRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const notiRef = useRef(null)

  // 알림(참견·스크랩) — 배지 수와 목록은 NotificationContext가 관리한다. 목록은 종을 열 때 처음 받는다
  const { unreadCount, loaded: notiLoaded, load: loadNotifications } = useNotifications()

  // 상단바 언어 표기는 ko 고정 — 마이페이지 국적(언어 값)과 무관
  const currentLang = LANGUAGES[0]

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
      if (notiRef.current && !notiRef.current.contains(e.target)) setNotiOpen(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') {
        setProfileOpen(false)
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

  // 메뉴를 닫으면 안에서 펼쳐뒀던 화면 모드 줄도 접어 둔다 — 다음에 열었을 때 항상 접힌 채로 시작
  useEffect(() => {
    if (!menuOpen) {
      setSheetThemeOpen(false)
    }
  }, [menuOpen])

  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* 무시 */
    }
    setProfileOpen(false)
    navigate('/')
  }

  // 언어 변경은 추후 지원 예정 — 드롭다운 없이 안내 토스트만 띄운다(UI 언어는 ko 고정)
  function showLanguageNotice() {
    setToast('언어 변경은 추후 지원 예정이에요')
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }

  const iconButton =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
  const pillButton =
    'flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-surface px-3 text-[12.5px] font-bold text-slate-700 transition-all hover:border-slate-300 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

  return (
    <>
    <nav
      className={`sticky top-0 border-b backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300 ${
        menuOpen ? 'z-[60]' : 'z-40'
      } ${scrolled ? 'border-slate-200/80 bg-surface/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)]' : 'border-transparent bg-slate-50/85'}`}
    >
      {/* 모바일 메뉴가 열려 있는 동안 그 아래(시트~화면 끝)만 딤 처리 — top-16(탑바 높이)부터 시작해야
          한다. inset-0으로 탑바까지 덮으면, 탑바 안쪽 빈 공간(로고·아이콘 사이 여백)엔 배경색이 없어서
          그 밑에 깔린 이 딤이 비쳐 보여 탑바 전체가 살짝 어두운 회색으로 보이는 문제가 있었다. */}
      {menuOpen && (
        <div
          className="fixed inset-x-0 top-16 bottom-0 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="relative mx-auto flex h-16 max-w-[1200px] items-center gap-5 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center transition-transform hover:scale-[1.02]" aria-label="트레블 참견 홈">
          <img src={theme === 'dark' ? logoHorizontalDark : logoHorizontal} alt="트레블 참견" className="h-8 w-auto sm:h-9" />
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
                <div className="relative" ref={notiRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      setNotiOpen((v) => {
                        if (!v && !notiLoaded) loadNotifications()
                        return !v
                      })
                    }}
                    className={`${iconButton} ${notiOpen ? 'bg-slate-900/5 text-slate-900' : ''}`}
                    aria-label={unreadCount > 0 ? `알림 · 읽지 않은 알림 ${unreadCount}개` : '알림'}
                    aria-expanded={notiOpen}
                    aria-haspopup="dialog"
                  >
                    {/* 미읽음 수가 바뀌면 종이 한 번 흔들린다 (key로 애니메이션 재생) */}
                    <span key={unreadCount} className={`flex ${unreadCount > 0 ? 'bell-ring' : ''}`}>
                      <Icon icon={unreadCount > 0 ? 'solar:bell-bing-bold' : 'solar:bell-linear'} width={20} />
                    </span>
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-surface">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* 모바일에선 종이 오른쪽 끝에 붙어 있어 right-0 팝오버가 왼쪽 화면 밖으로 나간다 — 화면에 고정해 좌우 여백을 맞춘다 */}
                  {notiOpen && (
                    <div
                      role="dialog"
                      aria-label="알림"
                      className={`${POPOVER} overflow-hidden sm:w-[360px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[68px] max-sm:mt-0`}
                    >
                      <NotificationPanel onNavigate={() => setNotiOpen(false)} />
                    </div>
                  )}
                </div>
              )}

              {/* 라이트/다크 전환 — 지금 보이는 모드의 반대편 아이콘(다크면 해, 라이트면 달). sm 미만
                  (모바일)에서는 아래 시트 안에 언어와 같은 축약형 줄로 넣고, 상단바에서는 뺐다. */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`${iconButton} hidden sm:flex`}
                aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
                title={themeMode === 'system' ? '시스템 설정을 따르는 중' : undefined}
              >
                <span key={theme} className="ai-pop flex">
                  <Icon icon={theme === 'dark' ? 'solar:sun-2-linear' : 'solar:moon-linear'} width={19} />
                </span>
              </button>

              {/* 언어 선택 — sm 미만(모바일)에서는 상단바에서 빼고 아래 모바일 시트 안에 축약형으로
                  넣는다. 아이콘만 있는 버튼으로 상단바에 올려봤는데, 다크모드와 달리 언어는 매번
                  누를 일이 적어 시트 안에 있는 게 더 자연스럽다는 피드백으로 되돌렸다 */}
              <div className="hidden sm:block">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    setNotiOpen(false)
                    showLanguageNotice()
                  }}
                  className={pillButton}
                  aria-label="언어 (추후 지원 예정)"
                >
                  <Icon icon="solar:global-linear" width={15} className="text-slate-500" />
                  <span>{currentLang.short}</span>
                </button>
              </div>

              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => {
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
                    <div
                      role="menu"
                      className={`${POPOVER} w-52 py-1.5 max-sm:fixed max-sm:inset-x-3 max-sm:top-[68px] max-sm:w-auto max-sm:mt-0`}
                    >
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

      {/* 모바일 시트 — 챗봇·장바구니 패널처럼 기존 콘텐츠 위에 한 겹 얹히는 오버레이다. 원래는 nav의
          보통 흐름 안에 있어서 펼쳐지는 만큼 아래 콘텐츠를 밀어냈는데, fixed로 빼서 탑바(h-16) 바로
          아래에 떠 있게 하고 페이지 자체는 그대로 둔다. 뒤 콘텐츠와 확실히 구분되도록 아래쪽에
          그림자를 준다. */}
      {menuOpen && (
        <div className="nav-sheet fixed inset-x-0 top-16 z-10 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-100 bg-surface px-4 pb-4 pt-2 shadow-popup md:hidden">
          <div className="flex flex-col">
            {NAV.flatMap((n) => (n.children ? n.children : [n])).map((n) => {
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
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-surface text-brand' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon icon={n.icon} width={16} />
                  </span>
                  {n.label}
                  <Icon icon="solar:alt-arrow-right-linear" width={14} className="ml-auto text-slate-300" />
                </Link>
              )
            })}
          </div>

          {/* 화면 모드 — 현재 모드만 한 줄로 보여주고, 누르면 라이트/다크/시스템 3버튼이 펼쳐진다. */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setSheetThemeOpen((v) => !v)}
              aria-expanded={sheetThemeOpen}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Icon icon="solar:pallete-2-linear" width={16} className="text-slate-400" />
                화면 모드
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                {THEME_MODES.find((m) => m.key === themeMode)?.label}
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  width={12}
                  className={`transition-transform duration-300 ${sheetThemeOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
            {sheetThemeOpen && (
              <div className="mt-2 flex gap-1.5 px-3" role="radiogroup" aria-label="화면 모드">
                {THEME_MODES.map((m) => {
                  const active = themeMode === m.key
                  return (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setThemeMode(m.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        active ? 'border-brand bg-brand-light font-bold text-brand' : 'border-slate-200 bg-surface text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon icon={m.icon} width={14} />
                      {m.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 언어 — 추후 지원 예정이라 목록 없이 누르면 안내 토스트만 띄운다 */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={showLanguageNotice}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Icon icon="solar:global-linear" width={16} className="text-slate-400" />
                언어
              </span>
              <span className="text-slate-400">{currentLang.label}</span>
            </button>
          </div>

        </div>
      )}
    </nav>
    <div
      role="status"
      className={`fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
        toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      {toast}
    </div>
    </>
  )
}
