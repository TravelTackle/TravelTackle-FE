import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import OnboardingHeader from '../../components/onboarding/OnboardingHeader'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n'
import logoIcon from '../../assets/logo-icon.svg'

const T = {
  ko: {
    welcome: '환영해요',
    greeting: (name) => `반가워요, ${name}님!`,
    subtitleLine1: '내 취향을 알려주면',
    subtitleLine2: '참견이 훨씬 정확해져요.',
    startButton: '취향 설정 시작하기',
    estimate: '약 1분 · 질문 4개',
    later: '나중에 할게요',
  },
  en: {
    welcome: 'Welcome',
    greeting: (name) => `Nice to meet you, ${name}!`,
    subtitleLine1: 'Tell us your preferences',
    subtitleLine2: 'and we can give you sharper feedback.',
    startButton: 'Start setting preferences',
    estimate: 'About 1 min · 4 questions',
    later: "I'll do this later",
  },
}

export default function WelcomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { language } = useLanguage()
  const copy = T[language] ?? T.en

  return (
    <OnboardingHeader>
      <div className="mx-auto flex min-h-[500px] w-full max-w-[460px] flex-col items-center justify-center text-center">
        <img src={logoIcon} alt="" className="h-20 w-20 sm:h-24 sm:w-24" />

        <p className="mt-7 text-[13px] font-bold text-brand">{copy.welcome}</p>
        <h1 className="mt-2 text-[32px] font-extrabold leading-[1.2] tracking-tight text-slate-900 sm:text-[36px]">
          {copy.greeting(user?.name)}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
          {copy.subtitleLine1}
          <br />
          {copy.subtitleLine2}
        </p>

        <Button
          onClick={() => navigate('/onboarding/preferences')}
          className="mt-9 h-12 w-full max-w-[330px] rounded-xl text-[15px] font-bold"
        >
          {copy.startButton}
        </Button>
        <p className="mt-3 flex items-center gap-1 text-[12px] text-slate-400">
          <Icon icon="solar:clock-circle-linear" width={13} /> {copy.estimate}
        </p>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-7 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          {copy.later}
        </button>
      </div>
    </OnboardingHeader>
  )
}
