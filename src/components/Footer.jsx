import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Section from './ui/Section'
import Button from './ui/Button'
import logoHorizontal from '../assets/logo-horizontal.svg'

const SUPPORT_EMAIL = 'traveltackleteam@gmail.com'

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

// FloatingCart 패널과 같은 "아래에서 뿅 하고 뜨는" 전환 — 클릭한 Email 버튼 바로 위에서 열리고,
// 화면 중앙 모달이 아니라 그 자리에 앵커된 작은 팝오버로 메일 주소를 보여준 뒤 "메일 쓰기"로만 mailto가 열린다.
function EmailPopover({ open, onClose }) {
  return (
    <div
      className={`absolute bottom-full right-0 z-50 mb-2 w-[240px] origin-bottom-right rounded-2xl border border-slate-100 bg-white p-4 shadow-popup transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-90 opacity-0'
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
  )
}

export default function Footer() {
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
    <footer className="border-t border-slate-100 bg-[#F4F7FA]">
      <Section as="div" className="flex flex-col gap-9 py-9 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <img src={logoHorizontal} alt="트레블 참견" className="h-8 w-auto" />
          <p className="mt-2 text-[11.5px] text-slate-400">함께 만드는 더 좋은 여행</p>
          <p className="mt-6 text-[10.5px] text-slate-300">© 2026 Travel Tackle. All rights reserved.</p>
        </div>

        {/* 서비스/고객지원/Contact를 한 줄(감싸지 않음)로 묶어 이 묶음 전체를 컨테이너 오른쪽 끝(카드 그리드 끝)에
            맞춘다 — Contact는 그대로 두고 서비스·고객지원이 그 옆으로 같이 옮겨오도록, 개별 그리드 트랙 대신
            하나의 flex 행으로 배치한다. 각 칸은 내용 너비만큼만 차지해 텍스트 정렬은 모두 기본(좌측) 그대로다. */}
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-[5.25rem] lg:gap-[13.5rem]">
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
            </ul>
          </div>
        </div>
      </Section>
    </footer>
  )
}
