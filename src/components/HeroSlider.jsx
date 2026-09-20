import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Skeleton from './ui/Skeleton'
import CardImage from './ui/CardImage'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme'
import planLight from '../assets/hero/plan-light.png'
import feedbackLight from '../assets/hero/feedback-light.png'
import exploreLight from '../assets/hero/explore-light.png'
import planImage from '../assets/hero/plan.png'
import feedbackImage from '../assets/hero/feedback.png'
import exploreImage from '../assets/hero/explore.png'

const STEPS = [
  {
    tag: 'STEP 1 · 계획',
    image: planImage,
    previewPosition: '28% center',
    lightImage: planLight,
    icon: 'solar:map-linear',
    title: '가고 싶은 여행을 계획해요',
    desc: '관심 지역과 취향을 고르면 날짜별 일정을 쉽게 만들 수 있어요.',
    cta: { label: '여행 계획 시작하기', to: '/trips', guestLabel: '로그인하고 계획 시작하기', guestTo: '/login' },
  },
  {
    tag: 'STEP 2 · 참견',
    image: feedbackImage,
    previewPosition: 'right top',
    lightImage: feedbackLight,
    icon: 'solar:chat-round-dots-linear',
    title: '다른 여행자에게 참견받아요',
    desc: '현지인과 여행 고수의 솔직한 참견으로 일정을 더 탄탄하게 다듬어요.',
    cta: { label: '여행자 피드 보기', to: '/feed' },
  },
  {
    tag: 'STEP 3 · 완성',
    image: exploreImage,
    previewPosition: '28% center',
    lightImage: exploreLight,
    icon: 'solar:check-circle-linear',
    title: '나만의 여행을 완성해요',
    desc: '검증된 코스로 여행을 떠나고, 기록으로 남겨 다음 여행자에게 이어줘요.',
    cta: { label: '여행지 탐색하기', to: '/explore' },
  },
]

const INTERVAL = 9000
// 제목 — 키워드 셋은 각 단계에 묶인다 (step: 슬라이드 인덱스)
const HEADLINE = [
  { text: '계획', step: 0 },
  { text: '하고,', suffix: true }, // 키워드에 붙는 어미 — 한 단어로 읽히게 간격을 당긴다
  { text: '참견', step: 1 },
  { text: '받고,', suffix: true },
  { text: '여행을' },
  { text: '완성', step: 2 },
  { text: '하세요', suffix: true },
]
// 무한 루프용 트랙: 앞뒤에 복제 한 장씩
const TRACK = [
  { step: STEPS[STEPS.length - 1], clone: true },
  ...STEPS.map((step) => ({ step, clone: false })),
  { step: STEPS[0], clone: true },
]
const MIN_SKELETON_MS = 700 // 로그인 확인이 빨라도 이만큼은 스켈레톤을 보여 배너·카드와 같은 리듬으로 열린다
let revealedOnce = false // 세션에서 처음 홈을 열 때만 연출, 다시 돌아오면 바로 보인다

