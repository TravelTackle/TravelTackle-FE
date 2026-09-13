// 홈 섹션 공통 표기 도우미

const DATE_FMT = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
const DAY_FMT = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

// "2026-09-09T23:31:56" → "2026.09.09"
export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return DATE_FMT.format(d).replace(/\s/g, '').replace(/\.$/, '')
}

// "2026-07-06" → "7월 6일 (월)"
export function formatDay(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return DAY_FMT.format(d)
}

const PROVINCE_SHORT = {
  경상남도: '경남',
  경상북도: '경북',
  충청남도: '충남',
  충청북도: '충북',
  전라남도: '전남',
  전라북도: '전북',
}

// 주소 첫 토큰을 칩에 들어갈 짧은 지역명으로 — "제주특별자치도 서귀포시 …" → "제주", "경상남도 …" → "경남"
export function shortRegion(address) {
  if (!address) return ''
  const first = address.split(' ')[0]
  return PROVINCE_SHORT[first] ?? first.replace(/(통합특별시|특별자치도|특별자치시|광역시|특별시|도)$/, '')
}

// "2026-08-26" ~ "2026-08-28" → "2박 3일"
export function formatDuration(startDate, endDate) {
  const a = new Date(startDate)
  const b = new Date(endDate)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ''
  const nights = Math.max(0, Math.round((b - a) / 86_400_000))
  return `${nights}박 ${nights + 1}일`
}

// "방금 전" · "5분 전" · "3시간 전" · "어제" · "4일 전" · 그보다 오래되면 날짜
export function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day === 1) return '어제'
  if (day < 7) return `${day}일 전`
  return formatDate(iso)
}

