import { useCallback, useRef, useState } from 'react'
import { saveTrip, unsaveTrip } from '../api/trip'

// 여행자 피드/보관함 화면에서 같은 tripId를 카드와 상세 패널 등 여러 곳에서 동시에 보여준다.
// 각자 따로 스크랩 상태를 들고 있으면(예전 방식) 카드에서 스크랩해도 그 시점에 이미 열려 있던
// 상세 패널은 그 사실을 모른 채 자기 state를 유지해서 "저장됨"/"저장하기"가 서로 어긋났다.
// 한 페이지 안에서 이 훅을 하나만 만들어 tripId 기준 map으로 공유하면, 어디서 토글하든
// 같은 화면의 모든 카드/패널이 즉시 같은 값을 본다.
export default function useScrapMap() {
  const [map, setMap] = useState({})
  const [pending, setPending] = useState({})
  const seeded = useRef(new Set())

  // 서버에서 받은 초기값으로 한 번만 채운다 — 이미 토글해서 map에 값이 있으면 덮어쓰지 않는다.
  const seed = useCallback((tripId, savedTripId) => {
    if (tripId == null || seeded.current.has(tripId)) return
    seeded.current.add(tripId)
    setMap((m) => ({ ...m, [tripId]: savedTripId ?? null }))
  }, [])

  const savedTripIdOf = useCallback((tripId, fallback = null) => (tripId in map ? map[tripId] : fallback), [map])
  const isPending = useCallback((tripId) => !!pending[tripId], [pending])

  // sourceType: 새로 스크랩하는 경우에만 의미 있음('PLAN' | 'RECORD') — 어느 카드에서 눌렀는지를
  // 그대로 서버에 넘겨서, 보관함에서 같은 형태의 카드로 보여줄 수 있게 한다.
  const toggle = useCallback(
    async (tripId, fallback = null, sourceType = 'PLAN') => {
      if (!tripId || pending[tripId]) return false
      const current = tripId in map ? map[tripId] : fallback
      setPending((p) => ({ ...p, [tripId]: true }))
      try {
        if (current) {
          await unsaveTrip(current)
          setMap((m) => ({ ...m, [tripId]: null }))
        } else {
          const res = await saveTrip(tripId, sourceType)
          setMap((m) => ({ ...m, [tripId]: res.savedTripId }))
        }
        return true
      } catch {
        // 조용히 실패 — map은 그대로라 다시 누르면 재시도된다
        return false
      } finally {
        setPending((p) => ({ ...p, [tripId]: false }))
      }
    },
    [map, pending],
  )

  return { seed, savedTripIdOf, isPending, toggle }
}
