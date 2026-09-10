import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Skeleton from './ui/Skeleton'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  {
    tag: 'STEP 1 · 계획',
    title: '가고 싶은 여행을 계획해요',
    desc: '관심 지역과 취향을 고르면 날짜별 일정을 쉽게 만들 수 있어요.',
    icon: 'solar:map-linear',
    bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
    color: '#2563EB',
    cta: { label: '여행 계획 시작하기', to: '/trips', guestLabel: '로그인하고 계획 시작하기', guestTo: '/login' },
  },
  {
    tag: 'STEP 2 · 참견',
    title: '다른 여행자에게 참견받아요',
    desc: '현지인과 여행 고수의 솔직한 참견으로 일정을 더 탄탄하게 다듬어요.',
    icon: 'solar:chat-round-dots-linear',
    bg: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)',
    color: '#4F46E5',
    cta: { label: '여행자 피드 보기', to: '/feed' },
  },
  {
    tag: 'STEP 3 · 완성',
    title: '나만의 여행을 완성해요',
    desc: '검증된 코스로 여행을 떠나고, 기록으로 남겨 다음 여행자에게 이어줘요.',
    icon: 'solar:check-circle-linear',
    bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)',
    color: '#0F766E',
    cta: { label: '여행지 탐색하기', to: '/explore' },
  },
]

const INTERVAL = 4500
const MIN_SKELETON_MS = 700 // 로그인 확인이 빨라도 이만큼은 스켈레톤을 보여 배너·카드와 같은 리듬으로 열린다

// 슬라이드 CTA — 슬라이드 색을 받은 연한 흰 알약. 3초마다 빛이 스치고 링이 퍼져 눌러보라고 손짓한다
function SlideCta({ to, label, icon, color }) {
  return (
    <Link
      to={to}
      style={{ color, '--cta-ring': `${color}55` }}
      className="group cta-pulse relative mt-6 inline-flex w-fit items-center gap-2.5 overflow-hidden rounded-full border border-white bg-white/85 py-2 pl-2 pr-5 text-[13.5px] font-bold shadow-card backdrop-blur transition-all duration-200 hover:-translate-y-px hover:bg-white hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span
        aria-hidden="true"
        className="cta-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
      />
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}1A` }}
      >
        <Icon icon={icon} width={15} />
      </span>
      {label}
    </Link>
  )
}

// 로그인 확인 중 슬라이드 본문 자리
function SlideSkeleton() {
  return (
    <div className="relative flex h-full flex-col justify-center px-14 sm:px-16" role="status" aria-label="불러오는 중">
      <Skeleton className="mb-4 h-14 w-14 rounded-2xl" />
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className="mt-3 h-6 w-[60%] max-w-[320px]" />
      <Skeleton className="mt-3 h-3.5 w-[75%] max-w-[420px]" />
      <Skeleton className="mt-6 h-10 w-44 rounded-full" />
    </div>
  )
}

// 양옆 미리보기 카드 — 눌러서 그 단계로 바로 이동
function SideCard({ step, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${step.title}`}
      style={{ background: step.bg }}
      className="hidden lg:flex w-[190px] xl:w-[220px] h-[240px] shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-100 px-6 text-center opacity-60 transition-all duration-300 hover:opacity-100 hover:-translate-y-0.5 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center mb-3 shadow-sm">
        <Icon icon={step.icon} width={21} color={step.color} />
      </div>
      <p className="text-[11px] font-extrabold" style={{ color: step.color }}>{step.tag}</p>
      <p className="mt-2 text-[14px] leading-snug font-bold text-slate-600">{step.title}</p>
    </button>
  )
}

