// 축제·행사 기간 조회에 쓰는 날짜 도우미 — 프리셋 계산, 표기, 행사 상태(진행 중/D-n/종료)

const DAY_MS = 86_400_000

// 로컬 기준 "YYYY-MM-DD" (toISOString은 UTC로 넘어가 날짜가 밀릴 수 있어 직접 조립)
export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// "YYYY-MM-DD"를 로컬 자정으로 — new Date(iso)는 UTC 자정이라 한국에선 09:00이 되어 날짜 비교가 어긋난다
function parseLocal(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

// 프리셋 — 백엔드는 start~end와 "겹치는" 행사를 돌려주므로 start는 항상 오늘 이후로 잡는다
export function getPeriodPresets(language = 'ko') {
  if (language !== 'ko') {
    return [
      { key: 'today', label: 'Today', hint: 'Events happening today' },
      { key: 'week', label: 'This week', hint: 'From today through this Sunday' },
      { key: 'month', label: 'This month', hint: 'From today through the end of this month' },
      { key: 'nextMonth', label: 'Next month', hint: 'All of next month' },
      { key: 'upcoming', label: 'All upcoming', hint: 'All events from today onward' },
    ]
  }
  return [
    { key: 'today', label: '진행 중', hint: '오늘 열리는 행사' },
    { key: 'week', label: '이번 주', hint: '오늘부터 이번 주 일요일까지' },
    { key: 'month', label: '이번 달', hint: '오늘부터 이달 말까지' },
    { key: 'nextMonth', label: '다음 달', hint: '다음 달 한 달간' },
    { key: 'upcoming', label: '예정 전체', hint: '오늘 이후 모든 행사' },
  ]
}

export const DEFAULT_PRESET = 'month'

export function presetRange(key) {
  const t = today()
  switch (key) {
    case 'today':
      return { start: toISODate(t), end: toISODate(t) }
    case 'week': {
      const dow = t.getDay() // 0=일
      const sunday = new Date(t.getTime() + ((7 - dow) % 7) * DAY_MS)
      return { start: toISODate(t), end: toISODate(sunday) }
    }
    case 'nextMonth': {
      const first = new Date(t.getFullYear(), t.getMonth() + 1, 1)
      return { start: toISODate(first), end: toISODate(endOfMonth(first)) }
    }
    case 'upcoming':
      return { start: toISODate(t), end: null }
    case 'month':
    default:
      return { start: toISODate(t), end: toISODate(endOfMonth(t)) }
  }
}

// "2026-09-12" → "9.12", 연도가 올해와 다르면 "2027.1.3"
export function formatShortDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const sameYear = y === new Date().getFullYear()
  return sameYear ? `${m}.${d}` : `${y}.${m}.${d}`
}

// 기간 한 줄 표기 — "9.12 ~ 9.30", 하루면 "9.12", 끝이 없으면 "9.12부터" (ko) / "From 9.12" (en)
export function formatRange(start, end, language = 'ko') {
  if (!start) return ''
  if (!end) return language !== 'ko' ? `From ${formatShortDate(start)}` : `${formatShortDate(start)}부터`
  if (start === end) return formatShortDate(start)
  return `${formatShortDate(start)} ~ ${formatShortDate(end)}`
}

// 며칠간 열리는지 — "3일간"(ko) / "3 days"(en), 하루면 "하루"/"1 day", 두 달 넘으면 생략
export function formatSpan(start, end, language = 'ko') {
  if (!start || !end) return ''
  const days = Math.round((parseLocal(end) - parseLocal(start)) / DAY_MS) + 1
  if (!Number.isFinite(days) || days < 1) return ''
  if (days > 60) return ''
  if (language !== 'ko') return days === 1 ? '1 day' : `${days} days`
  if (days === 1) return '하루'
  return `${days}일간`
}

// 행사 상태 배지 — tone은 FestivalCard가 색으로 옮긴다
export function festivalStatus(start, end, language = 'ko') {
  const t = today()
  const s = parseLocal(start)
  const e = parseLocal(end)
  if (s && s > t) {
    const days = Math.round((s - t) / DAY_MS)
    const label = language !== 'ko' ? (days === 1 ? 'Starts tomorrow' : `D-${days}`) : days === 1 ? '내일 시작' : `D-${days}`
    return { tone: 'upcoming', label, days }
  }
  if (e && e < t) return { tone: 'ended', label: language !== 'ko' ? 'Ended' : '종료', days: 0 }
  if (e && e.getTime() === t.getTime()) return { tone: 'closing', label: language !== 'ko' ? 'Last day' : '오늘 마감', days: 0 }
  return { tone: 'live', label: language !== 'ko' ? 'Ongoing' : '진행 중', days: 0 }
}
