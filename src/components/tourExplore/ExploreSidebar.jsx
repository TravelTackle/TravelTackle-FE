import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { THEMES, FALLBACK_AREAS, REGIONS_VISIBLE_COUNT, sortAreasByPopularity } from '../../data/tourSpots'
import { getTourAreas } from '../../api/tour'

// 선택된 지역/테마 행에 쓰는 하늘색 — Navbar 아바타 배경(#BFD8FA)과 동일한 값 재사용
const SELECTED_ROW = 'bg-[#BFD8FA] text-brand-dark font-bold'
const IDLE_ROW = 'text-slate-600 hover:bg-slate-50'

function SigunguPicker({ region, sigungu, onSelectSigungu }) {
  const [sigungus, setSigungus] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setOpen(false)
    getTourAreas(region.code)
      .then((list) => { if (!ignore) setSigungus(Array.isArray(list) ? list : []) })
      .catch(() => { if (!ignore) setSigungus([]) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [region.code])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e) {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    // 여는 클릭 자체가 유발하는 스크롤 보정과 겹치지 않도록, 다음 프레임부터 스크롤 감지 시작
    // 패널 내부 스크롤(목록이 길 때)은 닫지 않고, 그 밖(사이드바/페이지) 스크롤일 때만 닫음
    function onScroll(e) {
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    const raf = requestAnimationFrame(() => {
      window.addEventListener('scroll', onScroll, true)
    })
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      window.removeEventListener('scroll', onScroll, true)
      cancelAnimationFrame(raf)
    }
  }, [open])

  const PANEL_MAX_HEIGHT = 256 // max-h-64

  function toggleOpen() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < PANEL_MAX_HEIGHT && rect.top > spaceBelow
      setPos(
        openUpward
          ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width }
          : { top: rect.bottom + 4, left: rect.left, width: rect.width }
      )
    }
    setOpen((v) => !v)
  }

  function pick(s) {
    onSelectSigungu(s)
    setOpen(false)
  }

  if (loading || sigungus.length === 0) return null

  return (
    <div className="relative mt-1">
      <button
        ref={triggerRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 hover:border-brand/40 transition-colors"
      >
        <span className="truncate">{sigungu?.name || `${region.name} 전체`}</span>
        <Icon icon="solar:alt-arrow-down-linear" width={11} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', ...pos, maxHeight: PANEL_MAX_HEIGHT }}
          className="z-50 overflow-y-auto rounded-2xl border border-slate-100 bg-white py-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(null)}
            className={`block w-full px-3.5 py-2 text-left text-[12px] transition-colors ${!sigungu ? SELECTED_ROW : IDLE_ROW}`}
          >
            {region.name} 전체
          </button>
          {sigungus.map((s) => (
            <button
              key={s.code}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className={`block w-full px-3.5 py-2 text-left text-[12px] transition-colors ${sigungu?.code === s.code ? SELECTED_ROW : IDLE_ROW}`}
            >
              {s.name}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default function ExploreSidebar({ theme, region, sigungu, onSelectTheme, onSelectRegion, onSelectSigungu, onSelectAll }) {
  const [areas, setAreas] = useState(() => sortAreasByPopularity(FALLBACK_AREAS))
  const [showMoreRegions, setShowMoreRegions] = useState(false)
  const isAll = !theme && !region

  useEffect(() => {
    let ignore = false
    getTourAreas()
      .then((list) => {
        if (!ignore && Array.isArray(list) && list.length) setAreas(sortAreasByPopularity(list))
      })
      .catch(() => { /* 폴백 유지 */ })
    return () => { ignore = true }
  }, [])

  const visibleAreas = showMoreRegions ? areas : areas.slice(0, REGIONS_VISIBLE_COUNT)

  return (
    <aside className="w-full shrink-0 md:w-[200px]">
      <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSelectAll}
          className={`flex w-full shrink-0 items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold transition-colors ${
            isAll ? 'bg-brand text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Icon icon="mdi:view-grid" width={16} />
          전체보기
        </button>

        <div className="mt-6 shrink-0">
          <div className="px-1 text-[11px] font-bold text-slate-400">테마</div>
          <div className="mt-2 space-y-0.5">
            {THEMES.map((t) => (
              <button
                key={t.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelectTheme(t)}
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors ${
                  theme?.label === t.label ? SELECTED_ROW : IDLE_ROW
                }`}
              >
                <Icon icon={t.icon} width={17} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex min-h-0 flex-col">
          <div className="shrink-0 px-1 text-[11px] font-bold text-slate-400">지역</div>
          <div className="mt-2 min-h-0 space-y-0.5 overflow-y-auto pr-1 pb-2">
            {visibleAreas.map((a) => (
              <div key={a.code}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectRegion(a)}
                  className={`w-full rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors ${
                    region?.code === a.code ? SELECTED_ROW : IDLE_ROW
                  }`}
                >
                  {a.name}
                </button>
                {/* 축제 API는 시/도 단위까지만 받으므로 축제 테마에선 시군구 선택을 감춘다 */}
                {region?.code === a.code && theme?.kind !== 'festival' && (
                  <SigunguPicker region={region} sigungu={sigungu} onSelectSigungu={onSelectSigungu} />
                )}
              </div>
            ))}
            {areas.length > REGIONS_VISIBLE_COUNT && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowMoreRegions((v) => !v)}
                className="flex w-full items-center gap-1 rounded-[10px] px-3 py-2 text-[12.5px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showMoreRegions ? '접기' : '더보기'}
                <Icon icon="solar:alt-arrow-down-linear" width={12} className={showMoreRegions ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
