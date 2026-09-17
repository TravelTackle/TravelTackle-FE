import Navbar from '../components/Navbar'
import HeroSlider from '../components/HeroSlider'
import AiSummaryFeed from '../components/AiSummaryFeed'
import ParticipateSection from '../components/ParticipateSection'
import ExploreSection from '../components/ExploreSection'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import useHomeFeed from '../hooks/useHomeFeed'

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
