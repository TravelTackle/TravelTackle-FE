import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import AuthLayout from '../components/auth/AuthLayout'
import Button from '../components/ui/Button'
import FormField from '../components/ui/FormField'
import { COUNTRIES } from '../data/countries'
import { useAuth } from '../context/AuthContext'
import * as authApi from '../api/auth'

const RESEND_COOLDOWN = 60
const CODE_EXPIRE_SECONDS = 600 // 백엔드 email-verification-expiration-minutes(10분)와 일치
const inputClass =
  'w-full h-12 px-4 rounded-xl border border-slate-200 bg-surface text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand transition-all disabled:bg-slate-50 disabled:text-slate-400'

// MyPageAccountSettings의 알림 설정과 같은 체크 인디케이터 — 기본 브라우저 체크박스 대신 씀
function NotifToggle({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          checked ? 'border-brand bg-brand' : 'border-slate-200 bg-surface'
        }`}
      >
        {checked && <Icon icon="solar:check-bold" width={9} color="white" />}
      </span>
      {label}
      {hint && <span className="font-normal text-slate-400">{hint}</span>}
    </button>
  )
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState('email')

  const [email, setEmail] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [codeVerified, setCodeVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [expiresIn, setExpiresIn] = useState(0) // 인증번호 만료까지 남은 초

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nationality, setNationality] = useState('KR')
  const [nationalityOpen, setNationalityOpen] = useState(false)
  const nationalityRef = useRef(null)
  const selectedCountry = COUNTRIES.find((c) => c.code === nationality) ?? COUNTRIES[0]
  // 알림 수신 동의 — 기본값은 전부 켜둠(선택 사항). 이메일 동의를 끄면 하위 항목도 같이 꺼진다.
  // 세부 항목 패널은 체크 여부와 별개로, 왼쪽 꺽쇠를 눌러야만 펼쳐진다(기본은 접힘).
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyFeedback, setNotifyFeedback] = useState(true)
  const [notifyRecommend, setNotifyRecommend] = useState(true)
  const [notifyEvent, setNotifyEvent] = useState(true)
  const [notifyDetailsOpen, setNotifyDetailsOpen] = useState(false)

  function toggleNotifyEmail() {
    setNotifyEmail((v) => {
      const next = !v
      setNotifyFeedback(next)
      setNotifyRecommend(next)
      setNotifyEvent(next)
      return next
    })
  }

  const [emailError, setEmailError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [formError, setFormError] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const timerRef = useRef(null)
  const expireRef = useRef(null)

  useEffect(() => {
    if (cooldown <= 0) {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [cooldown])

  // 인증번호 만료 카운트다운
  useEffect(() => {
    if (expiresIn <= 0) {
      clearInterval(expireRef.current)
      return
    }
    expireRef.current = setInterval(() => setExpiresIn((s) => s - 1), 1000)
    return () => clearInterval(expireRef.current)
  }, [expiresIn])

  // 국적 드롭다운 — Navbar 언어 선택과 같은 패턴(바깥 클릭/Esc로 닫힘)
  useEffect(() => {
    function onClickOutside(e) {
      if (nationalityRef.current && !nationalityRef.current.contains(e.target)) setNationalityOpen(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') setNationalityOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  const expired = codeSent && !codeVerified && expiresIn <= 0
  const mmss = `${String(Math.floor(expiresIn / 60)).padStart(2, '0')}:${String(expiresIn % 60).padStart(2, '0')}`

  const handleSendCode = async () => {
    setEmailError('')
    setSendingCode(true)
    try {
      await authApi.requestEmailCode(email)
      setCodeSent(true)
      setCode('')
      setCodeError('')
      setCooldown(RESEND_COOLDOWN)
      setExpiresIn(CODE_EXPIRE_SECONDS)
    } catch (err) {
      if (err.response?.status === 429) {
        setEmailError('요청이 너무 많아요. 잠시 후 다시 시도해주세요.')
      } else if (err.response?.status === 409) {
        setEmailError('이미 가입된 이메일이에요.')
      } else {
        setEmailError('인증번호 전송에 실패했어요.')
      }
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (expiresIn <= 0) {
      setCodeError('인증번호가 만료됐어요. 코드를 재전송해주세요.')
      return
    }
    setCodeError('')
    setVerifyingCode(true)
    try {
      await authApi.confirmEmailCode(email, code)
      setCodeVerified(true)
      setExpiresIn(0)
      setStep('info')
    } catch {
      setCodeError('인증번호가 올바르지 않거나 만료됐어요.')
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleChangeEmail = () => {
    clearInterval(timerRef.current)
    clearInterval(expireRef.current)
    setCodeSent(false)
    setCodeVerified(false)
    setCode('')
    setCooldown(0)
    setExpiresIn(0)
    setCodeError('')
    setStep('email')
  }

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit =
    codeVerified && name.trim() && password.length >= 8 && password === confirmPassword && nationality

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setFormError('')
    setSubmitting(true)
    try {
      await authApi.signup({ email, password, name, nationality })
      await login({ email, password })
      // 알림 동의는 선택 사항이라 실패해도 가입 자체는 막지 않는다
      await authApi
        .updateNotificationSettings({ notifyEmail, notifyFeedback, notifyRecommend, notifyEvent })
        .catch(() => {})
      navigate('/onboarding/welcome')
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError('이미 가입된 이메일이에요.')
      } else {
        setFormError('회원가입에 실패했어요. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[13px] font-semibold text-brand-dark mb-1">시작하기</h1>
      <p className="text-[22px] font-extrabold text-slate-800 mb-1">회원가입하고 여행을 계획해보세요</p>
      <p className="text-[13px] text-slate-400 mb-7">{step === 'email' ? '1/2 · 이메일 인증' : '2/2 · 회원 정보 입력'}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {step === 'email' && (
          <>
            <div>
              <span className="block text-[13px] font-semibold text-slate-600 mb-1.5">이메일</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                  autoComplete="email"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!email || sendingCode || cooldown > 0}
                  variant="light"
                  className="shrink-0 h-12 px-5 rounded-xl font-bold text-[13.5px] whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
                >
                  {cooldown > 0
                    ? `재전송 (${cooldown}초)`
                    : codeSent
                      ? '인증 재전송'
                      : sendingCode
                        ? '전송 중...'
                        : '인증 받기'}
                </Button>
              </div>
              {emailError && <p className="mt-1.5 text-[12px] text-rose-500">{emailError}</p>}
            </div>

            {codeSent && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-slate-600">인증번호</span>
                  {!codeVerified && (
                    <span className={`text-[12px] font-semibold ${expired ? 'text-rose-500' : 'text-brand-dark'}`}>
                      {expired ? '만료됨' : `${mmss} 남음`}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    placeholder="ex) 123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    disabled={expired}
                    className={inputClass}
                    required
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={code.length !== 6 || verifyingCode || expired}
                    className="shrink-0 h-12 px-5 rounded-xl font-bold text-[13.5px] whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {verifyingCode ? '확인 중...' : '인증 하기'}
                  </Button>
                </div>
                {expired && !codeError && (
                  <p className="mt-1.5 text-[12px] text-rose-500">인증번호가 만료됐어요. 코드를 재전송해주세요.</p>
                )}
                {codeError && <p className="mt-1.5 text-[12px] text-rose-500">{codeError}</p>}
              </div>
            )}
          </>
        )}

        {step === 'info' && (
          <>
            <div className="flex items-center gap-1.5 -mt-1 mb-1 text-[12.5px] font-semibold text-brand-dark">
              <Icon icon="solar:check-circle-bold" width={15} className="shrink-0" />
              <span className="truncate">{email}</span>
              <button
                type="button"
                onClick={handleChangeEmail}
                className="ml-auto shrink-0 text-slate-400 hover:text-slate-600 font-medium transition-all"
              >
                이메일 변경
              </button>
            </div>

            <FormField
              label="이름"
              placeholder="이름을 입력해주세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <FormField
              label="비밀번호"
              type="password"
              placeholder="8~72자로 입력해주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />

            <FormField
              label="비밀번호 확인"
              type="password"
              placeholder="비밀번호를 다시 입력해주세요"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={passwordMismatch ? '비밀번호가 일치하지 않아요.' : ''}
              autoComplete="new-password"
              required
            />

            <div className="relative" ref={nationalityRef}>
              <span className="block text-[13px] font-semibold text-slate-600 mb-1.5">국적</span>
              <button
                type="button"
                onClick={() => setNationalityOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={nationalityOpen}
                className={`flex w-full h-12 items-center justify-between px-4 rounded-xl border bg-surface text-[14px] text-slate-900 outline-none transition-all ${
                  nationalityOpen ? 'border-brand' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{selectedCountry.label}</span>
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  width={15}
                  className={`text-slate-400 transition-transform duration-300 ${nationalityOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {nationalityOpen && (
                <ul
                  role="listbox"
                  aria-label="국적 선택"
                  className="nav-pop absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-100 bg-surface py-1.5 shadow-popup ring-1 ring-black/5"
                >
                  {COUNTRIES.map((c) => {
                    const active = c.code === nationality
                    return (
                      <li key={c.code}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setNationality(c.code)
                            setNationalityOpen(false)
                          }}
                          className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-[13.5px] transition-colors ${
                            active ? 'bg-brand-light/60 font-bold text-brand' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{c.label}</span>
                          {active && <Icon icon="solar:check-bold" width={14} />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1">
                {/* 세부 항목 펼치기 — 체크 여부와는 별개 동작. ExploreSidebar 접기·펼치기와 같은 화살표 */}
                <button
                  type="button"
                  onClick={() => setNotifyDetailsOpen((v) => !v)}
                  aria-expanded={notifyDetailsOpen}
                  aria-label="알림 세부 항목 보기"
                  className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <Icon icon="solar:alt-arrow-down-linear" width={11} className={`transition-transform ${notifyDetailsOpen ? 'rotate-180' : ''}`} />
                </button>
                <NotifToggle label="이메일 알림 수신 동의" hint="(선택)" checked={notifyEmail} onChange={toggleNotifyEmail} />
              </div>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${notifyDetailsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="ml-5 mt-2.5 flex flex-col gap-2 border-l-2 border-slate-100 pl-3">
                    <NotifToggle label="피드백 알림" checked={notifyFeedback} onChange={setNotifyFeedback} />
                    <NotifToggle label="여행 추천" checked={notifyRecommend} onChange={setNotifyRecommend} />
                    <NotifToggle label="이벤트" checked={notifyEvent} onChange={setNotifyEvent} />
                  </div>
                </div>
              </div>
            </div>

            {formError && <p className="text-[12.5px] text-rose-500 -mt-1">{formError}</p>}

            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="h-12 rounded-xl font-bold text-[15px] disabled:opacity-50 mt-1"
            >
              {submitting ? '가입 중...' : '가입하기'}
            </Button>
          </>
        )}
      </form>

      <p className="text-center text-[13px] text-slate-500 mt-7">
        계정이 있으신가요?{' '}
        <Link to="/login" className="font-bold text-brand-dark">
          로그인
        </Link>
      </p>
    </AuthLayout>
  )
}