// 실제 서비스 화면은 오른쪽으로 갈수록 드러나고, 본문 뒤에서는 자연스럽게 사라진다.
function ServiceBackdrop({ src }) {
  const [status, setStatus] = useState('loading')

  return (
    <div className="hero-service-backdrop" aria-hidden="true">
      {status === 'loading' && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={src}
        alt=""
        decoding="async"
        ref={(node) => {
          if (node?.complete) setStatus(node.naturalWidth > 0 ? 'loaded' : 'error')
        }}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={`hero-service-image ${status === 'loaded' ? 'is-loaded' : ''}`}
      />
    </div>
  )
}

// 초기 알약 버튼 스타일과 로딩 스켈레톤을 같은 형태로 맞춘다.
function SlideCta({ to, label, icon, loading = false }) {
  if (loading) {
    return (
      <span className="mt-6 inline-flex w-fit items-center gap-2.5 rounded-full border border-slate-200 bg-surface py-2 pl-2 pr-5" role="status" aria-label="버튼을 불러오는 중">
        <Skeleton className="h-7 w-7 rounded-full motion-reduce:animate-none" />
        <Skeleton className="h-3.5 w-32 rounded-full motion-reduce:animate-none" />
      </span>
    )
  }
  return (
    <Link
      to={to}
      className="group cta-pulse relative mt-6 inline-flex w-fit items-center gap-2.5 overflow-hidden rounded-full border border-slate-200 bg-surface py-2 pl-2 pr-5 text-[13.5px] font-bold text-brand shadow-card transition-colors hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="cta-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-brand-light to-transparent motion-reduce:animate-none" />
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-light" aria-hidden="true">
        <Icon icon={icon} width={15} />
      </span>
      <span className="relative">{label}</span>
    </Link>
  )
}

// 로그인 확인 중 슬라이드 본문 자리
function SlideSkeleton() {
  return (
    <div className="relative flex h-full flex-col justify-center px-14 sm:px-16" role="status" aria-label="불러오는 중">
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className="mt-3 h-6 w-[60%] max-w-[320px]" />
      <Skeleton className="mt-3 h-3.5 w-[75%] max-w-[420px]" />
      <SlideCta loading />
    </div>
  )
}

// 양옆 미리보기 카드 — 눌러서 그 단계로 바로 이동
function SideCard({ step, onClick, label }) {
  const { resolved } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${step.title}`}
      className="hero-preview-card group relative hidden lg:flex w-[190px] xl:w-[220px] h-[240px] shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-slate-50 text-left transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <CardImage
        src={resolved === 'dark' ? step.image : step.lightImage}
        alt=""
        loading="eager"
        className="hero-preview-image absolute inset-0 h-full w-full"
        imgClassName="object-center group-hover:scale-105"
        style={{ objectPosition: step.previewPosition }}
      />
      <span aria-hidden="true" className="hero-preview-shade pointer-events-none absolute inset-0" />
      <span className="relative block px-5 pb-5 pt-12">
        <span className="hero-preview-label block text-[11px] font-semibold tracking-[0.12em]">{step.tag}</span>
        <span className="hero-preview-title mt-2 block text-[14px] leading-snug font-bold">{step.title}</span>
      </span>
    </button>
  )
}

export default function HeroSlider() {
  const { user, loading: authLoading } = useAuth()
  const { resolved } = useTheme()
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
  const total = STEPS.length
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
  const current = STEPS[idx]

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
        aria-label={`${part.step + 1}단계 ${STEPS[part.step].title}로 이동`}
        aria-current={idx === part.step ? 'step' : undefined}
        className={`ai-word group relative isolate rounded-xl px-1.5 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          idx === part.step ? 'text-brand' : 'text-slate-700 hover:text-brand'
        }`}
        style={{ animationDelay: `${i * 80}ms` }}
      >
        {/* 채움은 크기가 아니라 투명도로 오가서, 넘어가는 순간 흰 글자가 흰 배경에 묻히지 않는다 */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 -z-10 rounded-xl bg-brand-light transition-all duration-300 ease-out ${
            idx === part.step ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
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
          <div className="flex flex-wrap items-center justify-center gap-2" role="status" aria-label="불러오는 중">
            {[76, 60, 76, 60, 64, 92, 72].map((w, i) => (
              <Skeleton key={i} className="h-8 rounded-full" style={{ width: w, animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        ) : (
          <h1
            className="flex flex-wrap items-baseline justify-center gap-x-[0.22em] gap-y-1 text-center text-[27px] sm:text-[32px] font-extrabold tracking-[-0.02em] text-slate-900"
            aria-label="계획하고, 참견받고, 여행을 완성하세요"
          >
            {HEADLINE.slice(0, 4).map((part, i) => renderHeadlinePart(part, i))}
            {/* "여행을 완성 하세요"는 한 덩어리로 묶어서, 줄바꿈이 필요할 때 셋이 통째로 다음 줄로
                넘어가게 한다 — 묶지 않으면 "완성"만 첫 줄에 남고 "하세요"만 둘째 줄에 떨어지는 등
                문구 중간이 어색하게 갈렸다. */}
            <span className="inline-flex flex-nowrap items-baseline gap-x-[0.22em]">
              {HEADLINE.slice(4).map((part, i) => renderHeadlinePart(part, i + 4))}
            </span>
          </h1>
        )}

        <div
          className="mt-6 flex items-center justify-center gap-4 xl:gap-5"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <SideCard step={STEPS[prevIdx]} onClick={() => go(-1)} label="이전 단계" />

          <div
            className="relative w-full max-w-[760px] h-[320px] sm:h-[340px] rounded-[22px] border border-slate-100 shadow-card overflow-hidden"
            aria-roledescription="carousel"
            aria-label="트래블 참견 이용 단계"
          >
            {/* 슬라이드 세 장을 한 줄로 두고 트랙을 옆으로 밀어서 넘긴다 */}
            <div
              className={`flex h-full ease-[cubic-bezier(0.16,1,0.3,1)] ${animated ? 'transition-transform duration-600' : 'transition-none'}`}
              style={{ transform: `translateX(-${pos * 100}%)` }}
              onTransitionEnd={handleTrackTransitionEnd}
            >
              {TRACK.map(({ step, clone }, i) => (
                <div
                  key={`${step.tag}-${i}`}
                  className="hero-main-card relative h-full w-full shrink-0 overflow-hidden bg-slate-50"
                  aria-hidden={i !== pos || clone}
                  inert={i !== pos || clone}
                >
                  <ServiceBackdrop key={`${step.tag}-${resolved}`} src={resolved === 'dark' ? step.image : step.lightImage} />

                  {pending ? (
                    <SlideSkeleton />
                  ) : (
                    <div className="animate-slide-in relative flex h-full flex-col justify-center px-14 sm:px-16">
                      <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-slate-500">{step.tag}</p>
                      <h2 className="mt-2 text-[23px] font-extrabold text-slate-800 text-balance sm:text-[27px]">{step.title}</h2>
                      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">{step.desc}</p>
                      <SlideCta
                        icon={step.icon}
                        to={!user && step.cta.guestTo ? step.cta.guestTo : step.cta.to}
                        label={!user && step.cta.guestLabel ? step.cta.guestLabel : step.cta.label}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="sr-only" aria-live="polite">{`${idx + 1}단계: ${current.title}`}</p>

            <div className="absolute bottom-5 right-6 flex items-center gap-2 rounded-full bg-surface/90 px-2.5 py-1.5">
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">{idx + 1} / {total}</span>
              <button
                onClick={() => setPlaying((value) => !value)}
                className="w-6 h-6 rounded-full border border-slate-200 bg-surface hover:bg-slate-100 flex items-center justify-center transition-colors"
                aria-label={playing ? '자동 넘김 일시정지' : '자동 넘김 재생'}
                aria-pressed={!playing}
              >
                <Icon icon={playing ? 'solar:pause-bold' : 'solar:play-bold'} width={9} className="text-slate-600" />
              </button>
            </div>
          </div>

          <SideCard step={STEPS[nextIdx]} onClick={() => go(1)} label="다음 단계" />
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {STEPS.map((step, index) => (
            <button
              key={step.tag}
              onClick={() => jumpTo(index)}
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
