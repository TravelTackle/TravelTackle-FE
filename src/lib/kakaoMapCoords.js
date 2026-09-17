import { getTourContentDetail } from '../api/tour'

// contentId → 좌표 Promise 캐시. 서버도 이미 @Cacheable로 캐싱돼 있지만, 같은 세션에서 Day를
// 여러 번 오갈 때 같은 항목을 매번 다시 요청하지 않도록 프론트에서도 한 번만 조회한다.
const cache = new Map()

// 콘텐츠 상세(TourAPI)엔 위도/경도가 없는 타입도 있어서, 없으면 null을 반환하고 호출부가 마커를 건너뛴다.
export function getItemCoords(tourApiContentId) {
  if (!tourApiContentId) return Promise.resolve(null)
  if (cache.has(tourApiContentId)) return cache.get(tourApiContentId)

  const promise = getTourContentDetail(tourApiContentId)
    .then((detail) => {
      const { latitude, longitude } = detail ?? {}
      return typeof latitude === 'number' && typeof longitude === 'number' ? { lat: latitude, lng: longitude } : null
    })
    .catch(() => null)

  cache.set(tourApiContentId, promise)
  return promise
}
