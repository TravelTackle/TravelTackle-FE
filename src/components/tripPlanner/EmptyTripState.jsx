import { Icon } from '@iconify/react'
import Button from '../ui/Button'

// 계획이 하나도 없을 때 편집기 화면 안에 그대로 보여주는 빈 상태 (와이어프레임 #9)
export default function EmptyTripState({ onCreate }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 py-24 text-center">
      <Icon icon="solar:map-point-linear" width={34} className="text-slate-300" />
      <p className="text-[14px] font-semibold text-slate-500">아직 계획이 없습니다.</p>
      <Button onClick={onCreate} className="mt-1 h-11 rounded-xl px-6 text-[13px] font-bold">
        첫 여행 계획 만들기
      </Button>
    </div>
  )
}
