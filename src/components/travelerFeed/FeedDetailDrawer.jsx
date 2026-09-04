import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'
import { FeedUserHeader, FeedActionBar } from './FeedCardChrome'
import { MOCK_FEED_ITEMS } from '../../data/feed'
import { adaptPlanDetail } from '../../data/feedAdapter'
import { getFeedDetail } from '../../api/feed'

export default function FeedDetailDrawer({ item, items, onClose, onSavePlan }) {
  const [stack, setStack] = useState([])
  const open = !!item

  useEffect(() => {
    if (item) setStack([item])
  }, [item])

  const current = stack[stack.length - 1]

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
    const loaded = (items || MOCK_FEED_ITEMS).find((i) => i.id === current.planId)
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
        className={`fixed top-16 bottom-0 right-0 z-[56] w-full max-w-[560px] overflow-y-auto bg-white shadow-popup transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {open && current && (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white p-4">
              <button
                onClick={handleBack}
                aria-label="뒤로가기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <Icon icon="mdi:chevron-left" width={20} />
              </button>

              {current.type === 'record' ? (
                <Button onClick={handleViewPlan} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold">
                  <Icon icon="mdi:calendar-blank-outline" width={14} />
                  이 기록의 여행 계획 보기
                </Button>
              ) : (
                <Button
                  onClick={() => onSavePlan(current)}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold"
                >
                  <Icon icon="mdi:content-save-outline" width={14} />
                  이 계획 저장하기
                </Button>
              )}
            </div>

            <div className="pl-[22px] pr-4 pb-6">
              {current.type === 'record' ? <RecordDetail item={current} /> : <PlanDetail item={current} />}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function RecordDetail({ item }) {
  return (
    <>
      <div className="relative h-[320px] w-full overflow-hidden rounded-2xl bg-slate-200">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <div className="mt-4">
        <FeedUserHeader item={item} showChip={false} />
        <div className="mt-3 text-[17px] font-bold text-slate-900">{item.title}</div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{item.comment}</p>
        <FeedActionBar size={22} />
      </div>
    </>
  )
}

function PlanDetail({ item }) {
  return (
    <>
      <FeedUserHeader item={item} showChip={false} />
      <div className="mt-3 text-[17px] font-bold text-slate-900">{item.title}</div>
      <div className="mt-1 text-[12px] text-slate-400">{item.duration} · {item.placeCount}개의 장소</div>

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
                        {stop.title} <span className="ml-1 text-[10px] font-normal text-slate-400">{stop.address}</span>
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

      <FeedActionBar size={22} />
    </>
  )
}
