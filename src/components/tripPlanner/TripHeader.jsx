import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Chip from '../ui/Chip'
import DatePill from './DatePill'
import { formatNights } from '../../lib/tripTime'

// 리스트/지도 전환 토글 — 선택된 쪽만 흰 배경(rounded-lg + shadow)이 붙는 세그먼트 방식
const VIEWS = [
  { value: 'list', icon: 'mdi:format-list-bulleted', label: '리스트' },
  { value: 'map', icon: 'mdi:map-outline', label: '지도' },
]

// 상단 바 — 제목(드롭다운으로 계획 전환/새로 만들기), n박n일, 기간, 리스트/지도 토글, 게시 버튼.
// 여행자 피드의 FeedFilterBar(구분선, 토글, 버튼 스타일)를 그대로 참고해 통일했다.
export default function TripHeader({
  trip,
  trips,
  view,
  onChangeView,
  onSelectTrip,
  onCreateNew,
  onUpdateTitle,
  onUpdateDates,
  onTogglePublish,
  onDeleteTrip,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(trip.title)
  const [titleHover, setTitleHover] = useState(false)
  const [titleOverflow, setTitleOverflow] = useState(0)
  const [marqueeDuration, setMarqueeDuration] = useState(4)
  const [showPublishHint, setShowPublishHint] = useState(() => !trip.published)
  const [publishHintVisible, setPublishHintVisible] = useState(false)
  const menuRef = useRef(null)
  const titleRef = useRef(null)
  const toggleTrackRef = useRef(null)
  const toggleBtnRefs = useRef({})
  const [indicator, setIndicator] = useState(null)

  // 제목이 max-width를 넘으면 얼마나 넘치는지 측정 — 넘치는 만큼만 우측에 페이드 처리하고,
  // 호버 시 무한 루프 마퀴 속도를 텍스트 폭에 비례해서 정한다(길이와 무관하게 일정한 체감 속도)
  const MARQUEE_SPEED_PX_PER_SEC = 55 * 0.75
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el || editingTitle) return

    function measure() {
      setTitleOverflow(Math.max(0, el.scrollWidth - el.clientWidth))
      setMarqueeDuration(Math.max(3, el.scrollWidth / MARQUEE_SPEED_PX_PER_SEC))
    }

    measure()
    document.fonts?.ready.then(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [trip.title, editingTitle])

  // FeedFilterBar와 동일하게, 선택된 세그먼트 뒤로 흰 배경이 슬라이드 — 텍스트가 있어 폭이 다르므로 실측해서 이동시킨다.
  // 첫 로드 시점엔 커스텀 웹폰트(SUITE)가 아직 안 불려와 텍스트 폭이 좁게 측정될 수 있어, 폰트 로드 완료와 크기 변화도 함께 감지해 재측정한다.
  useLayoutEffect(() => {
    const track = toggleTrackRef.current
    const btn = toggleBtnRefs.current[view]
    if (!track || !btn) return

    function measure() {
      const trackRect = track.getBoundingClientRect()
      const btnRect = btn.getBoundingClientRect()
      setIndicator({
        left: btnRect.left - trackRect.left,
        top: btnRect.top - trackRect.top,
        width: btnRect.width,
        height: btnRect.height,
      })
    }

    measure()
    document.fonts?.ready.then(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(btn)
    return () => ro.disconnect()
  }, [view])

  // 기본값(나만 보기)일 때 처음 진입 시 한 번, 4초짜리 클릭 유도 안내를 띄운다.
  // 처음 생길 때도 즉시 opacity-100으로 마운트되면 트랜지션이 없어 안 보이므로, 다음 프레임에 켜서 페이드 인시키고
  // 사라질 때도 즉시 unmount가 아니라 페이드 아웃 후 제거한다.
  useEffect(() => {
    const showFrame = requestAnimationFrame(() => setPublishHintVisible(true))
    const hideTimer = setTimeout(() => setPublishHintVisible(false), 4000)
    return () => {
      cancelAnimationFrame(showFrame)
      clearTimeout(hideTimer)
    }
  }, [])

  useEffect(() => {
    if (publishHintVisible) return
    const timer = setTimeout(() => setShowPublishHint(false), 300)
    return () => clearTimeout(timer)
  }, [publishHintVisible])

  function dismissPublishHint() {
    setPublishHintVisible(false)
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function commitTitle() {
    setEditingTitle(false)
    const next = titleDraft.trim()
    if (next && next !== trip.title) onUpdateTitle(next)
    else setTitleDraft(trip.title)
  }

  function handleDateChange(nextStart, nextEnd) {
    const hasItems = trip.days.some((d) => d.items.length > 0)
    if (hasItems && !window.confirm('기간을 바꾸면 지금까지 배치한 일정이 모두 초기화돼요. 계속할까요?')) return
    onUpdateDates(nextStart, nextEnd)
  }

  // 지금 보고 있는 계획을 맨 위로, 나머지는 trips가 원래 내려온 순서(만든 순) 그대로 둔다.
  const orderedTrips = [trip, ...trips.filter((t) => t.id !== trip.id)]

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[1.5px_1.5px_5px_rgba(15,23,42,0.28)] hover:shadow-[1.5px_1.5px_7px_rgba(15,23,42,0.34)]"
            aria-label="계획 전환"
            aria-expanded={menuOpen}
          >
            <Icon icon="solar:alt-arrow-down-linear" width={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-popup">
              {orderedTrips.map((t) => (
                <div
                  key={t.id}
                  className={`group flex w-full items-center gap-1 pr-1.5 text-[13px] transition-colors ${
                    t.id === trip.id ? 'bg-brand-light font-bold text-brand' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectTrip(t.id)
                      setMenuOpen(false)
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pl-3.5 text-left"
                  >
                    <span className="truncate">{t.title}</span>
                    {t.id === trip.id && <Icon icon="solar:check-bold" width={14} className="shrink-0" />}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`'${t.title}' 계획을 삭제할까요? 되돌릴 수 없어요.`)) onDeleteTrip(t.id)
                    }}
                    aria-label={`${t.title} 삭제`}
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-40 transition-all hover:bg-rose-50 hover:text-rose-500 hover:opacity-100 group-hover:opacity-100"
                  >
                    <Icon icon="solar:trash-bin-minimalistic-linear" width={14} />
                  </button>
                </div>
              ))}
              <div className="mt-1 border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    onCreateNew()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-brand hover:bg-brand-light/60"
                >
                  <Icon icon="solar:add-circle-linear" width={16} />새 계획 추가
                </button>
              </div>
            </div>
          )}
        </div>

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-w-0 max-w-[360px] flex-1 rounded-lg border border-brand/40 px-2 py-1 text-[19px] font-extrabold text-slate-800 outline-none"
          />
        ) : (
          <div
            className="relative min-w-0 max-w-[265px] shrink"
            onMouseEnter={() => setTitleHover(true)}
            onMouseLeave={() => setTitleHover(false)}
          >
            {/* 기본 상태 — 잘린 텍스트. 호버 중엔 마퀴 레이어에 자리를 내주고 자신은 숨는다(마우스를 떼면 애니메이션 없이 바로 이 자리로 복귀) */}
            <button
              ref={titleRef}
              onClick={() => {
                setTitleDraft(trip.title)
                setEditingTitle(true)
              }}
              className={`block w-full overflow-hidden whitespace-nowrap text-left text-[19px] font-extrabold text-slate-800 hover:text-brand ${
                titleHover && titleOverflow > 0 ? 'invisible' : ''
              }`}
            >
              {trip.title}
            </button>
            {!titleHover && titleOverflow > 0 && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-white from-40% to-white/0 pl-4">
                <span className="text-[19px] font-extrabold text-slate-400">...</span>
              </div>
            )}

            {/* 호버 중 — 텍스트를 이어붙여 무한 루프로 흘려보내는 마퀴 */}
            {titleHover && titleOverflow > 0 && (
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="flex w-max animate-marquee whitespace-nowrap text-[19px] font-extrabold text-brand"
                  style={{ animationDuration: `${marqueeDuration}s` }}
                >
                  <span className="pr-5">{trip.title}</span>
                  <span className="pr-5" aria-hidden="true">
                    {trip.title}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        <Chip className="shrink-0 bg-brand-light px-2.5 py-1 text-[11px] font-bold text-brand">
          {formatNights(trip.startDate, trip.endDate)}
        </Chip>
        <div className="relative">
          <button
            type="button"
            onClick={onTogglePublish}
            title={trip.published ? '눌러서 나만 보기로 전환' : '눌러서 전체공개로 전환'}
            style={{ display: 'grid' }}
            className={`shrink-0 overflow-hidden rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-150 ${
              trip.published ? 'bg-brand-light text-brand' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {/* 두 라벨을 같은 grid 셀에 겹쳐서 버튼 폭은 둘 중 넓은 쪽에 고정, 위아래로 슬라이드+페이드하며 전환 */}
            <span
              className={`col-start-1 row-start-1 flex items-center justify-center transition-all duration-150 ease-out ${
                trip.published ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
              }`}
            >
              전체공개
            </span>
            <span
              className={`col-start-1 row-start-1 flex items-center justify-center transition-all duration-150 ease-out ${
                trip.published ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
              }`}
            >
              나만 보기
            </span>
          </button>

          {showPublishHint && (
            <div
              className={`absolute left-0 top-full z-30 mt-2 flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-2 text-[11.5px] font-semibold text-white shadow-popup transition-opacity duration-300 ${
                publishHintVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span aria-hidden="true" className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-slate-900/90" />
              눌러서 전체공개로 바꿔보세요
              <button
                type="button"
                onClick={dismissPublishHint}
                aria-label="안내 닫기"
                className="text-white/70 hover:text-white"
              >
                <Icon icon="mdi:close" width={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <DatePill label="출발일" value={trip.startDate} max={trip.endDate} onChange={(v) => handleDateChange(v, trip.endDate)} />
          <DatePill label="종료일" value={trip.endDate} min={trip.startDate} onChange={(v) => handleDateChange(trip.startDate, v)} />
        </div>

        <div ref={toggleTrackRef} className="relative flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-[12.5px] font-bold">
          {indicator && (
            <div
              aria-hidden="true"
              className="absolute rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-all duration-200 ease-out"
              style={{ left: indicator.left, top: indicator.top, width: indicator.width, height: indicator.height }}
            />
          )}
          {VIEWS.map((v) => {
            const active = view === v.value
            return (
              <button
                key={v.value}
                ref={(el) => {
                  toggleBtnRefs.current[v.value] = el
                }}
                type="button"
                onClick={() => onChangeView(v.value)}
                aria-pressed={active}
                className={`relative z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  active ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon icon={v.icon} width={15} />
                {v.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
