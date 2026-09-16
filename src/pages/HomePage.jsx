import Navbar from '../components/Navbar'
import HeroSlider from '../components/HeroSlider'
import AiSummaryFeed from '../components/AiSummaryFeed'
import ParticipateSection from '../components/ParticipateSection'
import ExploreSection from '../components/ExploreSection'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import useHomeFeed from '../hooks/useHomeFeed'

// 모든 언어가 같은 화면 구조를 공유한다 — 컴포넌트별로 문자열만 언어에 맞게 바뀐다(대안 A).
// 사용자 생성 콘텐츠(계획 제목, 참견 내용 등)는 이번 범위에서 번역하지 않고 원문 그대로 노출한다.
export default function HomePage() {
  // 모아보기·참견하기·탐색 탭이 같은 피드를 쓰므로 여기서 한 번만 불러 내려준다
  const feed = useHomeFeed()

  return (
    <div className="bg-surface text-slate-900">
      <Navbar />
      <HeroSlider />
      <AiSummaryFeed feed={feed} />
      <ParticipateSection feed={feed} />
      <ExploreSection feed={feed} />
      <Footer />
      <ChatbotWidget />
      <FloatingCart />
    </div>
  )
}
