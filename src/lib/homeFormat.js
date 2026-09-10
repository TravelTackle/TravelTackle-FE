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
