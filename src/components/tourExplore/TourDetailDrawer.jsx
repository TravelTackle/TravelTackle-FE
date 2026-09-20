import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'
import CardImage from '../ui/CardImage'
import RelatedSpots from './RelatedSpots'
import { getTourContentDetail } from '../../api/tour'

const stripTags = (html) => (html ? html.replace(/<[^>]*>/g, '') : '')

export default function TourDetailDrawer({ contentId, onClose, onToggleCart, carted, onSelectContent, onBack }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)
  const open = !!contentId
  const panelRef = useRef(null)

  useEffect(() => {
    if (!contentId) return
    let ignore = false
    setDetail(null)
    setLoading(true)
    panelRef.current?.scrollTo({ top: 0 }) // 연관 관광지로 넘어가면 맨 위부터 보여준다
    getTourContentDetail(contentId)
      .then((data) => { if (!ignore) setDetail(data) })
      .catch(() => {})
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [contentId])

  // 이미 담긴 상태에서 다시 누르면 onToggleCart가 담기 대신 빼기로 처리한다
  async function handleToggle() {
    if (cartLoading) return
    setCartLoading(true)
    await onToggleCart(contentId)
    setCartLoading(false)
  }

  return (
    <>
      {/* 클릭 시 닫히는 투명 백드롭 — 배경은 어둡게 처리하지 않음 */}
      {open && <button aria-label="상세 패널 닫기" onClick={onClose} className="fixed inset-0 z-[55] cursor-default" />}

      <div
        ref={panelRef}
        className={`fixed top-16 bottom-0 right-0 z-[56] w-full max-w-[420px] overflow-y-auto bg-surface shadow-popup transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {open && (
          <>
            <div className="flex items-center justify-between p-4">
              <button
                onClick={onBack ?? onClose}
                aria-label="뒤로가기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <Icon icon="solar:alt-arrow-left-linear" width={18} />
              </button>
              <Button
                onClick={handleToggle}
                disabled={cartLoading}
                variant={carted ? 'light' : 'solid'}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold disabled:opacity-60"
              >
                <Icon icon={carted ? 'solar:check-circle-bold' : 'solar:cart-large-2-bold'} width={14} />
                {carted ? '담음 · 빼기' : '카트에 담기'}
              </Button>
            </div>

            {loading || !detail ? (
              <div className="animate-pulse space-y-4 p-4">
                <div className="h-[240px] w-full rounded-2xl bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
            ) : (
              <>
                <div className="px-4">
                  <CardImage src={detail.imageUrl} alt={detail.title} className="h-[240px] w-full overflow-hidden rounded-2xl" />
                </div>

                <div className="p-4">
                  <h2 className="text-[17px] font-bold text-slate-900">{detail.title}</h2>
                  {detail.address && <p className="mt-1 text-[12px] text-slate-400">{detail.address}</p>}
                  {detail.overview && (
                    <p className="mt-4 text-[13px] leading-relaxed text-slate-600">{stripTags(detail.overview)}</p>
                  )}
                  {detail.telephone && <p className="mt-3 text-[12px] text-slate-500">전화 {detail.telephone}</p>}

                  {detail.images?.length > 0 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {detail.images.slice(0, 6).map((img, i) => (
                        <img
                          key={i}
                          src={img.thumbnailUrl || img.originalUrl}
                          alt={img.name || detail.title}
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {onSelectContent && <RelatedSpots detail={detail} onSelect={onSelectContent} />}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
