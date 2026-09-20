import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useTheme } from '../../theme'

const SLIDES = [
  {
    eyebrow: '01 · 트래블 참견',
    title: '혼자 짠 계획에\n여행자의 경험을 더해요',
    description: '일정을 만들고 현지인의 생생한 조언을 받아 나만의 여행을 완성해보세요.',
    icon: 'solar:stars-bold',
    accent: '#2563EB',
    accentDark: '#7CB0FF',
    background: 'linear-gradient(145deg,#F0F7FF,#E0ECFF)',
    backgroundDark: 'linear-gradient(145deg,#111c33,#16264a)',
    items: ['날짜별 여행 계획 만들기', '현지인의 생생한 참견', '취향 기반 장소와 코스 추천'],
    labels: ['계획', '참견', '추천'],
  },
  {
    eyebrow: '02 · 여행 계획',
    title: '가고 싶은 곳을\n나만의 일정으로',
    description: '여행 날짜와 장소를 담으면 보기 쉬운 일정이 완성돼요.',
    icon: 'solar:calendar-mark-bold',
    accent: '#2563EB',
    accentDark: '#7CB0FF',
    background: 'linear-gradient(145deg,#EFF6FF,#DBEAFE)',
    backgroundDark: 'linear-gradient(145deg,#111c33,#182b52)',
    items: ['제주 공항 도착', '협재해수욕장', '애월 카페거리'],
    labels: ['10:00', '13:30', '17:00'],
  },
  {
    eyebrow: '03 · 현지인의 참견',
    title: '현지인의 참견으로\n계획을 더 탄탄하게',
    description: '직접 다녀온 사람의 조언으로 놓친 장소와 비효율적인 동선을 확인해요.',
    icon: 'solar:chat-round-dots-bold',
    accent: '#4F46E5',
    accentDark: '#A5B4FC',
    background: 'linear-gradient(145deg,#EEF2FF,#E0E7FF)',
    backgroundDark: 'linear-gradient(145deg,#161a3a,#1f2457)',
    items: ['오후에는 해안도로가 더 예뻐요', '이 카페는 예약을 추천해요', '동선을 이렇게 바꿔보세요'],
    labels: ['현지인', '여행자', '트래블봇'],
  },
  {
    eyebrow: '04 · 맞춤 추천',
    title: '내 취향에 맞는\n여행을 발견해요',
    description: '선택한 관심사와 여행 스타일을 바탕으로 장소와 코스를 추천해요.',
    icon: 'solar:magic-stick-3-bold',
    accent: '#0F766E',
    accentDark: '#5EEAD4',
    background: 'linear-gradient(145deg,#ECFDF5,#D1FAE5)',
    backgroundDark: 'linear-gradient(145deg,#0e2622,#123b34)',
    items: ['조용한 바다와 산책', '로컬 맛집과 카페', '사진이 잘 나오는 명소'],
    labels: ['힐링', '맛집', '사진'],
  },
]

/** 온보딩 카드의 왼쪽 면. 독립 카드가 아니라 부모 카드의 절반을 채우는 패널이다.
 *  배경·강조색은 인라인 style이라 다크 모드 변수 뒤집기가 닿지 않는다 — 모드에 맞는 값을 골라 쓴다. */
export default function FeatureCarousel() {
  const [index, setIndex] = useState(0)
  const dark = useTheme().resolved === 'dark'
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % SLIDES.length), 4500)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <section
      className="relative h-full overflow-hidden"
      aria-label="트래블 참견 기능 소개"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {SLIDES.map((slide, slideIndex) => {
        const active = slideIndex === index
        const accent = dark ? slide.accentDark : slide.accent
        return (
          <article
            key={slide.eyebrow}
            className={`absolute inset-0 flex flex-col justify-center p-10 transition-opacity duration-700 ease-out xl:p-12 ${
              active ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{ background: dark ? slide.backgroundDark : slide.background }}
            aria-hidden={!active}
          >
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/40 blur-3xl dark:bg-white/5" />
            <div
              className={`relative transition-transform duration-700 ease-out ${active ? 'translate-y-0' : 'translate-y-2'}`}
              aria-live={active ? 'polite' : 'off'}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface/75 shadow-sm">
                <Icon icon={slide.icon} width={24} color={accent} />
              </div>
              <p className="mt-7 text-[12px] font-extrabold tracking-wide" style={{ color: accent }}>
                {slide.eyebrow}
              </p>
              <h2 className="mt-3 whitespace-pre-line text-[26px] font-extrabold leading-[1.3] tracking-tight text-slate-900 xl:text-[28px]">
                {slide.title}
              </h2>
              <p className="mt-3 max-w-[340px] text-[14px] leading-[1.7] text-slate-600">{slide.description}</p>

              <div className="mt-7 space-y-2.5 rounded-2xl bg-surface/70 p-4 ring-1 ring-surface/80 backdrop-blur-sm">
                {slide.items.map((item, itemIndex) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-3 shadow-sm">
                    <span
                      className="flex h-7 min-w-12 items-center justify-center rounded-lg px-2 text-[10px] font-extrabold"
                      style={{ color: accent, backgroundColor: `${accent}${dark ? '26' : '12'}` }}
                    >
                      {slide.labels[itemIndex]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-slate-700">{item}</span>
                    <Icon icon="solar:alt-arrow-right-linear" width={14} className="text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </article>
        )
      })}

      <div className="absolute bottom-10 left-10 z-10 flex items-center gap-1.5 xl:left-12">
        {SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.eyebrow}
            type="button"
            onClick={() => setIndex(slideIndex)}
            className={`h-1.5 rounded-full transition-all ${
              slideIndex === index ? 'w-6 bg-brand' : 'w-1.5 bg-slate-500/25 hover:bg-slate-500/40'
            }`}
            aria-label={`기능 소개 ${slideIndex + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
