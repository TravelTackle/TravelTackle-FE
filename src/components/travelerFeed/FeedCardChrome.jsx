import { Icon } from '@iconify/react'
import Chip from '../ui/Chip'
import IconBadge from '../ui/IconBadge'
import { targetTripId, useFeedActions } from './FeedActionsContext'

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

// 카드/상세 사이드바 하단 공통 액션바 — 참견(말풍선 + 수)과 스크랩(북마크 + 수).
// 동작과 저장 상태는 FeedActionsContext(피드 페이지 제공)에서 온다. item이 없거나 컨텍스트가 없으면 아이콘만 보인다.
export function FeedActionBar({ item, bordered = true, size = 20 }) {
  const { savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback } = useFeedActions()
  const tripId = targetTripId(item)
  const saved = !!(tripId && savedIds.has(tripId))
  const pending = !!(tripId && pendingIds.has(tripId))
  const feedbackCount = item ? (item.feedbackCount ?? 0) + (feedbackDelta[tripId] ?? 0) : null
  const saveCount = item && typeof item.saveCount === 'number' ? item.saveCount + (saveDelta[tripId] ?? 0) : null

  return (
    <div className={`mt-3 flex items-center justify-between ${bordered ? 'border-t border-slate-100 pt-3' : ''}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (item) openFeedback(item) }}
        aria-label={feedbackCount ? `참견 ${feedbackCount}개 보기` : '참견 남기기'}
        className="group/act flex items-center gap-1.5 rounded-full py-1 pr-2 text-slate-400 transition-colors hover:text-brand"
      >
        <Icon icon="mdi:comment-outline" width={size} className="transition-transform group-hover/act:-rotate-6" />
        {feedbackCount != null && <span className="text-[12px] font-bold tabular-nums">{feedbackCount}</span>}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (item) toggleSave(item) }}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? '스크랩 해제' : '스크랩'}
        className={`group/act flex items-center gap-1.5 rounded-full py-1 pl-2 transition-colors disabled:cursor-wait ${
          saved ? 'text-brand' : 'text-slate-400 hover:text-brand'
        }`}
      >
        {saveCount != null && <span className="text-[12px] font-bold tabular-nums">{saveCount}</span>}
        {pending ? (
          <Icon icon="mdi:loading" width={size} className="animate-spin text-brand" />
        ) : (
          <Icon
            key={saved ? 'on' : 'off'}
            icon={saved ? 'solar:bookmark-bold' : 'mdi:bookmark-outline'}
            width={size}
            className={saved ? 'ai-pop' : 'transition-transform group-hover/act:scale-110'}
          />
        )}
      </button>
    </div>
  )
}
