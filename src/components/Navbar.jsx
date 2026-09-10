import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage, LANGUAGES } from '../i18n'
import logoHorizontal from '../assets/logo-horizontal.svg'
import { getReceivedFeedback } from '../api/feed'
import { formatDate } from '../lib/homeFormat'

const NAV = [
  { label: '여행지 탐색', to: '/explore' },
  { label: '여행자 피드', to: '/feed' },
  { label: '나의 여행', to: '/trips' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)
  const [received, setReceived] = useState({ items: [], loading: false, error: false })
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const profileRef = useRef(null)
  const location = useLocation()
  const langRef = useRef(null)
  const notiRef = useRef(null)

  // 내 계획에 달린 참견(미읽음 수) — 로그인 시 한 번, 알림을 열 때마다 새로 고침
  const loadReceived = useCallback(() => {
    setReceived((r) => ({ ...r, loading: true, error: false }))
    getReceivedFeedback()
      .then((items) => setReceived({ items: items || [], loading: false, error: false }))
      .catch(() => setReceived({ items: [], loading: false, error: true }))
  }, [])

  useEffect(() => {
    if (user) loadReceived()
    else setReceived({ items: [], loading: false, error: false })
  }, [user, loadReceived])

  const unreadTotal = received.items.reduce((sum, t) => sum + (t.unreadCount || 0), 0)

  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  useEffect(() => {
    function onClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
      if (notiRef.current && !notiRef.current.contains(e.target)) setNotiOpen(false)
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
            <div className="relative hidden sm:block" ref={notiRef}>
              <button
                type="button"
                onClick={() => {
                  setNotiOpen((v) => {
                    if (!v) loadReceived()
                    return !v
                  })
                }}
                className="relative flex h-[30px] w-[30px] items-center justify-center text-[#78A9EB] hover:text-[#569BF9] transition-colors"
                aria-label={unreadTotal > 0 ? `알림 · 읽지 않은 참견 ${unreadTotal}개` : '알림'}
                aria-expanded={notiOpen}
                aria-haspopup="dialog"
              >
                <Icon icon={unreadTotal > 0 ? 'solar:bell-bing-bold' : 'solar:bell-linear'} width={21} />
                {unreadTotal > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-[#F4F7FA]">
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </span>
                )}
              </button>

              {notiOpen && (
                <div
                  role="dialog"
                  aria-label="내 계획에 달린 참견"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-[0_12px_28px_rgba(15,23,42,0.12)] py-2 z-50"
                >
                  <div className="flex items-center justify-between px-3.5 pb-2 border-b border-slate-100">
                    <span className="text-[12.5px] font-bold text-slate-800">내 계획에 달린 참견</span>
                    {unreadTotal > 0 && <span className="text-[11px] font-bold text-rose-500">새 참견 {unreadTotal}</span>}
                  </div>
                  {received.loading && received.items.length === 0 ? (
                    <p className="px-3.5 py-4 text-[12px] text-slate-400">불러오는 중…</p>
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
                            className="flex items-start gap-2.5 px-3.5 py-2 hover:bg-slate-50 transition-colors"
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.unreadCount > 0 ? 'bg-rose-500' : 'bg-slate-200'}`}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-bold text-slate-800">{t.tripTitle}</span>
                              <span className="block text-[11px] text-slate-400">
                                참견 {t.totalFeedbackCount}개
                                {t.unreadCount > 0 && <span className="text-rose-500 font-semibold"> · 새 참견 {t.unreadCount}</span>}
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
