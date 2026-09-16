import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Skeleton from './ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme'
import { useLanguage } from '../i18n'

// 언어별 3단계 슬라이드 내용 — 나중에 언어가 늘면 이 함수에 분기 하나만 추가하면 된다.
function getSteps(language) {
  if (language !== 'ko') {
    return [
      {
        tag: 'STEP 1 · Plan',
        title: 'Plan the trip you want',
        desc: 'Pick regions and interests to build a day-by-day itinerary easily.',
        icon: 'solar:map-linear',
        bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
        bgDark: 'linear-gradient(135deg,#14213d,#1b2f5e)',
        color: '#2563EB',
        cta: { label: 'Start planning', to: '/trips', guestLabel: 'Log in to start planning', guestTo: '/login' },
      },
      {
        tag: 'STEP 2 · Feedback',
        title: 'Get feedback from other travelers',
        desc: 'Sharpen your itinerary with honest feedback from locals and seasoned travelers.',
        icon: 'solar:chat-round-dots-linear',
        bg: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)',
        bgDark: 'linear-gradient(135deg,#171d3f,#232a63)',
        color: '#4F46E5',
        cta: { label: 'View traveler feed', to: '/feed' },
      },
      {
        tag: 'STEP 3 · Complete',
        title: 'Complete your own trip',
        desc: 'Travel a proven route, then leave a record for the next traveler.',
        icon: 'solar:check-circle-linear',
        bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)',
        bgDark: 'linear-gradient(135deg,#0f2a24,#134036)',
        color: '#0F766E',
        cta: { label: 'Explore destinations', to: '/explore' },
      },
    ]
  }
  return [
    {
      tag: 'STEP 1 · 계획',
      title: '가고 싶은 여행을 계획해요',
      desc: '관심 지역과 취향을 고르면 날짜별 일정을 쉽게 만들 수 있어요.',
      icon: 'solar:map-linear',
      bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
      bgDark: 'linear-gradient(135deg,#14213d,#1b2f5e)',
      color: '#2563EB',
      cta: { label: '여행 계획 시작하기', to: '/trips', guestLabel: '로그인하고 계획 시작하기', guestTo: '/login' },
    },
    {
      tag: 'STEP 2 · 참견',
      title: '다른 여행자에게 참견받아요',
      desc: '현지인과 여행 고수의 솔직한 참견으로 일정을 더 탄탄하게 다듬어요.',
      icon: 'solar:chat-round-dots-linear',
      bg: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)',
      bgDark: 'linear-gradient(135deg,#171d3f,#232a63)',
      color: '#4F46E5',
      cta: { label: '여행자 피드 보기', to: '/feed' },
    },
    {
      tag: 'STEP 3 · 완성',
      title: '나만의 여행을 완성해요',
      desc: '검증된 코스로 여행을 떠나고, 기록으로 남겨 다음 여행자에게 이어줘요.',
      icon: 'solar:check-circle-linear',
      bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)',
      bgDark: 'linear-gradient(135deg,#0f2a24,#134036)',
      color: '#0F766E',
      cta: { label: '여행지 탐색하기', to: '/explore' },
    },
  ]
}

// 제목 — 키워드 셋은 각 단계에 묶인다 (step: 슬라이드 인덱스). suffix는 한국어 조사를 앞 단어에
// 붙이기 위한 자간 보정용이라 영어에는 필요 없다(공백으로 자연히 떨어짐).
function getHeadline(language) {
  if (language !== 'ko') {
    return [
      { text: 'Plan', step: 0 },
      { text: 'your trip,' },
      { text: 'get' },
      { text: 'feedback', step: 1 },
      { text: 'from locals,' },
      { text: 'and' },
      { text: 'complete', step: 2 },
      { text: 'your journey.' },
    ]
  }
  return [
    { text: '계획', step: 0 },
    { text: '하고,', suffix: true },
    { text: '참견', step: 1 },
    { text: '받고,', suffix: true },
    { text: '여행을' },
    { text: '완성', step: 2 },
    { text: '하세요', suffix: true },
  ]
}

