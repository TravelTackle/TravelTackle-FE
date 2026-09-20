import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Section from './ui/Section'
import Button from './ui/Button'
import logoHorizontal from '../assets/logo-horizontal.svg'
import logoHorizontalDark from '../assets/logo-horizontal-dark.svg'
import { useTheme } from '../theme'

const SUPPORT_EMAIL = 'traveltackleteam@gmail.com'
const GITHUB_URL = 'https://github.com/TravelTackle'
const INSTAGRAM_URL = 'https://instagram.com/traveltackle'

// 서비스 그룹만 2열 그리드 — Navbar 메뉴(여행지 탐색/여행자 피드/나의 계획·보관함)와 마이페이지를 그대로 대응
const SERVICE_LINKS = [
  { label: '홈', to: '/' },
  { label: '여행지 탐색', to: '/explore' },
  { label: '여행자 피드', to: '/feed' },
  { label: '나의 계획', to: '/trips' },
  { label: '보관함', to: '/trips/saved' },
  { label: '마이페이지', to: '/mypage' },
]

// 고객지원 페이지의 세 탭으로 바로 이동 — SupportPage.jsx의 tab 쿼리 파라미터와 짝을 맞춘다
const SUPPORT_LINKS = [
  { label: '자주 묻는 질문', to: '/support?tab=faq' },
  { label: '이용약관', to: '/support?tab=terms' },
  { label: '개인정보처리방침', to: '/support?tab=privacy' },
]

// 이미 그 페이지에 있을 때 링크를 눌러도 라우터는 아무 것도 하지 않으므로(같은 경로 이동),
// 그 경우엔 맨 위로 부드럽게 스크롤해준다 — 모든 푸터 링크에 동일하게 적용.
function FooterLink({ to, className, children }) {
  const location = useLocation()
  const [path, search = ''] = to.split('?')
  const isCurrentPage = location.pathname === path && location.search === (search ? `?${search}` : '')

  function handleClick(e) {
    if (!isCurrentPage) return
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Link to={to} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}

// 데스크톱은 FloatingCart 패널과 같은 "아래에서 뿅 하고 뜨는" 전환 — 클릭한 Email 버튼 바로 위에 앵커된
// 작은 팝오버. 모바일은 앵커할 자리가 좁아 대신 TripCreateModal과 같은 화면 중앙 팝업(딤 배경 포함)으로 연다.
function EmailPopover({ open, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 sm:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-slate-100 bg-surface p-4 shadow-popup transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:absolute sm:inset-x-auto sm:bottom-full sm:right-0 sm:top-auto sm:z-50 sm:mb-2 sm:w-[240px] sm:origin-bottom-right ${
          open
            ? 'pointer-events-auto scale-100 opacity-100 sm:translate-y-0'
            : 'pointer-events-none scale-90 opacity-0 sm:translate-y-2'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold text-slate-700">이메일 문의</span>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-slate-500" aria-label="닫기">
            <Icon icon="solar:close-circle-linear" width={16} />
          </button>
        </div>

        <p className="mt-1.5 text-[12.5px] font-bold text-slate-700">{SUPPORT_EMAIL}</p>

        <Button
          as="a"
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-3 flex h-9 items-center justify-center rounded-lg text-[12px] font-bold"
        >
          메일 쓰기
        </Button>
      </div>
    </>
  )
}

export default function Footer() {
  const dark = useTheme().resolved === 'dark'
  const [emailOpen, setEmailOpen] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (emailRef.current && !emailRef.current.contains(e.target)) setEmailOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <footer className="border-t border-slate-100 bg-slate-50">
      <Section as="div" className="flex flex-col gap-9 py-9 sm:flex-row sm:items-start sm:justify-between">
        {/* 모바일에서는 로고를 맨 아래로 — order로 순서만 바꾸고, sm 이상에서는 order-none으로
            원래 순서(로고가 왼쪽)로 되돌린다 */}
        <div className="order-2 sm:order-none">
          <img src={dark ? logoHorizontalDark : logoHorizontal} alt="트래블 참견" className="h-8 w-auto" />
          <p className="mt-2 text-[11.5px] text-slate-400">함께 만드는 더 좋은 여행</p>
          <p className="mt-6 text-[10.5px] text-slate-400">© 2026 Travel Tackle. All rights reserved.</p>
        </div>

        {/* 서비스/고객지원/Contact를 한 줄(감싸지 않음)로 묶어 이 묶음 전체를 컨테이너 오른쪽 끝(카드 그리드 끝)에
            맞춘다 — Contact는 그대로 두고 서비스·고객지원이 그 옆으로 같이 옮겨오도록, 개별 그리드 트랙 대신
            하나의 flex 행으로 배치한다. 각 칸은 내용 너비만큼만 차지해 텍스트 정렬은 모두 기본(좌측) 그대로다. */}
        <div className="order-1 flex flex-col gap-8 sm:order-none sm:flex-row sm:gap-[5.25rem] lg:gap-[13.5rem]">
          <div>
            <h2 className="text-[11.5px] font-bold text-slate-700">서비스</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2">
              {SERVICE_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink to={link.to} className="text-[10.5px] text-slate-400 transition-colors hover:text-slate-700">
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* 모바일에서는 고객지원·Contact가 한 줄에 나란히 — 서비스 링크 그리드(grid-cols-2 gap-x-8)와
              같은 폭·간격의 2열 그리드로 둬서 고객지원은 왼쪽 칸, Contact는 오른쪽 칸이 서비스의
              두 칸과 세로로 정확히 맞는다. sm 이상에서는 contents로 이 감싸는 div 자체가 레이아웃에서
              사라지고 두 칸이 그대로 부모 flex 행의 항목이 된다(기존과 동일). */}
          <div className="grid grid-cols-2 gap-x-8 sm:contents">
            <div>
              <h2 className="text-[11.5px] font-bold text-slate-700">고객지원</h2>
              <ul className="mt-3 space-y-2">
                {SUPPORT_LINKS.map((link) => (
                  <li key={link.label}>
                    <FooterLink to={link.to} className="text-[10.5px] text-slate-400 transition-colors hover:text-slate-700">
                      {link.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-[11.5px] font-bold text-slate-700">Contact</h2>
              <ul className="mt-3 space-y-2">
                <li className="relative inline-block" ref={emailRef}>
                  <button
                    type="button"
                    onClick={() => setEmailOpen((v) => !v)}
                    className="text-[10.5px] text-slate-400 transition-colors hover:text-slate-700"
                  >
                    Email
                  </button>
                  <EmailPopover open={emailOpen} onClose={() => setEmailOpen(false)} />
                </li>
                <li>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10.5px] text-slate-400 transition-colors hover:text-slate-700"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10.5px] text-slate-400 transition-colors hover:text-slate-700"
                  >
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </footer>
  )
}
