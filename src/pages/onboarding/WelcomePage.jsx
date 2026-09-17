import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import OnboardingHeader from '../../components/onboarding/OnboardingHeader'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import logoIcon from '../../assets/logo-icon.svg'

export default function WelcomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <OnboardingHeader>
      <div className="mx-auto flex min-h-[500px] w-full max-w-[460px] flex-col items-center justify-center text-center">
        <img src={logoIcon} alt="" className="h-20 w-20 sm:h-24 sm:w-24" />

        <p className="mt-7 text-[13px] font-bold text-brand">환영해요</p>
        <h1 className="mt-2 text-[32px] font-extrabold leading-[1.2] tracking-tight text-slate-900 sm:text-[36px]">
          반가워요, {user?.name}님!
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
          내 취향을 알려주면
          <br />
          참견이 훨씬 정확해져요.
        </p>

        <Button
          onClick={() => navigate('/onboarding/preferences')}
          className="mt-9 h-12 w-full max-w-[330px] rounded-xl text-[15px] font-bold"
        >
          취향 설정 시작하기
        </Button>
        <p className="mt-3 flex items-center gap-1 text-[12px] text-slate-400">
          <Icon icon="solar:clock-circle-linear" width={13} /> 약 1분 · 질문 4개
        </p>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-7 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          나중에 할게요
        </button>
      </div>
    </OnboardingHeader>
  )
}