// Navbar/ChatbotWidget과 같은 패턴 — 언어별 맵으로 모아둬서 나중에 언어가 늘 때 키만 추가하면 되게 한다.
const T = {
  ko: {
    loading: '불러오는 중',
    headlineAria: '계획하고, 참견받고, 여행을 완성하세요',
    prevStep: '이전 단계',
    nextStep: '다음 단계',
    carouselAria: '트레블 참견 이용 단계',
    jumpToStep: (n, title) => `${n}단계 ${title}로 이동`,
    goToStep: (n) => `${n}단계로 이동`,
    stepAnnounce: (n, title) => `${n}단계: ${title}`,
    pause: '자동 넘김 일시정지',
    play: '자동 넘김 재생',
  },
  en: {
    loading: 'Loading',
    headlineAria: 'Plan your trip, get feedback, and complete your journey',
    prevStep: 'Previous step',
    nextStep: 'Next step',
    carouselAria: 'How Travel Tackle works',
    jumpToStep: (n, title) => `Go to step ${n}: ${title}`,
    goToStep: (n) => `Go to step ${n}`,
    stepAnnounce: (n, title) => `Step ${n}: ${title}`,
    pause: 'Pause autoplay',
    play: 'Resume autoplay',
  },
}

const INTERVAL = 4500
const MIN_SKELETON_MS = 700 // 로그인 확인이 빨라도 이만큼은 스켈레톤을 보여 배너·카드와 같은 리듬으로 열린다
let revealedOnce = false // 세션에서 처음 홈을 열 때만 연출, 다시 돌아오면 바로 보인다

