import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { CustomOverlayMap, Map, Polyline, useKakaoLoader, useMap } from 'react-kakao-maps-sdk'
import DayColumn from './DayColumn'
import TripItemCard from './TripItemCard'
import { getItemCoords } from '../../lib/kakaoMapCoords'
import { tripItemColor, tripItemIcon } from '../../lib/cartThemes'

// 좌표를 아직 하나도 못 받아왔을 때 지도 초기 중심 — 서울시청
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }

// Day 카드 위, 같은 폭 안에서 좌우 끝에 붙는 화살표 행 — 카드와 겹치지 않고 그 위에 따로 얹힌다.
const NAV_BUTTON_CLASS =
  'flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-[1.5px_1.5px_5px_rgba(15,23,42,0.15)] transition-colors hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30'

// Map 컴포넌트 안에서만 useMap()을 쓸 수 있어서, bounds 맞추는 로직 + 그걸 다시 트리거하는 버튼을 같이 둔다.
// 진입 시/Day 전환 시 자동 맞춤은 순간이동, 버튼을 직접 눌러서 다시 맞출 때만 panTo로 부드럽게 움직인다.
function FitBoundsControl({ coords }) {
  const map = useMap()

  const fit = useCallback(
    (animate) => {
      if (!coords.length) return
      const kakao = window.kakao
      if (coords.length === 1) {
        const latlng = new kakao.maps.LatLng(coords[0].lat, coords[0].lng)
        if (animate) {
          map.panTo(latlng)
          map.setLevel(5, { animate: true })
        } else {
          map.setCenter(latlng)
          map.setLevel(5)
        }
        return
      }
      const bounds = new kakao.maps.LatLngBounds()
      coords.forEach((c) => bounds.extend(new kakao.maps.LatLng(c.lat, c.lng)))
      if (animate) map.panTo(bounds)
      else map.setBounds(bounds)
    },
    [coords, map],
  )

  useEffect(() => {
    fit(false)
  }, [fit])

  return (
    <button
      type="button"
      aria-label="전체 동선 다시 보기"
      title="전체 동선 다시 보기"
      onClick={() => fit(true)}
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[1.5px_1.5px_5px_rgba(15,23,42,0.2)] transition-colors hover:text-brand"
    >
      <Icon icon="mdi:crop-free" width={16} />
    </button>
  )
}

// 동선 위 마커 하나 — 카테고리 아이콘 원(+순서 뱃지) + 장소 이름, 호버 시 리스트뷰와 동일한 상세카드.
function RouteMarker({ item, coord, order }) {
  const [hovered, setHovered] = useState(false)

  return (
    <CustomOverlayMap position={coord} xAnchor={0.5} yAnchor={1} clickable zIndex={hovered ? 30 : 10}>
      <div
        className="relative flex flex-col items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered && (
          <div className="absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2">
            <TripItemCard item={item} readOnly />
          </div>
        )}
        <span
          className={`relative flex h-7 w-7 items-center justify-center rounded-full text-white shadow-card ${tripItemColor(item.contentTypeId)}`}
        >
          <Icon icon={tripItemIcon(item.contentTypeId)} width={14} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-slate-900 text-[9px] font-bold text-white">
            {order}
          </span>
        </span>
        <span className="mt-1 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-card">
          {item.cachedTitle}
        </span>
      </div>
    </CustomOverlayMap>
  )
}

