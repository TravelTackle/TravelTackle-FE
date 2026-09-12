import { Icon } from '@iconify/react'

export default function OptionCard({ option, selected, multiple, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        selected ? 'border-brand bg-brand-light' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
      }`}
    >
      {option.icon && (
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            selected ? 'bg-white text-brand' : 'bg-white text-slate-400 ring-1 ring-slate-100'
          }`}
        >
          <Icon icon={option.icon} width={16} />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className={`block whitespace-nowrap text-[14px] font-bold ${selected ? 'text-brand-dark' : 'text-slate-800'}`}>
          {option.label}
        </span>
        {option.description && (
          <span className="block text-[12px] text-slate-500 mt-0.5">{option.description}</span>
        )}
      </span>
      <span
        className={`w-4 h-4 shrink-0 flex items-center justify-center border-2 transition-all ${
          multiple ? 'rounded-md' : 'rounded-full'
        } ${selected ? 'bg-brand border-brand' : 'border-slate-300 bg-white'}`}
      >
        {selected && <Icon icon="solar:check-bold" width={10} color="white" />}
      </span>
    </button>
  )
}
