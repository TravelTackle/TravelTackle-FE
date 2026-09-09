import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage, LANGUAGES } from '../i18n'
import logoHorizontal from '../assets/logo-horizontal.svg'

const NAV = [
  { label: '여행지 탐색', to: '/explore' },
  { label: '여행자 피드', to: '/feed' },
  { label: '나의 여행', to: '/trips' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const profileRef = useRef(null)
  const location = useLocation()
  const langRef = useRef(null)

  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  useEffect(() => {
    function onClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    try { await logout() } catch { /* 무시 */ }
    setProfileOpen(false)
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#F4F7FA]/95 backdrop-blur">
      <div className="relative max-w-[1200px] mx-auto flex items-center gap-5 px-4 sm:px-6 h-16">
        <Link to="/" className="flex items-center shrink-0" aria-label="트레블 참견 홈">
          <img src={logoHorizontal} alt="트레블 참견" className="h-8 sm:h-9 w-auto" />
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex items-center gap-2">
          {NAV.map((n) => {
            const active = n.to && location.pathname === n.to
            const className = `flex items-center gap-1 rounded-[10px] px-4 py-1.5 text-[12px] font-bold text-white transition-colors whitespace-nowrap ${
              active ? 'bg-brand hover:bg-brand-dark' : 'bg-[#78A9EB] hover:bg-[#6699E5]'
            }`
            return n.to ? (
              <Link key={n.label} to={n.to} className={className}>
                {n.label}
              </Link>
            ) : (
              <a key={n.label} href={n.href} className={className}>
                {n.label}
                {n.caret && <Icon icon="solar:alt-arrow-down-linear" width={12} />}
              </a>
            )
          })}
        </div>

        {/* 우측 */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {user && (
            <button
              type="button"
              className="hidden sm:flex h-[30px] w-[30px] items-center justify-center text-[#78A9EB] hover:text-[#569BF9] transition-colors"
              aria-label="알림"
            >
              <Icon icon="solar:bell-linear" width={21} />
            </button>
          )}

          <div className="relative hidden sm:block" ref={langRef}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex h-[30px] items-center gap-1 rounded-[10px] border border-[#78A9EB] bg-white px-3 text-[12px] font-bold text-[#569BF9] hover:bg-blue-50 transition-colors"
              aria-label="언어 선택"
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              <Icon icon="solar:global-bold" width={16} />
              <span>{currentLang.short}</span>
              <Icon icon="solar:alt-arrow-down-linear" width={11} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>

            {langOpen && (
              <ul
                role="listbox"
                aria-label="언어 선택"
                className="absolute right-0 mt-2 w-44 max-h-[320px] overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-[0_12px_28px_rgba(15,23,42,0.12)] py-1.5 z-50"
              >
                {LANGUAGES.map((lang) => {
                  const active = lang.code === language
                  return (
                    <li key={lang.code}>
                      <button
                        role="option"
                        aria-selected={active}
                        onClick={() => { setLanguage(lang.code); setLangOpen(false) }}
                        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-[13px] transition-all ${
                          active ? 'font-bold text-brand bg-brand-light/60' : 'text-slate-600 hover:bg-slate-50'
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
                onClick={() => setProfileOpen((v) => !v)}
                className="flex h-[30px] items-center gap-1 rounded-[10px] border border-[#78A9EB] bg-white px-3 text-[#569BF9] hover:bg-blue-50 transition-colors"
                aria-expanded={profileOpen}
              >
                <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-[#BFD8FA] text-white">
                  <Icon icon="solar:user-bold" width={9} />
                </span>
                <span className="max-w-[96px] truncate text-[12px] font-bold">
                  {user.name || user.email || '회원'} 님
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl border border-slate-100 shadow-[0_12px_28px_rgba(15,23,42,0.12)] py-1.5 z-50">
                  <Link to="/mypage" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50 transition-all">
                    <Icon icon="solar:user-circle-linear" width={16} /> 마이페이지
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-rose-500 hover:bg-rose-50 transition-all">
                    <Icon icon="solar:logout-2-linear" width={16} /> 로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex h-[30px] items-center gap-1 rounded-[10px] border border-[#78A9EB] bg-white px-3 text-[12px] font-bold text-[#569BF9] hover:bg-blue-50 transition-colors whitespace-nowrap">
              <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#BFD8FA] text-white">
                <Icon icon="solar:user-bold" width={9} />
              </span>
              로그인
            </Link>
          )}

          {/* 모바일 메뉴 토글 */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-white/60 transition-all"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
          >
            <Icon icon={menuOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} width={20} />
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-3 flex flex-col">
          {NAV.map((n) => {
            const active = n.to && location.pathname === n.to
            const className = `font-semibold text-[14px] rounded-lg px-3 py-3 hover:bg-slate-50 ${active ? 'text-brand' : 'text-slate-700'}`
            return n.to ? (
              <Link key={n.label} to={n.to} onClick={() => setMenuOpen(false)} className={className}>
                {n.label}
              </Link>
            ) : (
              <a key={n.label} href={n.href} onClick={() => setMenuOpen(false)} className={className}>
                {n.label}
              </a>
            )
          })}

          {/* 데스크톱 선택기가 sm 미만에서 숨겨지므로 모바일에서는 여기서 언어를 바꾼다 */}
          <div className="mt-2 border-t border-slate-100 pt-3">
            <p className="flex items-center gap-1.5 px-3 text-[12px] font-bold text-slate-400">
              <Icon icon="solar:global-linear" width={14} /> 언어 선택
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 px-3 pb-1" role="listbox" aria-label="언어 선택">
              {LANGUAGES.map((lang) => {
                const active = lang.code === language
                return (
                  <button
                    key={lang.code}
                    role="option"
                    aria-selected={active}
                    onClick={() => { setLanguage(lang.code); setMenuOpen(false) }}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      active
                        ? 'border-brand bg-brand-light text-brand font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lang.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
