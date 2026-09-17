import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as authApi from '../api/auth'
import * as preferencesApi from '../api/preferences'

/**
 * 소셜 로그인(카카오/구글) 성공 후 백엔드가 이 경로로 리다이렉트한다.
 * (OAUTH_SUCCESS_REDIRECT_URL = http://localhost:5173/oauth/callback?login=success)
 * 여기서 세션(getMe)을 확인해 전역 유저 상태를 채우고, 선호도 유무에 따라
 * 홈 또는 온보딩으로 보낸다.
 */
export default function OAuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { setUser } = useAuth()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const failed = params.get('error') || params.get('login') === 'error'

    async function finish() { // eslint-disable-line no-inner-declarations
      if (failed) {
        navigate('/login?error=social', { replace: true })
        return
      }
      try {
        const me = await authApi.getMe()
        setUser(me)
        // 선호도 있으면 홈, 없으면 온보딩
        try {
          await preferencesApi.getPreferences()
          navigate('/', { replace: true })
        } catch {
          navigate('/onboarding/welcome', { replace: true })
        }
      } catch {
        navigate('/login?error=session', { replace: true })
      }
    }

    finish()
  }, [navigate, params, setUser])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <p className="text-[13px] text-slate-500">로그인 처리 중이에요...</p>
    </div>
  )
}
