import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './i18n'
import { ThemeProvider } from './theme'
import { NotificationProvider } from './notifications/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import TourExplorePage from './pages/TourExplorePage'
import TravelerFeedPage from './pages/TravelerFeedPage'
import SupportPage from './pages/SupportPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OAuthCallback from './pages/OAuthCallback'
import WelcomePage from './pages/onboarding/WelcomePage'
import PreferenceWizard from './pages/onboarding/PreferenceWizard'
import CompletePage from './pages/onboarding/CompletePage'
import TripPlannerPage from './pages/TripPlannerPage'
import SavedTripsPage from './pages/SavedTripsPage'
import MyPageSettings from './pages/MyPageSettings'
import MyPageAccountSettings from './pages/MyPageAccountSettings'

// react-router는 라우트가 바뀌어도 스크롤 위치를 그대로 두므로, 스크롤된 채로 다른 페이지로 이동하면
// 새 페이지가 이전 스크롤 위치에서 열린 것처럼 보인다 — 경로가 바뀔 때마다 맨 위로 되돌린다.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
      <NotificationProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<TourExplorePage />} />
          <Route path="/feed" element={<TravelerFeedPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <TripPlannerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/saved"
            element={
              <ProtectedRoute>
                <SavedTripsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPageSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage/settings"
            element={
              <ProtectedRoute>
                <MyPageAccountSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/welcome"
            element={
              <ProtectedRoute>
                <WelcomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/preferences"
            element={
              <ProtectedRoute>
                <PreferenceWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedRoute>
                <CompletePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </NotificationProvider>
      </AuthProvider>
      </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