// 슬라이드 CTA — 슬라이드 색을 받은 연한 흰 알약. 3초마다 빛이 스치고 링이 퍼져 눌러보라고 손짓한다
function SlideCta({ to, label, icon, color }) {
  return (
    <Link
      to={to}
      style={{ color, '--cta-ring': `${color}55` }}
      className="group cta-pulse relative mt-6 inline-flex w-fit items-center gap-2.5 overflow-hidden rounded-full border border-surface bg-white/85 py-2 pl-2 pr-5 text-[13.5px] font-bold shadow-card backdrop-blur transition-all duration-200 hover:-translate-y-px hover:bg-surface hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span
        aria-hidden="true"
        className="cta-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-surface to-transparent opacity-80"
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
function SlideSkeleton({ loadingLabel }) {
  return (
    <div className="relative flex h-full flex-col justify-center px-14 sm:px-16" role="status" aria-label={loadingLabel}>
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
  const dark = useTheme().resolved === 'dark'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${step.title}`}
      style={{ background: dark ? step.bgDark : step.bg }}
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
  const dark = useTheme().resolved === 'dark' // 슬라이드 배경은 인라인 그라데이션이라 변수 뒤집기가 안 닿는다 — 다크용을 따로 고른다
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const steps = getSteps(language)
  const headline = getHeadline(language)
  const track = [
    { step: steps[steps.length - 1], clone: true },
    ...steps.map((step) => ({ step, clone: false })),
    { step: steps[0], clone: true },
  ]
  // 트랙은 [3번 복제, 1, 2, 3, 1번 복제] 순. pos는 트랙 위치(1..total이 진짜), idx는 표시용 단계 번호.
  // 3 → 1로 넘어갈 때도 복제 슬라이드로 앞으로 밀린 뒤, 전환 없이 진짜 1번으로 되돌린다.
  const [pos, setPos] = useState(1)
  const [animated, setAnimated] = useState(true)
  const [playing, setPlaying] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [minSkeletonOver, setMinSkeletonOver] = useState(revealedOnce)
  useEffect(() => {
    if (revealedOnce) return undefined
    const id = setTimeout(() => {
      revealedOnce = true
      setMinSkeletonOver(true)
    }, MIN_SKELETON_MS)
    return () => clearTimeout(id)
  }, [])
  const pending = authLoading || !minSkeletonOver
  const total = steps.length
  const idx = (pos - 1 + total) % total
  const go = (distance) => {
    setAnimated(true)
    setPos((current) => Math.min(Math.max(current + distance, 0), total + 1))
  }
  const jumpTo = (index) => {
    setAnimated(true)
    setPos(index + 1)
  }

  // 복제 슬라이드에 도착하면 같은 그림의 진짜 슬라이드로 소리 없이 되돌린다
  const handleTrackTransitionEnd = (e) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (pos === total + 1) {
      setAnimated(false)
      setPos(1)
    } else if (pos === 0) {
      setAnimated(false)
      setPos(total)
    }
  }
  // 전환을 껐다가 다음 프레임에 다시 켠다 (되돌리는 순간이 보이지 않게)
  useEffect(() => {
    if (animated) return undefined
    const id = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(id)
  }, [animated])

  // 마우스를 올려 읽는 동안에는 자동 넘김을 멈춘다
  useEffect(() => {
    if (!playing || hovering || pending) return undefined
    const id = setInterval(() => go(1), INTERVAL)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, hovering, pending])

  const prevIdx = (idx - 1 + total) % total
  const nextIdx = (idx + 1) % total
  const current = steps[idx]

  // 제목 한 단어(또는 키워드 버튼) 렌더링 — 일반 span과 슬라이드 이동 버튼을 여기서 나눠 그린다.
  // 아래 h1에서 그룹으로 묶어 렌더링할 때도 재사용한다("여행을 완성하세요"가 줄바꿈될 때
  // 항상 통째로 다음 줄로 넘어가도록 묶어야 해서 map을 두 번 나눠 부른다).
  function renderHeadlinePart(part, i) {
    if (part.step == null) {
      return (
        <span key={i} className={`ai-word ${part.suffix ? '-ml-[0.16em]' : ''}`} style={{ animationDelay: `${i * 80}ms` }} aria-hidden="true">
          {part.text}
        </span>
      )
    }
    // 키워드는 현재 슬라이드와 함께 켜지고, 누르면 그 단계로 이동한다
    return (
      <button
        key={i}
        type="button"
        onClick={() => jumpTo(part.step)}
        aria-label={copy.jumpToStep(part.step + 1, steps[part.step].title)}
        aria-current={idx === part.step ? 'step' : undefined}
        className={`ai-word group relative isolate rounded-xl px-1.5 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          idx === part.step ? 'text-white' : 'text-brand hover:text-brand-dark'
        }`}
        style={{ animationDelay: `${i * 80}ms` }}
      >
        {/* 채움은 크기가 아니라 투명도로 오가서, 넘어가는 순간 흰 글자가 흰 배경에 묻히지 않는다 */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-brand-mid to-brand transition-all duration-300 ease-out ${
            idx === part.step ? 'scale-100 opacity-100 shadow-[0_8px_20px_rgba(37,99,235,0.3)]' : 'scale-90 opacity-0'
          }`}
        />
        <span
          aria-hidden="true"
          className={`absolute inset-0 -z-20 rounded-xl bg-brand-light transition-opacity duration-200 ${
            idx === part.step ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
        {part.text}
      </button>
    )
  }

  return (
    <section className="bg-surface">
      <Section as="div" className="pt-8 pb-10 sm:pt-10 sm:pb-12">
        {pending ? (
          // 첫 로딩 — 제목 자리를 어절 단위 스켈레톤으로 잡아 둔다
          <div className="flex flex-wrap items-center justify-center gap-2" role="status" aria-label={copy.loading}>
            {[76, 60, 76, 60, 64, 92, 72].map((w, i) => (
              <Skeleton key={i} className="h-8 rounded-full" style={{ width: w, animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        ) : (
          <h1
            className="flex flex-wrap items-baseline justify-center gap-x-[0.22em] gap-y-1 text-center text-[27px] sm:text-[32px] font-extrabold tracking-[-0.02em] text-slate-900"
            aria-label={copy.headlineAria}
          >
            {language === 'ko' ? (
              <>
                {headline.slice(0, headline.length - 3).map((part, i) => renderHeadlinePart(part, i))}
                {/* 마지막 3어절("여행을 완성 하세요")은 한 덩어리로 묶어서, 줄바꿈이 필요할 때 셋이 통째로
                    다음 줄로 넘어가게 한다 — 묶지 않으면 "완성"만 첫 줄에 남고 "하세요"만 둘째 줄에 떨어지는 등
                    문구 중간이 어색하게 갈렸다. */}
                <span className="inline-flex flex-nowrap items-baseline gap-x-[0.22em]">
                  {headline.slice(headline.length - 3).map((part, i) => renderHeadlinePart(part, headline.length - 3 + i))}
                </span>
              </>
            ) : (
              // 영문(및 en 폴백 언어)은 모바일에서 "Plan your trip," / "get feedback from locals," /
              // "and complete your journey."로 줄이 나뉘도록 세 덩어리를 각각 w-full로 강제 줄바꿈한다.
              // sm 이상에서는 sm:contents로 래퍼가 사라지고 원래처럼 한 줄로 자연스럽게 흐른다.
              [[0, 2], [2, 5], [5, headline.length]].map(([start, end], g) => (
                <span key={g} className="flex w-full flex-wrap items-baseline justify-center gap-x-[0.22em] sm:contents">
                  {headline.slice(start, end).map((part, i) => renderHeadlinePart(part, start + i))}
                </span>
              ))
            )}
          </h1>
        )}

        <div
          className="mt-6 flex items-center justify-center gap-4 xl:gap-5"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <SideCard step={steps[prevIdx]} onClick={() => go(-1)} label={copy.prevStep} />

          <div
            className="relative w-full max-w-[760px] h-[320px] sm:h-[340px] rounded-[22px] border border-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.09)] overflow-hidden"
            aria-roledescription="carousel"
            aria-label={copy.carouselAria}
          >
            {/* 슬라이드 세 장을 한 줄로 두고 트랙을 옆으로 밀어서 넘긴다 */}
            <div
              className={`flex h-full ease-[cubic-bezier(0.16,1,0.3,1)] ${animated ? 'transition-transform duration-600' : 'transition-none'}`}
              style={{ transform: `translateX(-${pos * 100}%)` }}
              onTransitionEnd={handleTrackTransitionEnd}
            >
              {track.map(({ step, clone }, i) => (
                <div
                  key={`${step.tag}-${i}`}
                  className="relative h-full w-full shrink-0 overflow-hidden"
                  style={{ background: dark ? step.bgDark : step.bg }}
                  aria-hidden={i !== pos || clone}
                  inert={i !== pos || clone}
                >
                  {/* 빈 오른쪽을 채우는 단계 아이콘 워터마크 */}
                  <div aria-hidden="true" className="absolute -right-10 -bottom-12 hidden sm:block" style={{ opacity: 0.09 }}>
                    <Icon icon={step.icon} width={280} color={step.color} />
                  </div>

                  {pending ? (
                    <SlideSkeleton loadingLabel={copy.loading} />
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
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 hover:bg-surface flex items-center justify-center shadow-sm transition-colors"
              aria-label={copy.prevStep}
            >
              <Icon icon="solar:alt-arrow-left-linear" width={19} className="text-ink" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 hover:bg-surface flex items-center justify-center shadow-sm transition-colors"
              aria-label={copy.nextStep}
            >
              <Icon icon="solar:alt-arrow-right-linear" width={19} className="text-ink" />
            </button>

            <p className="sr-only" aria-live="polite">{copy.stepAnnounce(idx + 1, current.title)}</p>

            <div className="absolute bottom-5 right-6 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">{idx + 1} / {total}</span>
              <button
                onClick={() => setPlaying((value) => !value)}
                className="w-6 h-6 rounded-full bg-white/70 hover:bg-surface flex items-center justify-center transition-colors"
                aria-label={playing ? copy.pause : copy.play}
                aria-pressed={!playing}
              >
                <Icon icon={playing ? 'solar:pause-bold' : 'solar:play-bold'} width={9} className="text-ink" />
              </button>
            </div>
          </div>

          <SideCard step={steps[nextIdx]} onClick={() => go(1)} label={copy.nextStep} />
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {steps.map((step, index) => (
            <button
              key={step.tag}
              onClick={() => jumpTo(index)}
              className={`h-1.5 rounded-full transition-all ${index === idx ? 'w-5 bg-brand' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
              aria-label={copy.goToStep(index + 1)}
              aria-current={index === idx}
            />
          ))}
        </div>
      </Section>
    </section>
  )
}
