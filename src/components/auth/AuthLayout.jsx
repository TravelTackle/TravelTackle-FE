import Navbar from '../Navbar'
import IntroPanel from './IntroPanel'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-stretch">
        <div className="hidden lg:flex lg:w-1/2 shrink-0">
          <IntroPanel />
        </div>
        {/* 좌측 인트로 이미지는 lg부터 나오므로, 세로 중앙정렬도 lg부터만 — 그 아래에서는 폼이
            화면 중간에 붕 떠서 위에 큰 빈 공간이 남던 문제가 있었다 */}
        <div className="flex-1 flex items-start justify-center px-4 py-10 sm:py-16 lg:items-center">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  )
}
