import { useState } from 'react'
import { Icon } from '@iconify/react'
import Card from '../ui/Card'
import CardImage from '../ui/CardImage'
import { SPOT_DRAG_TYPE } from '../../api/cart'

export default function TourCard({ spot, carted, onOpen, onToggleCart }) {
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  // 이미 담긴 상태에서 다시 누르면 onToggleCart가 담기 대신 빼기로 처리한다
  async function handleQuickToggle(e) {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    await onToggleCart(spot.contentId)
    setLoading(false)
  }

  return (
    <Card
      as="div"
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData(SPOT_DRAG_TYPE, JSON.stringify({ contentId: spot.contentId, title: spot.title }))
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(spot)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(spot)
      }}
      className={`relative block w-full cursor-pointer overflow-hidden text-left transition-opacity ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="relative">
        <CardImage src={spot.imageUrl} alt={spot.title} className="h-[150px] w-full" />
        <button
          onClick={handleQuickToggle}
          disabled={loading}
          aria-label={carted ? '카트에서 빼기' : '카트에 담기'}
          className={`absolute top-2.5 left-2.5 flex h-8 w-8 items-center justify-center rounded-full shadow-card transition-colors ${
            carted ? 'bg-brand text-white' : 'bg-white/95 text-ink hover:text-ink-brand'
          }`}
        >
          <Icon icon={carted ? 'solar:cart-check-bold' : 'solar:cart-large-2-linear'} width={16} />
        </button>
      </div>
      <div className="p-3">
        <div className="truncate text-[13px] font-bold text-slate-900">{spot.title}</div>
        <div className="mt-0.5 truncate text-[11px] text-slate-400">{spot.address || ' '}</div>
      </div>
    </Card>
  )
}
