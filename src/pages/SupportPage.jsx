import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Card from '../components/ui/Card'

const TABS = [
  { value: 'faq', label: '자주 묻는 질문' },
  { value: 'terms', label: '이용약관' },
  { value: 'privacy', label: '개인정보처리방침' },
]

// 예시 콘텐츠 — 실제 문의/약관 내용으로 추후 교체
const FAQ_ITEMS = [
  {
    q: '여행 계획은 어떻게 만드나요?',
    a: '나의 계획 페이지에서 새 계획 만들기를 누르고 기간과 지역을 정하면 Day별 일정이 자동으로 만들어져요.',
  },
  {
    q: '작성한 계획은 다른 사람도 볼 수 있나요?',
    a: '계획을 여행자 피드에 공유하면 다른 사용자도 볼 수 있어요. 공유하지 않으면 나의 계획/보관함에서만 확인할 수 있어요.',
  },
  {
    q: '탈퇴하면 작성한 계획과 기록은 어떻게 되나요?',
    a: '탈퇴 시 작성하신 계획과 기록은 모두 삭제되며 복구할 수 없어요.',
  },
]

const TERMS_TEXT = `제1조 (목적)
이 약관은 Travel Tackle(이하 "회사")이 제공하는 여행 계획 및 여행자 피드 서비스의 이용조건과 절차, 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다. (예시 내용입니다)

제2조 (용어의 정의)
① "서비스"란 회사가 제공하는 여행지 탐색, 여행 계획, 여행자 피드 등 일체의 서비스를 의미합니다.
② "회원"이란 이 약관에 동의하고 회사와 이용계약을 체결한 자를 의미합니다. (예시 내용입니다)

제3조 (약관의 효력 및 변경)
회사는 필요한 경우 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 안내합니다. (예시 내용입니다)`

const PRIVACY_TEXT = `1. 수집하는 개인정보 항목
회사는 회원가입 및 서비스 이용 과정에서 이메일, 닉네임, 여행 선호도 정보를 수집합니다. (예시 내용입니다)

2. 개인정보의 수집 및 이용 목적
수집한 개인정보는 회원 관리, 맞춤 여행 계획 추천, 여행자 피드 서비스 제공을 위한 목적으로만 이용됩니다. (예시 내용입니다)

3. 개인정보의 보유 및 이용 기간
회원 탈퇴 시 수집된 개인정보는 지체 없이 파기하며, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다. (예시 내용입니다)`

export default function SupportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = useMemo(() => {
    const requested = searchParams.get('tab')
    return TABS.some((t) => t.value === requested) ? requested : 'faq'
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-900">
      <Navbar />

      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-1 flex-col gap-8 py-12">
        <h1 className="text-[22px] font-extrabold text-slate-900">고객지원</h1>

        {/* MyPageAccountSettings의 슬라이딩 필 토글과 동일한 패턴, 3탭용으로 폭만 조정 */}
        <div className="relative flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1">
          <div
            aria-hidden="true"
            className="absolute top-1 h-8 rounded-lg bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out"
            style={{
              width: 'calc((100% - 0.5rem) / 3)',
              transform: `translateX(calc(${TABS.findIndex((t) => t.value === tab)} * (100% + 0.25rem)))`,
            }}
          />
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSearchParams({ tab: t.value })}
              aria-pressed={tab === t.value}
              className={`relative z-10 h-8 flex-1 rounded-lg text-[12.5px] font-bold transition-colors ${
                tab === t.value ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'faq' && (
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <Card key={item.q} className="p-5">
                <p className="text-[13.5px] font-bold text-slate-800">Q. {item.q}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">A. {item.a}</p>
              </Card>
            ))}
          </div>
        )}

        {tab === 'terms' && (
          <Card className="whitespace-pre-line p-6 text-[12.5px] leading-relaxed text-slate-600">{TERMS_TEXT}</Card>
        )}

        {tab === 'privacy' && (
          <Card className="whitespace-pre-line p-6 text-[12.5px] leading-relaxed text-slate-600">{PRIVACY_TEXT}</Card>
        )}
      </Section>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />
    </div>
  )
}
