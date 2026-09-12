import { Icon } from '@iconify/react'
import Button from '../ui/Button'

const FILTERS = [
  { value: 'all', label: '전체', icon: 'mdi:shuffle-variant' },
  { value: 'plan', label: '계획만 보기', icon: 'mdi:calendar-blank-outline' },
  { value: 'record', label: '기록만 보기', icon: 'mdi:camera-outline' },
]

const VIEWS = [
  { value: 'list', icon: 'mdi:format-list-bulleted', label: '리스트 보기' },
  { value: 'gallery', icon: 'mdi:view-grid', label: '갤러리 보기' },
]

export default function FeedFilterBar({ filter, onFilterChange, view, onViewChange, onUploadClick }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange(f.value)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-all ${
                active ? 'border-brand bg-brand text-white' : 'border-[#5C5C5C] bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon icon={f.icon} width={14} />
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden items-center gap-1 rounded-xl bg-slate-100 p-1 sm:flex">
          {/* 선택된 아이콘 뒤에서 슬라이드로 이동하는 흰색 배경 */}
          <div
            aria-hidden="true"
            className="absolute left-1 top-1 h-7 w-7 rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out"
            style={{ transform: `translateX(calc(${VIEWS.findIndex((v) => v.value === view)} * (100% + 0.25rem)))` }}
          />
          {VIEWS.map((v) => {
            const active = view === v.value
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => onViewChange(v.value)}
                aria-label={v.label}
                aria-pressed={active}
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  active ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon icon={v.icon} width={17} />
              </button>
            )
          })}
        </div>

        <Button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 rounded-full border-2 border-white px-4 py-2 text-[12.5px] font-bold shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
        >
          <Icon icon="mdi:cloud-upload-outline" width={16} />
          기록 업로드
        </Button>
      </div>
    </div>
  )
}
