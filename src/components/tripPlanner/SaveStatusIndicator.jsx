import { Icon } from '@iconify/react'

const CONFIG = {
  saving: { icon: 'mdi:loading', spin: true, text: '저장 중', tone: 'border-slate-200 text-slate-400' },
  saved: { icon: 'solar:check-circle-bold', spin: false, text: '저장됨', tone: 'border-emerald-100 text-emerald-600' },
  error: { icon: 'solar:danger-triangle-bold', spin: false, text: '저장 실패 · 되돌렸어요', tone: 'border-rose-100 text-rose-500' },
}

// 드래그/수정 저장 상태를 화면 좌측 하단에 작게 알려준다 — 눈에 덜 띄게 흰 배경 + 옅은 테두리로,
// 저장 중엔 계속 떠 있고, 성공/실패 시 잠깐 보였다 사라진다.
export default function SaveStatusIndicator({ status }) {
  if (status === 'idle') return null
  const { icon, spin, text, tone } = CONFIG[status]

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-1.5 rounded-full border bg-white/95 px-3 py-1.5 text-[11.5px] font-semibold shadow-card transition-all duration-200 ${tone}`}
    >
      <Icon icon={icon} width={13} className={spin ? 'animate-spin' : ''} />
      {text}
    </div>
  )
}
