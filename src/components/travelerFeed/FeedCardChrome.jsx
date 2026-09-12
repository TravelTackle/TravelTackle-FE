import { Icon } from '@iconify/react'
import Chip from '../ui/Chip'
import IconBadge from '../ui/IconBadge'

const TYPE_CHIP = {
  plan: { label: '여행 계획', className: 'bg-brand-light text-brand-dark' },
  record: { label: '여행 기록', className: 'bg-emerald-50 text-emerald-600' },
}

// 카드/상세 사이드바에서 공통으로 쓰는 작성자 헤더 (아바타 + 닉네임 + 지역 + 타입 칩)
export function FeedUserHeader({ item, showChip = true }) {
  const chip = TYPE_CHIP[item.type]
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <IconBadge className="h-8 w-8 rounded-full bg-slate-200 text-slate-400">
          <Icon icon="mdi:account" width={16} />
        </IconBadge>
        <div>
          <div className="text-[13px] font-bold text-slate-900">{item.user.nickname}</div>
          <div className="text-[11px] text-slate-400">{item.region}</div>
        </div>
      </div>
      {showChip && <Chip className={`px-2.5 py-1 text-[11px] font-bold ${chip.className}`}>{chip.label}</Chip>}
    </div>
  )
}

// 카드/상세 사이드바 하단 공통 액션바 — 참견(말풍선)과 스크랩(북마크) 둘만. 좋아요·공유는 기능 계획이 없어 뺐다.
export function FeedActionBar({ bordered = true, size = 20 }) {
  return (
    <div className={`mt-3 flex items-center justify-between ${bordered ? 'border-t border-slate-100 pt-3' : ''}`}>
      <button type="button" onClick={(e) => e.stopPropagation()} aria-label="참견" className="text-slate-400 hover:text-brand transition-colors">
        <Icon icon="mdi:comment-outline" width={size} />
      </button>
      <button type="button" onClick={(e) => e.stopPropagation()} aria-label="스크랩" className="text-slate-400 hover:text-brand transition-colors">
        <Icon icon="mdi:bookmark-outline" width={size} />
      </button>
    </div>
  )
}
