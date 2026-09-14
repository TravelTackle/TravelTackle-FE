// 여행 계획 Day/시간 계산에 쓰는 순수 함수 모음. mock 단계·연동 단계 모두에서 재사용한다.

export const DEFAULT_DAY_START_TIME = '09:00'
export const DEFAULT_ITEM_DURATION_MINUTES = 60

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(totalMinutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function addMinutes(time, delta) {
  return minutesToTime(timeToMinutes(time) + delta)
}

export function durationMinutes(startTime, endTime) {
  return Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime))
}

// 날짜 문자열(YYYY-MM-DD) 사이 박/일 수 계산. language(기본 'ko')를 넘기면 영어 표기로 바뀐다
// (하위호환: 생략 시 기존과 동일 — 현재 호출부는 전부 트립 플래너 등 이번 단계 미대상 화면이라 ko 그대로 쓴다).
export function formatNights(startDate, endDate, language = 'ko') {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24))
  if (language !== 'ko') {
    if (nights === 0) return '1 day'
    return `${nights} night${nights > 1 ? 's' : ''}, ${nights + 1} days`
  }
  return `${nights}박 ${nights + 1}일`
}

export function addDays(dateStr, offset) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
