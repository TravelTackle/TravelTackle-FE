import { useState } from 'react'
import { Icon } from '@iconify/react'

export default function FormField({ label, type = 'text', error, className = '', ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (show ? 'text' : 'password') : type

  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-[13px] font-semibold text-slate-600 mb-1.5">{label}</span>}
      <div className="relative">
        <input
          type={inputType}
          className={`w-full h-12 px-4 rounded-xl border bg-surface text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
            error ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-brand'
          } ${isPassword ? 'pr-11' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all"
            tabIndex={-1}
            aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            <Icon icon={show ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width={18} />
          </button>
        )}
      </div>
      {error && <span className="block mt-1.5 text-[12px] text-rose-500">{error}</span>}
    </label>
  )
}
