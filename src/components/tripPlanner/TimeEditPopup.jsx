import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import { useLanguage } from '../../i18n'

const T = {
  ko: {
    start: '시작',
    end: '종료',
    invalidRange: '종료 시각은 시작 이후여야 해요.',
    save: '저장',
  },
  en: {
    start: 'Start',
    end: 'End',
    invalidRange: 'The end time must be after the start time.',
    save: 'Save',
  },
}

// 시간 텍스트 클릭 시 뜨는 시작/종료 시각 설정 팝업
export default function TimeEditPopup({ startTime, endTime, onSave, onClose }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [start, setStart] = useState(startTime)
  const [end, setEnd] = useState(endTime)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [onClose])

  function handleSave(e) {
    e.preventDefault()
    if (start >= end) return
    onSave({ startTime: start, endTime: end })
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-20 mt-1.5 w-56 rounded-xl border border-slate-100 bg-surface p-3 shadow-popup"
      onClick={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSave} className="flex flex-col gap-2.5">
        <label className="flex items-center justify-between gap-2 text-[12px] font-semibold text-slate-500">
          {copy.start}
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 px-2 text-[13px] text-slate-800 outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-[12px] font-semibold text-slate-500">
          {copy.end}
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 px-2 text-[13px] text-slate-800 outline-none focus:border-brand"
          />
        </label>
        {start >= end && <p className="text-[11px] text-rose-500">{copy.invalidRange}</p>}
        <Button type="submit" className="h-9 rounded-lg text-[12.5px] font-bold">
          {copy.save}
        </Button>
      </form>
    </div>
  )
}
