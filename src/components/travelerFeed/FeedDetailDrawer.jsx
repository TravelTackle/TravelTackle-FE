import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'
import { FeedUserHeader, FeedActionBar } from './FeedCardChrome'
import PetFriendlyBadge, { PetFriendlyMark } from '../ui/PetFriendly'
import PhotoCarousel from './PhotoCarousel'
import { adaptPlanDetail, adaptRecordDetail } from '../../data/feedAdapter'
import { getFeedDetail } from '../../api/feed'
import { deleteTrip } from '../../api/trip'
import { deleteTripRecord } from '../../api/record'
import { targetTripId, useFeedActions } from './FeedActionsContext'

// 나의 여행 계획을 이어서 편집할 때 쓰는 값 — TripPlannerPage(LAST_TRIP_ID_KEY)와 같은 키를 써야
// "지난번 보던 계획"으로 그 계획이 바로 뜬다.
const LAST_TRIP_ID_KEY = 'tripPlanner:lastActiveTripId'

// 카드 우측 위 점 세개 메뉴 — 지금은 "삭제하기" 하나뿐이라 단순한 팝오버로 둔다
function CardMenu({ onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="더보기"
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-50"
      >
        <Icon icon="mdi:dots-vertical" width={18} />
      </button>
      {open && (
        <div className="nav-pop absolute right-0 top-full z-30 mt-1.5 w-32 overflow-hidden rounded-xl border border-slate-100 bg-surface py-1 shadow-popup">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[12.5px] font-semibold text-rose-500 transition-colors hover:bg-rose-50"
          >
            <Icon icon="mdi:trash-can-outline" width={14} />
            삭제하기
          </button>
        </div>
      )}
    </div>
  )
}

