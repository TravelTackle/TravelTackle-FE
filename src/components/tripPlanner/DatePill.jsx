import { useRef } from 'react'
import { Icon } from '@iconify/react'

// 라벨만 파란 캡슐, 날짜/아이콘은 바깥에 검정 텍스트로.
// 네이티브 date input의 텍스트 영역만 클릭하면 세그먼트 포커스만 잡히고 달력은 안 열리는 브라우저 기본 동작 때문에,
// showPicker()로 어디를 눌러도 달력이 뜨도록 강제한다.
// disabled: 공개 중인 계획처럼 날짜를 바꿀 수 없을 때 — 달력이 안 열리고 흐리게 보인다
export default function DatePill({ label, value, onChange, min, max, disabled = false }) {
  const inputRef = useRef(null)

  function openPicker() {
    if (disabled) return
    try {
      inputRef.current?.showPicker()
    } catch {
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      onClick={openPicker}
      aria-disabled={disabled}
    >
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${disabled ? 'bg-slate-400' : 'bg-brand'}`}>{label}</span>
      <span className="text-[11.5px] font-bold text-slate-800">{value.replaceAll('-', '/')}</span>
      <Icon icon="mdi:calendar-blank-outline" width={13} className="text-slate-500" />
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        tabIndex={-1}
        className={`absolute inset-0 h-full w-full opacity-0 ${disabled ? 'pointer-events-none' : 'cursor-pointer'}`}
      />
    </div>
  )
}
