import { Icon } from '@iconify/react'

// 반려동물 동반 표시 — 백엔드(한국관광공사 반려동물 동반여행 데이터)가 주는 값만 쓴다.
// 계획 단위 요약: { all, count, total }. all이면 "반려동물 동반 코스", 아니면 "N곳 동반 가능".
// 장소 단위: true(가능) / false(불가) / null(미확인) — null이면 아무것도 그리지 않는다.
export const PET_ICON = 'mdi:paw'

export function hasPetSummary(summary) {
  return !!summary && (summary.all || (summary.count ?? 0) > 0)
}

// 계획 카드·상세에 붙는 뱃지. 값이 없거나 동반 가능한 장소가 하나도 없으면 렌더하지 않는다.
export default function PetFriendlyBadge({ summary, size = 'sm', className = '' }) {
  if (!hasPetSummary(summary)) return null
  const { all, count, total } = summary
  const small = size === 'sm'
  return (
    <span
      title={all ? '모든 장소가 애견 동반 가능해요' : `${total}곳 중 ${count}곳이 애견 동반 가능해요`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-bold ${
        small ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]'
      } ${all ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} ${className}`}
    >
      <Icon icon={PET_ICON} width={small ? 11 : 12} />
      {all ? '애견 동반' : `${count}/${total}곳 동반`}
    </span>
  )
}

// 장소 한 곳에 붙는 작은 발바닥 — 계획 편집·장바구니 행에서 쓴다
export function PetFriendlyMark({ value, className = '' }) {
  if (value !== true) return null
  return (
    <Icon
      icon={PET_ICON}
      width={12}
      aria-label="애견 동반 가능"
      className={`shrink-0 text-emerald-500 ${className}`}
    />
  )
}
