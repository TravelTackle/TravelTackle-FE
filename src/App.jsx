import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './i18n'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import TourExplorePage from './pages/TourExplorePage'
import TravelerFeedPage from './pages/TravelerFeedPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OAuthCallback from './pages/OAuthCallback'
import WelcomePage from './pages/onboarding/WelcomePage'
import PreferenceWizard from './pages/onboarding/PreferenceWizard'
import CompletePage from './pages/onboarding/CompletePage'
import TripPlannerPage from './pages/TripPlannerPage'
import MyPageSettings from './pages/MyPageSettings'

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<TourExplorePage />} />
          <Route path="/feed" element={<TravelerFeedPage />} />
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
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPageSettings />
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
      </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