export default function HeroSlider() {
  const { user, loading: authLoading } = useAuth()
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [minSkeletonOver, setMinSkeletonOver] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setMinSkeletonOver(true), MIN_SKELETON_MS)
    return () => clearTimeout(id)
  }, [])
  const pending = authLoading || !minSkeletonOver
  const total = STEPS.length
  const go = (distance) => setIdx((current) => (current + distance + total) % total)

  // 마우스를 올려 읽는 동안에는 자동 넘김을 멈춘다
  useEffect(() => {
    if (!playing || hovering || pending) return undefined
    const id = setInterval(() => setIdx((current) => (current + 1) % total), INTERVAL)
    return () => clearInterval(id)
  }, [playing, hovering, pending, total])

  const prevIdx = (idx - 1 + total) % total
  const nextIdx = (idx + 1) % total
  const current = STEPS[idx]

  return (
    <section className="bg-white">
      <Section as="div" className="pt-8 pb-10 sm:pt-10 sm:pb-12">
        <h1 className="text-center text-[26px] sm:text-[30px] font-extrabold tracking-tight text-slate-900 text-balance">
          <span className="text-brand">계획</span>하고, <span className="text-brand">참견</span>받고, 여행을 <span className="text-brand">완성</span>하세요
        </h1>

        <div
          className="mt-6 flex items-center justify-center gap-4 xl:gap-5"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <SideCard step={STEPS[prevIdx]} onClick={() => setIdx(prevIdx)} label="이전 단계" />

          <div
            className="relative w-full max-w-[760px] h-[320px] sm:h-[340px] rounded-[22px] border border-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.09)] overflow-hidden"
            aria-roledescription="carousel"
            aria-label="트레블 참견 이용 단계"
          >
            {/* 슬라이드 세 장을 한 줄로 두고 트랙을 옆으로 밀어서 넘긴다 */}
            <div
              className="flex h-full transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `translateX(-${idx * 100}%)` }}
            >
              {STEPS.map((step, i) => (
                <div
                  key={step.tag}
                  className="relative h-full w-full shrink-0 overflow-hidden"
                  style={{ background: step.bg }}
                  aria-hidden={i !== idx}
                  inert={i !== idx}
                >
                  {/* 빈 오른쪽을 채우는 단계 아이콘 워터마크 */}
                  <div aria-hidden="true" className="absolute -right-10 -bottom-12 hidden sm:block" style={{ opacity: 0.09 }}>
                    <Icon icon={step.icon} width={280} color={step.color} />
                  </div>

                  {pending ? (
                    <SlideSkeleton />
                  ) : (
                    <div className="animate-slide-in relative flex h-full flex-col justify-center px-14 sm:px-16">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/75 shadow-sm">
                        <Icon icon={step.icon} width={27} color={step.color} />
                      </div>
                      <p className="text-[12px] font-extrabold" style={{ color: step.color }}>{step.tag}</p>
                      <h2 className="mt-2 text-[23px] font-extrabold text-slate-800 text-balance sm:text-[27px]">{step.title}</h2>
                      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">{step.desc}</p>
                      <SlideCta
                        to={!user && step.cta.guestTo ? step.cta.guestTo : step.cta.to}
                        label={!user && step.cta.guestLabel ? step.cta.guestLabel : step.cta.label}
                        icon={step.icon}
                        color={step.color}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => go(-1)}
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
              aria-label="이전 단계"
            >
              <Icon icon="solar:alt-arrow-left-linear" width={19} className="text-slate-500" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
              aria-label="다음 단계"
            >
              <Icon icon="solar:alt-arrow-right-linear" width={19} className="text-slate-500" />
            </button>

            <p className="sr-only" aria-live="polite">{`${idx + 1}단계: ${current.title}`}</p>

            <div className="absolute bottom-5 right-6 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">{idx + 1} / {total}</span>
              <button
                onClick={() => setPlaying((value) => !value)}
                className="w-6 h-6 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors"
                aria-label={playing ? '자동 넘김 일시정지' : '자동 넘김 재생'}
                aria-pressed={!playing}
              >
                <Icon icon={playing ? 'solar:pause-bold' : 'solar:play-bold'} width={9} className="text-slate-700" />
              </button>
            </div>
          </div>

          <SideCard step={STEPS[nextIdx]} onClick={() => setIdx(nextIdx)} label="다음 단계" />
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {STEPS.map((step, index) => (
            <button
              key={step.tag}
              onClick={() => setIdx(index)}
              className={`h-1.5 rounded-full transition-all ${index === idx ? 'w-5 bg-brand' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
              aria-label={`${index + 1}단계로 이동`}
              aria-current={index === idx}
            />
          ))}
        </div>
      </Section>
    </section>
  )
}
