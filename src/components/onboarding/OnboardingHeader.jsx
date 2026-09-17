import Navbar from '../Navbar'
import FeatureCarousel from './FeatureCarousel'

export default function OnboardingHeader({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-7 sm:px-6 sm:py-10">
        {/* 캐러셀과 콘텐츠가 한 카드의 양면이 되도록 합친다 — 모서리·그림자·높이를 공유 */}
        {/* min-h는 가장 큰 설문 스텝(Q1) 기준 — 환영/설문/완료 모두 같은 높이를 유지한다 */}
        <div className="grid overflow-hidden rounded-[28px] bg-surface shadow-[0_18px_55px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 lg:min-h-[720px] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden lg:block">
            <FeatureCarousel />
          </div>
          <section className="flex w-full flex-col justify-center p-6 sm:p-9 lg:p-11">
            {children}
          </section>
        </div>
      </main>
    </div>
  )
}
