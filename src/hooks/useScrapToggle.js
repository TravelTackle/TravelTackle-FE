import { useEffect, useState } from 'react'
import { saveTrip, unsaveTrip } from '../api/trip'

// 여행자 피드/보관함에서 공통으로 쓰는 스크랩(찜) 토글 — 복사(copySavedTrip)와는 별개의 가벼운 액션.
// "스크랩했는지"는 savedTripId 하나로만 판단한다(있으면 스크랩됨) — 별도 boolean을 더 두면
// 서버 값과 어긋날 때 아이콘 상태와 실제 저장 여부가 따로 노는 버그가 생기기 쉽다.
// tripId가 바뀌면(다른 카드/상세로 전환) 초기값으로 다시 맞춘다.
export default function useScrapToggle(tripId, initialSavedTripId = null) {
  const [savedTripId, setSavedTripId] = useState(initialSavedTripId)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setSavedTripId(initialSavedTripId)
  }, [tripId, initialSavedTripId])

  async function toggle() {
    if (pending || !tripId) return false
    setPending(true)
    try {
      if (savedTripId) {
        await unsaveTrip(savedTripId)
        setSavedTripId(null)
        return true
      }
      const res = await saveTrip(tripId)
      setSavedTripId(res.savedTripId)
      return true
    } catch {
      // 조용히 실패 — 아이콘이 원래 상태로 남아있으니 다시 눌러 재시도 가능
      return false
    } finally {
      setPending(false)
    }
  }

  return { saved: !!savedTripId, pending, savedTripId, toggle }
}
