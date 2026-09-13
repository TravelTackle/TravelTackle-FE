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
        <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  )
}
