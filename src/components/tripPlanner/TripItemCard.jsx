import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { PetFriendlyMark } from '../ui/PetFriendly'
import TimeEditPopup from './TimeEditPopup'
import { TRIP_ITEM_DRAG_TYPE } from '../../lib/dragTypes'

// Day 안에 배치된 관광지 카드. 핸들 아이콘 자체만 draggable이라 순서변경/이동 드래그가 거기서만 시작되고,
// 카드의 나머지 영역(시간 클릭, 메모 더블클릭, 삭제)은 드래그와 무관하게 그대로 동작한다.
// readOnly=true면 지도 탭의 호버 상세카드처럼 보여주기만 하고 편집 UI(핸들/시간팝업/메모편집/삭제)는 다 숨긴다.
export default function TripItemCard({ item, dayId, onSaveTime, onSaveMemo, onDelete, readOnly = false, deleteLocked = false }) {
  const [timePopupOpen, setTimePopupOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState(false)
  const [memoDraft, setMemoDraft] = useState(item.memo)
  const memoInputRef = useRef(null)
  const memoRef = useRef(null)
  const cardRef = useRef(null)
  const [memoOverflow, setMemoOverflow] = useState(false)
  const [memoHover, setMemoHover] = useState(false)

  useEffect(() => {
    const el = memoRef.current
    if (!el) return
    setMemoOverflow(el.scrollHeight > el.clientHeight + 1)
  }, [item.memo])

  // 핸들(작은 아이콘)만 draggable이라 기본 드래그 고스트도 핸들만 나온다 — 카드 전체를 잡고 있는 것처럼
  // 보이도록 실제 카드 DOM을 고스트 이미지로 지정하고, 커서가 카드 안에서 잡은 지점을 그대로 유지한다.
  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(TRIP_ITEM_DRAG_TYPE, JSON.stringify({ itemId: item.id, fromDayId: dayId }))
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      e.dataTransfer.setDragImage(cardRef.current, e.clientX - rect.left, e.clientY - rect.top)
    }
  }

  function startMemoEdit() {
    setMemoDraft(item.memo)
    setEditingMemo(true)
    requestAnimationFrame(() => memoInputRef.current?.focus())
  }

  function commitMemo() {
    setEditingMemo(false)
    if (memoDraft !== item.memo) onSaveMemo(memoDraft)
  }

  return (
    <div
      ref={cardRef}
      data-item-card
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : handleDragStart}
      className={`relative flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-surface p-3.5 shadow-card ${
        readOnly ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {!readOnly && (
        // 핸들 아이콘은 그대로 두되 누를 수 있는 영역(h-9 w-9)은 훨씬 넓게 잡는다 — 실제 드래그는
        // 이제 카드 전체(위 div)에서 시작되므로, 이 span은 "여기를 잡으면 된다"는 시각적 표시일 뿐이다.
        <span
          className="-ml-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-slate-300"
          aria-hidden="true"
        >
          <Icon icon="mdi:drag" width={18} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[13.5px] font-bold text-slate-900">
          <span className="truncate">{item.cachedTitle}</span>
          <PetFriendlyMark value={item.petFriendly} />
        </p>

        <div className="relative mt-1 inline-block">
          {readOnly ? (
            <span className="text-[12px] font-semibold text-slate-500">
              {item.startTime}~{item.endTime}
            </span>
          ) : (
            <button
              type="button"
              draggable={false}
              onClick={() => setTimePopupOpen((v) => !v)}
              className="rounded-md text-[12px] font-semibold text-slate-500 hover:text-brand"
            >
              {item.startTime}~{item.endTime}
            </button>
          )}
          {!readOnly && timePopupOpen && (
            <TimeEditPopup
              startTime={item.startTime}
              endTime={item.endTime}
              onClose={() => setTimePopupOpen(false)}
              onSave={(time) => {
                onSaveTime(time)
                setTimePopupOpen(false)
              }}
            />
          )}
        </div>

        {editingMemo ? (
          <div className="mt-1 flex items-center gap-1.5">
            <input
              ref={memoInputRef}
              value={memoDraft}
              onChange={(e) => setMemoDraft(e.target.value)}
              onBlur={commitMemo}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingMemo(false)
              }}
              className="w-full rounded-md border border-brand/40 px-1.5 py-0.5 text-[12px] text-slate-600 outline-none"
            />
          </div>
        ) : (
          (item.memo || !readOnly) && (
            <div
              className="relative mt-1"
              onMouseEnter={() => memoOverflow && setMemoHover(true)}
              onMouseLeave={() => setMemoHover(false)}
            >
              <p
                ref={memoRef}
                draggable={false}
                onDoubleClick={readOnly ? undefined : startMemoEdit}
                className={`line-clamp-2 text-[12px] text-slate-400 ${readOnly ? '' : 'cursor-text'}`}
              >
                {item.memo || '더블클릭해서 메모 남기기'}
              </p>
              {/* 2줄을 넘는 메모만 호버 시 전체를 보여준다 — 가로폭은 원래 메모 영역을 넘기지 않고(inset-x-0)
                  세로로만 늘어나며, 마우스를 떼면 다시 페이드아웃된다. */}
              {memoOverflow && (
                <div
                  className={`absolute inset-x-0 top-0 z-20 rounded-lg border border-slate-100 bg-surface p-2 text-[12px] leading-relaxed text-slate-600 shadow-popup transition-opacity duration-150 ${
                    memoHover ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  {item.memo}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {!readOnly && (
        <button
          draggable={false}
          onClick={onDelete}
          aria-label={deleteLocked ? `${item.cachedTitle} — 공개 중인 계획의 마지막 일정이라 지울 수 없어요` : `${item.cachedTitle} 삭제`}
          title={deleteLocked ? '공개 중인 계획은 각 일차에 일정이 하나 이상 남아야 해요' : undefined}
          className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface shadow-card transition-colors ${
            deleteLocked ? 'cursor-not-allowed text-slate-300' : 'text-rose-300 hover:text-rose-500'
          }`}
        >
          <Icon icon={deleteLocked ? 'solar:lock-keyhole-minimalistic-bold' : 'solar:close-circle-bold'} width={deleteLocked ? 12 : 16} />
        </button>
      )}
    </div>
  )
}
