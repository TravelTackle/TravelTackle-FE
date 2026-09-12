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

// 카드/상세 사이드바 하단 공통 액션바 (좋아요/댓글/공유 + 북마크).
// 북마크 상태는 항상 부모가 넘겨준다(controlled) — 같은 화면에 카드와 상세 패널이 동시에 떠 있을 때
// 한쪽에서 토글하면 다른 쪽도 바로 반영되도록, 상태를 페이지 하나(useScrapMap)에서만 들고 있게 하기 위함.
export function FeedActionBar({ bordered = true, size = 20, saved = false, pending = false, onToggle }) {
  return (
    <div className={`mt-3 flex items-center justify-between ${bordered ? 'border-t border-slate-100 pt-3' : ''}`}>
      <div className="flex items-center gap-3 text-slate-400">
        <button type="button" onClick={(e) => e.stopPropagation()} aria-label="좋아요" className="hover:text-rose-500 transition-colors">
          <Icon icon="mdi:heart-outline" width={size} />
        </button>
        <button type="button" onClick={(e) => e.stopPropagation()} aria-label="댓글" className="hover:text-brand transition-colors">
          <Icon icon="mdi:comment-outline" width={size} />
        </button>
        <button type="button" onClick={(e) => e.stopPropagation()} aria-label="공유" className="hover:text-brand transition-colors">
          <Icon icon="mdi:share-variant-outline" width={size} />
        </button>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.()
        }}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? '스크랩 해제' : '스크랩'}
        className={`transition-colors disabled:opacity-50 ${saved ? 'text-brand' : 'text-slate-400 hover:text-brand'}`}
      >
        <Icon icon={saved ? 'mdi:bookmark' : 'mdi:bookmark-outline'} width={size} />
      </button>
    </div>
  )
}
