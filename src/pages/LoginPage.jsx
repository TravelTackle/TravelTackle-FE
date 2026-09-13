import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordResetModal from '../components/auth/PasswordResetModal'
import Button from '../components/ui/Button'
import FormField from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'
import * as preferencesApi from '../api/preferences'

// OAuthCallback.jsx가 소셜 로그인 실패 시 /login?error=social|session 으로 보낸다 — 여기서 그 값을 읽어 안내한다.
const OAUTH_ERROR_MESSAGES = {
  social: '소셜 로그인이 취소되었거나 실패했어요. 다시 시도해주세요.',
  session: '로그인 처리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => OAUTH_ERROR_MESSAGES[searchParams.get('error')] || '')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [appleNotice, setAppleNotice] = useState(false)

  // 안내는 한 번만 보여주고 주소에서 지운다 — 새로고침/뒤로가기 때 다시 뜨지 않게
  useEffect(() => {
    if (!searchParams.get('error')) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('error')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      try {
        await preferencesApi.getPreferences()
        navigate('/')
      } catch {
        navigate('/onboarding/welcome')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않아요.')
      } else {
        setError('로그인에 실패했어요. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[13px] font-semibold text-brand-dark mb-1">환영해요</h1>
      <p className="text-[22px] font-extrabold text-slate-800 mb-7">이메일로 로그인해주세요</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="이메일"
          type="email"
          placeholder="test@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <div>
          <FormField
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력해주세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="mt-1.5 block ml-auto text-[12.5px] font-medium text-slate-400 hover:text-slate-600 transition-all"
          >
            비밀번호 찾기
          </button>
        </div>

        {error && <p className="text-[12.5px] text-rose-500 -mt-1">{error}</p>}

        <Button type="submit" disabled={loading} className="h-12 rounded-xl font-bold text-[15px] disabled:opacity-50">
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-[12px] text-slate-400">또는</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      <div className="flex flex-col gap-2.5">
        <a
          href="/oauth2/authorization/kakao"
          className="h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-[14px] transition-all"
          style={{ background: '#FEE500', color: '#191600' }}
        >
          <Icon icon="ri:kakao-talk-fill" width={19} />
          카카오로 시작하기
        </a>
        <a
          href="/oauth2/authorization/google"
          className="h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-[14px] border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
        >
          <Icon icon="logos:google-icon" width={17} />
          Google로 계속하기
        </a>
        {/* Apple 로그인은 Apple Developer 등록 전이라 미도입 — 클릭 시 준비 중 안내만 표시 */}
        <button
          type="button"
          onClick={() => setAppleNotice(true)}
          aria-describedby={appleNotice ? 'apple-login-notice' : undefined}
          className="h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-[14px] bg-black text-white hover:bg-slate-800 transition-all"
        >
          <Icon icon="ri:apple-fill" width={19} />
          Apple로 계속하기
        </button>
        {appleNotice && (
          <p id="apple-login-notice" role="status" className="text-center text-[12.5px] text-slate-500">
            Apple 로그인은 아직 준비 중이에요. 카카오 또는 Google로 로그인해주세요.
          </p>
        )}
      </div>

      <p className="text-center text-[13px] text-slate-500 mt-7">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="font-bold text-brand-dark">
          회원가입
        </Link>
      </p>

      {showReset && <PasswordResetModal onClose={() => setShowReset(false)} />}
    </AuthLayout>
  )
}
