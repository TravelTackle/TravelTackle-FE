import { useState } from 'react'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import DatePill from './DatePill'
import { addDays } from '../../lib/tripTime'
import { useLanguage } from '../../i18n'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const T = {
  ko: {
    heading: '여행 계획 만들기',
    close: '닫기',
    titleLabel: '여행 제목',
    titlePlaceholder: '여행 계획의 제목이 들어갈 자리에요',
    period: '기간',
    startDate: '출발일',
    endDate: '종료일',
    invalidRange: '종료일은 출발일 이후여야 해요.',
    createFailed: '계획을 만들지 못했어요. 다시 시도해주세요.',
    creating: '만드는 중',
    create: '만들기',
  },
  en: {
    heading: 'Create a trip plan',
    close: 'Close',
    titleLabel: 'Trip title',
    titlePlaceholder: 'Give your trip plan a title',
    period: 'Dates',
    startDate: 'Start date',
    endDate: 'End date',
    invalidRange: 'The end date must be after the start date.',
    createFailed: 'Could not create the plan. Please try again.',
    creating: 'Creating',
    create: 'Create',
  },
}

// PasswordResetModal과 동일한 오버레이+카드 패턴 — 제목 + 출발일/종료일만 받는 계획 생성 모달
export default function TripCreateModal({ onClose, onCreate }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [title, setTitle] = useState('')
  // 기본값은 오늘 출발 + 3박4일 — 실제로 계획을 짜기 시작할 때 흔한 여행 길이로 바로 채워둔다.
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(addDays(today(), 3))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const invalidRange = startDate > endDate

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || invalidRange || submitting) return
    setSubmitting(true)
    setError('')
    // onCreate는 실제 생성 API를 호출한다 — 실패하면 모달은 그대로 두고 에러만 보여준다(재입력 없이 다시 시도 가능).
    Promise.resolve(onCreate(title.trim(), startDate, endDate)).catch(() => {
      setSubmitting(false)
      setError(copy.createFailed)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-[380px] rounded-2xl bg-surface p-6 shadow-popup" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-slate-800">{copy.heading}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label={copy.close}>
            <Icon icon="solar:close-circle-linear" width={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label={copy.titleLabel}
            placeholder={copy.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-600">{copy.period}</span>
            <div className="flex flex-wrap items-center gap-2">
              <DatePill label={copy.startDate} value={startDate} onChange={setStartDate} max={endDate} />
              <DatePill label={copy.endDate} value={endDate} onChange={setEndDate} min={startDate} />
            </div>
            {invalidRange && <p className="mt-1.5 text-[12px] text-rose-500">{copy.invalidRange}</p>}
          </div>

          {error && <p className="text-[12px] text-rose-500">{error}</p>}

          <Button
            type="submit"
            disabled={!title.trim() || invalidRange || submitting}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl font-bold disabled:opacity-50"
          >
            {submitting && <Icon icon="mdi:loading" width={16} className="animate-spin" />}
            {submitting ? copy.creating : copy.create}
          </Button>
        </form>
      </div>
    </div>
  )
}
