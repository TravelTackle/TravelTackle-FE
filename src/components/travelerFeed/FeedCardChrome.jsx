import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Avatar from '../ui/Avatar'
import Chip from '../ui/Chip'
import { publishTrip, unpublishTrip } from '../../api/trip'
import { targetTripId, useFeedActions } from './FeedActionsContext'
import { formatFeedDate } from '../../lib/homeFormat'

const TYPE_CHIP = {
  plan: { label: '여행 계획', className: 'bg-brand-light text-brand-dark' },
  record: { label: '여행 기록', className: 'bg-emerald-50 text-emerald-600' },
}

// TripHeader(나의 여행 - 나의 계획)에서 게시 전환 시 뜨는 토스트와 같은 문구·스타일
const PUBLISH_TOAST = {
  on: '게시했어요! 여행자 피드에서 확인할 수 있어요.',
  off: '비공개로 전환했어요. 이 여행의 기록도 함께 비공개돼요.',
}

// TripHeader(나의 여행 - 나의 계획)의 나만보기/전체공개 토글과 완전히 같은 디자인·동작 —
// 두 라벨을 같은 grid 셀에 겹쳐 버튼 폭은 고정하고 위아래로 슬라이드+페이드하며 전환한다.
// item.published가 있는(=내 계획인) 카드에서만 쓰이므로 상태는 로컬로 들고 직접 API를 호출한다.
function PublishToggle({ item }) {
  const [published, setPublished] = useState(item.published)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  async function handleToggle(e) {
    e.stopPropagation()
    if (saving) return
    const next = !published
    setSaving(true)
    setPublished(next)
    // TripHeader와 동일하게 낙관적으로 먼저 알리고, 실패하면 조용히 되돌린다(토스트는 다시 취소하지 않음)
    showToast(next ? PUBLISH_TOAST.on : PUBLISH_TOAST.off)
    try {
      await (next ? publishTrip(item.id) : unpublishTrip(item.id))
    } catch {
      setPublished(!next) // 실패하면 원래 상태로 되돌린다
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        title={published ? '눌러서 나만 보기로 전환 (기록도 함께 비공개)' : '눌러서 전체공개로 전환'}
        style={{ display: 'grid' }}
        className={`shrink-0 overflow-hidden rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-150 disabled:opacity-60 ${
          published ? 'bg-brand-light text-brand' : 'bg-rose-50 text-rose-600'
        }`}
      >
        <span
          className={`col-start-1 row-start-1 flex items-center justify-center transition-all duration-150 ease-out ${
            published ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
          }`}
        >
          전체공개
        </span>
        <span
          className={`col-start-1 row-start-1 flex items-center justify-center transition-all duration-150 ease-out ${
            published ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          나만 보기
        </span>
      </button>

      {/* TripPlannerPage 토스트와 동일한 위치·스타일 — 카드(Card)에 hover 시 걸리는 .lift의
          transform이 fixed 자손의 기준을 카드로 바꿔버려서, body에 포탈로 그려 화면 기준 하단
          중앙에 뜨게 한다 */}
      {toast &&
        createPortal(
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/90 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-popup">
            {toast}
          </div>,
          document.body,
        )}
    </>
  )
}

// 카드/상세 사이드바에서 공통으로 쓰는 작성자 헤더 (아바타 + 닉네임 + 지역 + 타입 칩)
export function FeedUserHeader({ item, showChip = true }) {
  const chip = TYPE_CHIP[item.type]
  // item.published는 내 계획(마이페이지 프로필 탭)에서만 채워 넣는 값 — 남의 계획엔 없어서 자연히 안 보인다.
  const showPublishToggle = showChip && item.type === 'plan' && typeof item.published === 'boolean'
  // 계획은 수정된 적 있으면 최신 수정일, 없으면 작성일. 기록은 항상 작성일.
  const feedDate = formatFeedDate(item.type === 'plan' ? item.updatedAt ?? item.createdAt : item.createdAt)
  const meta = [item.region, feedDate].filter(Boolean).join(' · ')
  // 작성자 id가 있을 때만 프로필로 이동 — 없으면(레거시/추천 데이터 등) 그냥 텍스트로 둔다.
  // 카드 전체가 클릭 영역이라 여기서 이동하면 stopPropagation으로 카드의 상세 열기를 막아야 한다.
  const profileTo = item.user.id != null ? `/profile/${item.user.id}` : null
  const identity = (
    <>
      <Avatar user={{ name: item.user.nickname, profileImageUrl: item.user.profileImageUrl }} size={32} />
      <div>
        <div className="text-[13px] font-bold text-slate-900">{item.user.nickname}</div>
        <div className="text-[11px] text-slate-400">{meta}</div>
      </div>
    </>
  )
  return (
    <div className="flex items-center justify-between">
      {profileTo ? (
        <Link to={profileTo} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:opacity-80">
          {identity}
        </Link>
      ) : (
        <div className="flex items-center gap-2">{identity}</div>
      )}
      {showChip && (
        <div className="flex shrink-0 items-center gap-1.5">
          {showPublishToggle && <PublishToggle item={item} />}
          <Chip className={`px-2.5 py-1 text-[11px] font-bold ${chip.className}`}>{chip.label}</Chip>
        </div>
      )}
    </div>
  )
}

// 카드/상세 사이드바 하단 공통 액션바 — 참견(말풍선 + 수)과 스크랩(북마크 + 수).
// 동작과 저장 상태는 FeedActionsContext(피드 페이지 제공)에서 온다. item이 없거나 컨텍스트가 없으면 아이콘만 보인다.
export function FeedActionBar({ item, bordered = true, size = 20 }) {
  const { user, savedIds, pendingIds, saveDelta, feedbackDelta, toggleSave, openFeedback } = useFeedActions()
  const tripId = targetTripId(item)
  // 백엔드는 본인 계획 저장을 막는다(TRIP_011). 작성자 id가 내려올 때만 미리 잠그고, 없으면 서버 판단에 맡긴다 —
  // 이름 비교는 같은 이름의 다른 계정(카카오/구글로 따로 가입한 같은 사람 등)까지 막아버린다.
  const isMine = !!(user && item?.user?.id && item.user.id === user.userId)
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
        className={`group/act flex items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-rose-500 ${
          feedbackCount ? 'text-rose-500' : 'text-slate-400'
        }`}
      >
        <Icon icon="mdi:comment-outline" width={size} className="transition-transform group-hover/act:-rotate-6" />
        {feedbackCount != null && <span className="text-[12px] font-bold tabular-nums">{feedbackCount}</span>}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (item && !isMine) toggleSave(item) }}
        disabled={pending || isMine}
        aria-pressed={saved}
        aria-label={isMine ? '내 계획은 스크랩할 수 없어요' : saved ? '스크랩 해제' : '스크랩'}
        title={isMine ? '내 계획은 스크랩할 수 없어요' : undefined}
        className={`group/act flex items-center gap-1.5 rounded-full py-1 pl-2 transition-colors ${
          isMine ? 'cursor-not-allowed text-slate-300' : pending ? 'cursor-wait' : saved ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
        }`}
      >
        {saveCount != null && <span className="text-[12px] font-bold tabular-nums">{saveCount}</span>}
        {pending ? (
          <Icon icon="mdi:loading" width={size} className="animate-spin text-amber-500" />
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
