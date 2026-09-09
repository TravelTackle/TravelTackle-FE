import { useRef } from 'react'
import { Icon } from '@iconify/react'

// 라벨만 파란 캡슐, 날짜/아이콘은 바깥에 검정 텍스트로.
// 네이티브 date input의 텍스트 영역만 클릭하면 세그먼트 포커스만 잡히고 달력은 안 열리는 브라우저 기본 동작 때문에,
// showPicker()로 어디를 눌러도 달력이 뜨도록 강제한다.
export default function DatePill({ label, value, onChange, min, max }) {
  const inputRef = useRef(null)

  function openPicker() {
    try {
      inputRef.current?.showPicker()
    } catch {
      inputRef.current?.focus()
    }
  }

  return (
    <div className="relative inline-flex cursor-pointer items-center gap-1.5" onClick={openPicker}>
      <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">{label}</span>
      <span className="text-[11.5px] font-bold text-slate-800">{value.replaceAll('-', '/')}</span>
      <Icon icon="mdi:calendar-blank-outline" width={13} className="text-slate-500" />
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
