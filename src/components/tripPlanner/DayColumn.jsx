import { Fragment, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import TripItemCard from './TripItemCard'
import { CART_ITEM_DRAG_TYPE } from '../../api/cart'
import { TRIP_ITEM_DRAG_TYPE } from '../../lib/dragTypes'
import { tripItemColor, tripItemIcon } from '../../lib/cartThemes'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return { md: `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`, wd: WEEKDAYS[d.getDay()] }
}

function getDropIndex(container, clientY) {
  const cards = Array.from(container.querySelectorAll('[data-item-card]'))
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return i
  }
  return cards.length
}

// 드래그 중 놓을 위치를 하늘색 가로선으로 미리 알려준다 — 연결선 열 폭(w-4 + gap-1.5)만큼 왼쪽을 비워서
// 카드 열과 가로폭이 정확히 맞도록 한다.
function DropIndicator() {
  return (
    <div className="flex gap-1.5 py-0.5">
      <div className="w-4 shrink-0" />
      <div className="h-[3px] flex-1 rounded-full bg-sky-400" />
    </div>
  )
}

// 계획 편집 화면의 Day 하나 — 헤더(선택 시 파란 하이라이트) + 시간순 항목 리스트 + 드롭존.
// 드롭존은 장바구니 아이템(신규 배치)과 기존 일정 항목(같은 날 순서변경 / 다른 날에서 이동) 둘 다 받는다.
export default function DayColumn({
  day,
  selected,
  onSelect,
  onAddCartItem,
  onReorderItem,
  onMoveItem,
  onSaveTime,
  onSaveMemo,
  onDeleteItem,
  deleteLocked = false, // 공개 중인 계획에서 이 날의 마지막 일정일 때 — 삭제 버튼을 잠근다(TRIP_023)
}) {
  const [dragOver, setDragOver] = useState(false)
  const [dropIndex, setDropIndex] = useState(null)
  const listRef = useRef(null)
  const { md, wd } = formatDay(day.date)

  function isRelevantDrag(e) {
    return e.dataTransfer?.types?.includes(CART_ITEM_DRAG_TYPE) || e.dataTransfer?.types?.includes(TRIP_ITEM_DRAG_TYPE)
  }

  function handleDragOver(e) {
    if (!isRelevantDrag(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(CART_ITEM_DRAG_TYPE) ? 'copy' : 'move'
    setDragOver(true)
    setDropIndex(getDropIndex(listRef.current, e.clientY))
  }

  function handleDragLeave() {
    setDragOver(false)
    setDropIndex(null)
  }

  function handleDrop(e) {
    if (!isRelevantDrag(e)) return
    e.preventDefault()
    setDragOver(false)
    setDropIndex(null)
    const index = getDropIndex(listRef.current, e.clientY)

    const cartRaw = e.dataTransfer.getData(CART_ITEM_DRAG_TYPE)
    if (cartRaw) {
      try {
        onAddCartItem(day.id, JSON.parse(cartRaw), index)
      } catch {
        /* 무시 */
      }
      return
    }

    const tripRaw = e.dataTransfer.getData(TRIP_ITEM_DRAG_TYPE)
    if (tripRaw) {
      try {
        const { itemId, fromDayId } = JSON.parse(tripRaw)
        if (fromDayId === day.id) onReorderItem(day.id, itemId, index)
        else onMoveItem(fromDayId, day.id, itemId, index)
      } catch {
        /* 무시 */
      }
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-w-[260px] flex-1 flex-col rounded-xl p-2 transition-colors ${dragOver ? 'bg-brand-light/30' : ''}`}
    >
      <button
        type="button"
        data-day-drag-handle
        onClick={onSelect}
        className={`cursor-grab select-none rounded-xl px-3 py-2 text-left transition-colors active:cursor-grabbing ${selected ? 'bg-brand-light' : 'hover:bg-slate-50'}`}
      >
        <p className={`text-[11px] font-bold ${selected ? 'text-brand' : 'text-slate-400'}`}>Day {day.dayNumber}</p>
        <p className={`text-[20px] font-extrabold ${selected ? 'text-brand' : 'text-slate-600'}`}>
          {md} <span className="text-[13px] font-bold">{wd}</span>
        </p>
      </button>

      {/* 연결선은 각 행의 "배경"으로 전체 높이를 채운다 — 그래야 다음 행 것과 곧바로 맞닿아서 행 경계에서
          끊겨 보이지 않는다. 원 배지는 그 위에 z-10으로 얹혀서 선을 점처럼 끊어 보이게 하는 것도 의도된 모습. */}
      <div ref={listRef} className="mt-2 flex flex-1 flex-col">
        {day.items.map((item, index) => (
          <Fragment key={item.id}>
            {dropIndex === index && <DropIndicator />}
            <div className="relative flex gap-1.5">
              {/* 첫 번째 항목은 원 위로 선이 튀어나오면 안 되니 원 시작 지점(pt-3.5)부터만 선을 그린다 —
                  두 번째 항목부터는 윗 행에서 내려오는 선과 이어져야 하니 행 맨 위(top-0)부터 그린다. */}
              <div className={`absolute left-0 flex w-4 justify-center ${index === 0 ? 'bottom-0 top-3.5' : 'inset-y-0'}`}>
                <div className="border-l border-slate-200" />
              </div>
              <div className="relative z-10 flex w-4 shrink-0 justify-center pt-3.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white shadow-card ${tripItemColor(item.contentTypeId)}`}
                >
                  <Icon icon={tripItemIcon(item.contentTypeId)} width={9} />
                </span>
              </div>
              <div className="min-w-0 flex-1 pb-2.5">
                <TripItemCard
                  item={item}
                  dayId={day.id}
                  onSaveTime={(time) => onSaveTime(day.id, item.id, time)}
                  onSaveMemo={(memo) => onSaveMemo(day.id, item.id, memo)}
                  onDelete={() => onDeleteItem(day.id, item.id)}
                  deleteLocked={deleteLocked}
                />
              </div>
            </div>
          </Fragment>
        ))}
        {dropIndex === day.items.length && <DropIndicator />}

        <div className="flex gap-1.5">
          <div className="flex w-4 shrink-0 justify-center">
            <div className="border-l border-dotted border-slate-200" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 py-3 text-center">
            <p className="text-[11px] text-slate-400">{day.items.length}개의 장소</p>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
              <Icon icon="solar:widget-add-linear" width={13} />
              드래그하여 장소 추가
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
