import { useState } from 'react'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import { useLanguage } from '../../i18n'
import * as authApi from '../../api/auth'

const T = {
  ko: {
    title: '비밀번호 찾기',
    close: '닫기',
    emailStepDesc: '가입한 이메일로 인증번호를 보내드려요.',
    emailLabel: '이메일',
    sending: '전송 중...',
    getCode: '인증번호 받기',
    resetStepDesc: (email) => `${email}로 받은 인증번호와 새 비밀번호를 입력해주세요.`,
    codeLabel: '인증번호',
    newPasswordLabel: '새 비밀번호',
    newPasswordPlaceholder: '8~72자',
    changing: '변경 중...',
    changePassword: '비밀번호 변경',
    doneMessage: '비밀번호가 변경됐어요. 새 비밀번호로 로그인해주세요.',
    confirm: '확인',
    errorRequestFailed: '인증번호 요청에 실패했어요. 잠시 후 다시 시도해주세요.',
    errorCodeInvalid: '인증번호가 올바르지 않거나 만료되었어요.',
  },
  en: {
    title: 'Reset password',
    close: 'Close',
    emailStepDesc: "We'll send a verification code to your registered email.",
    emailLabel: 'Email',
    sending: 'Sending...',
    getCode: 'Get verification code',
    resetStepDesc: (email) => `Enter the verification code sent to ${email} and your new password.`,
    codeLabel: 'Verification code',
    newPasswordLabel: 'New password',
    newPasswordPlaceholder: '8–72 characters',
    changing: 'Changing...',
    changePassword: 'Change password',
    doneMessage: 'Your password has been changed. Please log in with your new password.',
    confirm: 'OK',
    errorRequestFailed: 'Failed to request the verification code. Please try again shortly.',
    errorCodeInvalid: 'The verification code is invalid or expired.',
  },
}

export default function PasswordResetModal({ onClose }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.requestPasswordReset(email)
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.message || copy.errorRequestFailed)
    } finally {
      setLoading(false)
    }
  }

  const confirmReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.confirmPasswordReset({ email, code, newPassword })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.message || copy.errorCodeInvalid)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-[380px] bg-surface rounded-2xl shadow-popup p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-slate-800">{copy.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all" aria-label={copy.close}>
            <Icon icon="solar:close-circle-linear" width={22} />
          </button>
        </div>

        {step === 'email' && (
          <form onSubmit={requestCode} className="flex flex-col gap-4">
            <p className="text-[13px] text-slate-500 -mt-2">{copy.emailStepDesc}</p>
            <FormField
              label={copy.emailLabel}
              type="email"
              placeholder="traveler@traveltackle.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-[12px] text-rose-500">{error}</p>}
            <Button type="submit" disabled={loading} className="h-12 rounded-xl font-bold disabled:opacity-50">
              {loading ? copy.sending : copy.getCode}
            </Button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={confirmReset} className="flex flex-col gap-4">
            <p className="text-[13px] text-slate-500 -mt-2">{copy.resetStepDesc(email)}</p>
            <FormField
              label={copy.codeLabel}
              inputMode="numeric"
              placeholder="ex) 123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
            />
            <FormField
              label={copy.newPasswordLabel}
              type="password"
              placeholder={copy.newPasswordPlaceholder}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
            {error && <p className="text-[12px] text-rose-500">{error}</p>}
            <Button type="submit" disabled={loading} className="h-12 rounded-xl font-bold disabled:opacity-50">
              {loading ? copy.changing : copy.changePassword}
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <Icon icon="solar:check-circle-bold" width={40} className="text-brand" />
            <p className="text-[14px] text-slate-600">{copy.doneMessage}</p>
            <Button onClick={onClose} className="h-11 px-6 rounded-xl font-bold w-full">
              {copy.confirm}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