// MyPageSettings의 ConfirmDialog와 같은 오버레이+흰 카드+버튼 2개 패턴 그대로
function DeleteConfirmDialog({ title, description, deleting, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[320px] rounded-2xl bg-surface p-5 shadow-popup">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{description}</p>
        {error && <p className="mt-2 text-[12px] text-rose-500">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-full border border-slate-200 py-2 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-full bg-rose-500 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? '삭제 중…' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// fromSaved: 보관함에서 열렸는지 — 계획이면서 기록도 있는 트립일 때만, 상단 버튼을
// "이 계획 스크랩" 대신 "이 여행의 기록 보기"로 바꿔서 보여준다(기록이 없으면 버튼 자체를 숨김).
// 피드에서 연 계획은 그대로 스크랩 버튼을 쓴다.
// onDeleted: 내 계획/기록을 삭제하는 데 성공했을 때 호출 — 부모 목록에서 지우는 건 호출부 책임.
export default function FeedDetailDrawer({ item, items, onClose, onSavePlan, fromSaved = false, onDeleted }) {
  const [stack, setStack] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const open = !!item
  const navigate = useNavigate()
  const { savedIds, pendingIds, user } = useFeedActions()

  useEffect(() => {
    if (item) setStack([item])
  }, [item])

  const current = stack[stack.length - 1]
  // 내 글 편집·삭제 메뉴 노출용. 작성자 id가 내려오면 id로, 아직 없으면 이름으로 가려낸다(서버가 최종 검증하므로 오인해도 403).
  const isMine = !!(
    user &&
    (current?.user?.id ? current.user.id === user.userId : current?.user?.nickname && current.user.nickname === user.name)
  )

  function handleEdit() {
    localStorage.setItem(LAST_TRIP_ID_KEY, current.id)
    navigate('/trips')
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      if (deleteTarget.type === 'record') {
        await deleteTripRecord(targetTripId(deleteTarget))
      } else {
        await deleteTrip(deleteTarget.id)
      }
      onDeleted?.(deleteTarget)
      setDeleteTarget(null)
      onClose()
    } catch {
      setDeleteError('삭제하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setDeleting(false)
    }
  }

  // "이 여행의 기록 보기" — 이미 있는 계획 상세 조회(getFeedDetail)가 record도 함께 내려주므로
  // 새 엔드포인트 없이 그대로 재사용한다. 그 사이 기록이 지워졌으면 조용히 무시.
  async function handleViewRecord() {
    try {
      const detail = await getFeedDetail(current.id)
      const recordItem = adaptRecordDetail(detail)
      if (recordItem) setStack((s) => [...s, recordItem])
    } catch {
      // 조회 실패 시 그냥 현재 화면 유지
    }
  }

  function handleBack() {
    if (stack.length > 1) setStack((s) => s.slice(0, -1))
    else onClose()
  }

  // Esc로도 뒤로가기/닫기 — 뒤로가기 버튼과 동일한 동작(스택이 있으면 pop, 없으면 닫기)
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') handleBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stack])

  async function handleViewPlan() {
    const loaded = (items || []).find((i) => i.id === current.planId)
    if (loaded) {
      setStack((s) => [...s, loaded])
      return
    }
    // 현재 로드된 목록에 없는 경우(다른 페이지 등)의 폴백 — 실 데이터만 해당, planId가 UUID인 경우
    try {
      const detail = await getFeedDetail(current.planId)
      setStack((s) => [...s, adaptPlanDetail(detail)])
    } catch {
      // 조회 실패 시 그냥 현재 화면 유지
    }
  }

  return (
    <>
      {/* 클릭 시 닫히는 투명 백드롭 — TourDetailDrawer와 동일 패턴 */}
      {open && <button aria-label="상세 패널 닫기" onClick={onClose} className="fixed inset-0 z-[55] cursor-default" />}

      <div
        className={`fixed top-16 bottom-0 right-0 z-[56] w-full max-w-[560px] overflow-y-auto bg-surface shadow-popup transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {open && current && (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface p-4">
              <button
                onClick={handleBack}
                aria-label="뒤로가기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <Icon icon="mdi:chevron-left" width={20} />
              </button>

              {current.type === 'record' ? (
                <div className="flex items-center gap-1">
                  <Button onClick={handleViewPlan} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold">
                    <Icon icon="mdi:calendar-blank-outline" width={14} />
                    이 기록의 여행 계획 보기
                  </Button>
                  {/* 내 기록일 때만 삭제 메뉴 — 남의 기록엔 애초에 권한이 없다 */}
                  {isMine && <CardMenu onDelete={() => setDeleteTarget(current)} />}
                </div>
              ) : isMine ? (
                // 내 계획은 스크랩 버튼 대신 편집하기 + 점 세개(삭제) 메뉴
                <div className="flex items-center gap-1">
                  <Button variant="light" onClick={handleEdit} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold">
                    <Icon icon="mdi:pencil-outline" width={14} />
                    편집하기
                  </Button>
                  <CardMenu onDelete={() => setDeleteTarget(current)} />
                </div>
              ) : fromSaved ? (
                // 보관함에서 연 계획 상세는 스크랩 버튼 대신 기록 보기로 바뀐다 —
                // 기록이 아예 없으면(볼 게 없으니) 버튼 자체를 숨긴다.
                current.hasRecord && (
                  <Button onClick={handleViewRecord} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold">
                    <Icon icon="mdi:image-multiple-outline" width={14} />
                    이 여행의 기록 보기
                  </Button>
                )
              ) : (
                <Button
                  onClick={() => onSavePlan(current)}
                  disabled={pendingIds.has(targetTripId(current))}
                  variant={savedIds.has(targetTripId(current)) ? 'light' : 'solid'}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold disabled:cursor-wait disabled:opacity-70 ${
                    savedIds.has(targetTripId(current)) ? '!bg-amber-50 !text-amber-600 hover:!bg-amber-100' : ''
                  }`}
                >
                  {pendingIds.has(targetTripId(current)) ? (
                    <Icon icon="mdi:loading" width={14} className="animate-spin" />
                  ) : (
                    <Icon icon={savedIds.has(targetTripId(current)) ? 'solar:bookmark-bold' : 'mdi:bookmark-outline'} width={14} />
                  )}
                  {savedIds.has(targetTripId(current)) ? '스크랩됨' : '이 계획 스크랩'}
                </Button>
              )}
            </div>

            <div className="pl-[22px] pr-4 pb-6">
              {current.type === 'record' ? <RecordDetail item={current} /> : <PlanDetail item={current} />}
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmDialog
          title={deleteTarget.type === 'record' ? '이 기록을 삭제하시겠어요?' : '이 계획을 삭제하시겠어요?'}
          description={
            deleteTarget.type === 'record'
              ? '삭제하면 사진과 글이 모두 사라지고 되돌릴 수 없어요.'
              : '삭제하면 이 계획의 일정과 기록이 모두 사라지고 되돌릴 수 없어요.'
          }
          deleting={deleting}
          error={deleteError}
          onCancel={() => {
            setDeleteTarget(null)
            setDeleteError('')
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}

function RecordDetail({ item }) {
  return (
    <>
      <PhotoCarousel
        photos={item.photos ?? (item.imageUrl ? [item.imageUrl] : [])}
        alt={item.title}
        className="h-[320px] w-full rounded-2xl"
      />
      <div className="mt-4">
        <FeedUserHeader item={item} showChip={false} />
        <div className="mt-3 text-[17px] font-bold text-slate-900">{item.title}</div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{item.comment}</p>
        <FeedActionBar item={item} size={22} />
      </div>
    </>
  )
}

function PlanDetail({ item }) {
  return (
    <>
      <FeedUserHeader item={item} showChip={false} />
      <div className="mt-3 text-[17px] font-bold text-slate-900">{item.title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
        <span>{item.duration} · {item.placeCount}개의 장소</span>
        <PetFriendlyBadge summary={item.petFriendly} />
      </div>

      <div className="mt-5 flex flex-col gap-6">
        {item.days.map((day) => (
          <div key={day.day}>
            <div className="mb-3 text-[13px] font-bold text-brand-dark">Day {day.day}</div>
            {/* gap을 두지 않고 각 행 내부 pb/mb로만 간격을 줘서, 마커 사이의 세로선이 행과 행 사이에서
                끊기지 않고 이어지도록 함 */}
            <div className="flex flex-col">
              {day.stops.map((stop, i) => {
                const isLast = i === day.stops.length - 1
                return (
                  <div key={i} className="flex gap-3">
                    <div className="relative mb-4 h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                      {stop.imageUrl && (
                        <img src={stop.imageUrl} alt={stop.title} className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-white ${stop.iconBg || 'bg-brand'}`}
                      >
                        <Icon icon={stop.icon || 'mdi:map'} width={8} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <div className="text-[11px] font-semibold text-brand">{stop.time}</div>
                      <div className="mt-0.5 text-[13px] font-extrabold text-slate-900">
                        {stop.title}
                        <PetFriendlyMark value={stop.petFriendly} className="ml-1 inline-block align-[-1px]" />
                        <span className="ml-1 text-[10px] font-normal text-slate-400">{stop.address}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{stop.memo}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <FeedActionBar item={item} size={22} />
    </>
  )
}
