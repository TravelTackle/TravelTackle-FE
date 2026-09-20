import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'
import CardImage from '../ui/CardImage'
import RelatedSpots from './RelatedSpots'
import { getTourContentDetail } from '../../api/tour'

const stripTags = (html) => (html ? html.replace(/<[^>]*>/g, '') : '')

// 반려동물 동반 안내 — 백엔드 petInfo(한국관광공사 반려동물 동반여행 데이터)를 그대로 보여준다.
// 등록되지 않은 장소는 petInfo 자체가 null이고, 값이 없는 항목도 null이라 있는 것만 줄지어 그린다.
const PET_ROWS = [
  { key: 'companionType', label: '동반 구역' },
  { key: 'allowedAnimals', label: '동반 가능 동물' },
  { key: 'requirements', label: '준비물·조건' },
  { key: 'facilities', label: '시설' },
  { key: 'providedItems', label: '제공 물품' },
  { key: 'rentalItems', label: '대여 물품' },
  { key: 'purchasableItems', label: '구매 가능' },
  { key: 'safetyNotes', label: '안전 안내' },
  { key: 'notes', label: '참고' },
]

function PetInfoBlock({ petInfo }) {
  const rows = PET_ROWS.filter((r) => petInfo?.[r.key]?.trim())
  if (rows.length === 0) return null
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-surface p-3.5 shadow-card">
      <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-700">
        <Icon icon="mdi:paw" width={15} />
        애견 동반 안내
      </h3>
      <dl className="mt-2.5 flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.key} className="flex gap-2.5">
            <dt className="w-[72px] shrink-0 text-[11.5px] font-bold text-slate-400">{r.label}</dt>
            {/* 줄바꿈이 들어오는 항목(notes)이 있어 whitespace-pre-line으로 그대로 살린다 */}
            <dd className="min-w-0 flex-1 whitespace-pre-line text-[12.5px] leading-relaxed text-slate-600">{petInfo[r.key].trim()}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-[10.5px] text-slate-400">한국관광공사 반려동물 동반여행 정보 · 방문 전 현장 확인을 권해요</p>
    </section>
  )
}

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

                  <PetInfoBlock petInfo={detail.petInfo} />

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