// 지도 탭 — 선택된 Day 하나만 동선(원+순서+선)으로 보여주고, 옆엔 그 Day를 리스트뷰와 동일한 DayColumn으로
// 좌우 화살표로 넘기며 보여준다. 좌표는 TourAPI 콘텐츠 상세를 그때그때 조회해서 쓴다(백엔드 변경 없음).
export default function TripMapView({
  trip,
  selectedDayId,
  onSelectDay,
  onAddCartItem,
  onReorderItem,
  onMoveItem,
  onSaveTime,
  onSaveMemo,
  onDeleteItem,
}) {
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY ?? '',
    libraries: ['services'],
    // 기본값(//dapi.kakao.com/...)이 http인 로컬 dev 서버(http://localhost)에서 그대로 http로 요청돼
    // 503이 나서, https를 명시적으로 고정한다.
    url: 'https://dapi.kakao.com/v2/maps/sdk.js',
  })

  const dayIndex = trip.days.findIndex((d) => d.id === selectedDayId)
  const activeDay = trip.days[dayIndex] ?? trip.days[0]

  const [coordsByItemId, setCoordsByItemId] = useState({})

  useEffect(() => {
    let cancelled = false
    ;(activeDay?.items ?? []).forEach((item) => {
      getItemCoords(item.tourApiContentId).then((coord) => {
        if (!cancelled && coord) setCoordsByItemId((prev) => ({ ...prev, [item.id]: coord }))
      })
    })
    return () => {
      cancelled = true
    }
  }, [activeDay])

  // Day의 순서(orderIndex) 그대로, 좌표를 아직 모르는 항목만 건너뛴다.
  const routeCoords = useMemo(
    () => (activeDay?.items ?? []).map((item) => coordsByItemId[item.id]).filter(Boolean),
    [activeDay, coordsByItemId],
  )

  const [slideDirection, setSlideDirection] = useState(1)

  function goDay(delta) {
    const next = trip.days[dayIndex + delta]
    if (next) {
      setSlideDirection(delta)
      onSelectDay(next.id)
    }
  }

  if (!import.meta.env.VITE_KAKAO_MAP_KEY || error) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center">
        <Icon icon="mdi:map-marker-off-outline" width={28} className="text-slate-300" />
        <p className="text-[13px] text-slate-400">지도를 불러오지 못했어요. 카카오맵 키(VITE_KAKAO_MAP_KEY) 설정을 확인해주세요.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <Icon icon="mdi:loading" width={22} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <>
      {/* react-kakao-maps-sdk는 Map의 children(오버레이 제외한 일반 DOM)을 지도 div의 형제로 렌더링한다 —
          버튼이 지도 위에 정확히 겹쳐 보이려면 이 wrapper가 relative여야 한다. */}
      <div className="relative min-h-[480px] min-w-0 flex-1 overflow-hidden rounded-2xl">
        <Map center={routeCoords[0] ?? DEFAULT_CENTER} style={{ width: '100%', height: '100%' }}>
          <FitBoundsControl coords={routeCoords} />
          {routeCoords.length > 1 && (
            <Polyline path={routeCoords} strokeWeight={3} strokeColor="#3b82f6" strokeOpacity={0.9} strokeStyle="solid" />
          )}
          {(activeDay?.items ?? []).map((item, index) =>
            coordsByItemId[item.id] ? (
              <RouteMarker key={item.id} item={item} coord={coordsByItemId[item.id]} order={index + 1} />
            ) : null,
          )}
        </Map>
      </div>

      <div className="w-[260px] shrink-0">
        <div className="mb-1.5 flex items-center justify-between">
          <button type="button" aria-label="이전 Day" onClick={() => goDay(-1)} disabled={dayIndex <= 0} className={NAV_BUTTON_CLASS}>
            <Icon icon="solar:alt-arrow-left-linear" width={14} />
          </button>
          <button
            type="button"
            aria-label="다음 Day"
            onClick={() => goDay(1)}
            disabled={dayIndex >= trip.days.length - 1}
            className={NAV_BUTTON_CLASS}
          >
            <Icon icon="solar:alt-arrow-right-linear" width={14} />
          </button>
        </div>

        {activeDay && (
          <div key={activeDay.id} className={slideDirection > 0 ? 'animate-day-slide-in-right' : 'animate-day-slide-in-left'}>
            <DayColumn
              day={activeDay}
              selected
              onSelect={() => onSelectDay(activeDay.id)}
              onAddCartItem={onAddCartItem}
              onReorderItem={onReorderItem}
              onMoveItem={onMoveItem}
              onSaveTime={onSaveTime}
              onSaveMemo={onSaveMemo}
              onDeleteItem={onDeleteItem}
            />
          </div>
        )}
      </div>
    </>
  )
}
