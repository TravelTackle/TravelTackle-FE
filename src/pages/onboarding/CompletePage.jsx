import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import OnboardingHeader from '../../components/onboarding/OnboardingHeader'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'

const CHECKLIST = ['여행 취향 저장 완료', '맞춤 추천 준비 완료', '언제든 설정 변경 가능']

export default function CompletePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <OnboardingHeader>
      <div className="mx-auto flex min-h-[500px] max-w-[500px] flex-col items-center justify-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <Icon icon="solar:check-circle-bold" width={42} />
        </span>
        <p className="mt-7 text-[13px] font-bold text-brand">취향 설정 완료</p>
        <h1 className="mt-2 text-[32px] font-extrabold leading-[1.2] tracking-tight text-slate-900 sm:text-[36px]">
          모든 준비가 끝났어요!
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
          {user?.name}님의 취향을 바탕으로<br />이제 참견과 추천이 시작돼요.
        </p>
        <ul className="mt-7 w-full max-w-[330px] space-y-2.5 rounded-2xl bg-slate-50 p-5 text-left">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-600">
              <Icon icon="solar:check-circle-bold" width={17} className="text-brand shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <Button onClick={() => navigate('/')} className="mt-8 h-12 w-full max-w-[330px] rounded-xl text-[15px] font-bold">
          여행 시작하기
        </Button>
      </div>
    </OnboardingHeader>
  )
}
