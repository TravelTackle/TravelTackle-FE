// 홈 섹션 공통 표기 도우미 — language(기본 'ko')를 넘기면 영어 표기로 바뀐다(하위호환: 생략 시 기존과 동일)

const DATE_FMT = {
  ko: new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
  en: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
}
const DAY_FMT = {
  ko: new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }),
  en: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', weekday: 'short' }),
}

// "2026-09-09T23:31:56" → "2026.09.09" (ko) / "09/09/2026" (en)
export function formatDate(iso, language = 'ko') {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (language === 'ko') return DATE_FMT.ko.format(d).replace(/\s/g, '').replace(/\.$/, '')
  return (DATE_FMT[language] ?? DATE_FMT.en).format(d)
}

// "2026-07-06" → "7월 6일 (월)" (ko) / "July 6, Mon" (en)
export function formatDay(iso, language = 'ko') {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return (DAY_FMT[language] ?? DAY_FMT.en).format(d)
}

const PROVINCE_SHORT = {
  경상남도: '경남',
  경상북도: '경북',
  충청남도: '충남',
  충청북도: '충북',
  전라남도: '전남',
  전라북도: '전북',
}

// 주소 첫 토큰을 칩에 들어갈 짧은 지역명으로 — "제주특별자치도 서귀포시 …" → "제주", "경상남도 …" → "경남".
// EngService2 등 영어 주소는 "161 Sajik-ro, Jongno-gu, Seoul"처럼 콤마로 구분되고 시/도 이름이
// 맨 끝에 온다 — 이 형식이면 마지막 콤마 토큰을 그대로 쓴다(공백 split을 쓰면 "161" 같은 번지수만 나옴).
export function shortRegion(address) {
  if (!address) return ''
  if (address.includes(',')) {
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
    return parts[parts.length - 1] ?? ''
  }
  const first = address.split(' ')[0]
  return PROVINCE_SHORT[first] ?? first.replace(/(통합특별시|특별자치도|특별자치시|광역시|특별시|도)$/, '')
}

// "2026-08-26" ~ "2026-08-28" → "2박 3일" (ko) / "2 nights, 3 days" (en)
export function formatDuration(startDate, endDate, language = 'ko') {
  const a = new Date(startDate)
  const b = new Date(endDate)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ''
  const nights = Math.max(0, Math.round((b - a) / 86_400_000))
  if (language !== 'ko') {
    if (nights === 0) return '1 day'
    return `${nights} night${nights > 1 ? 's' : ''}, ${nights + 1} days`
  }
  return `${nights}박 ${nights + 1}일`
}
