import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// 요청을 보낸 화면(라우트 경로)을 X-Client-Screen 헤더로 함께 보낸다 — 백엔드 로그·분석에서 어느 화면의 호출인지 구분용.
// 값은 해시·쿼리를 뺀 pathname(예: /feed, /mypage/settings). SSE(EventSource)는 헤더를 못 붙이므로 제외된다.
export function currentScreen() {
  return typeof window === 'undefined' ? '' : window.location.pathname || '/'
}

// 앱에서 선택한 언어(브라우저 기본값이 아님)를 모든 요청에 함께 실어 보낸다.
// - language 쿼리 파라미터: TourAPI 언어별 서비스 선택(백엔드 TourController/RecommendationService)용.
// - Accept-Language 헤더: 백엔드 에러 메시지 언어 판별(GlobalExceptionHandler)용 — 브라우저 OS 언어와
//   앱에서 고른 언어가 어긋나는 사용자도 항상 앱의 선택을 따르도록 브라우저 기본값에 맡기지 않고 명시적으로 세팅한다.
client.interceptors.request.use((config) => {
  let language = 'ko'
  try {
    language = localStorage.getItem('tt-language') || 'ko'
  } catch {
    // 프라이빗 모드 등 localStorage 접근이 막힌 환경에서는 기본값(ko)으로 요청
  }
  config.params = { ...(config.params || {}), language }
  config.headers = { ...(config.headers || {}), 'Accept-Language': language }
  return config
})

client.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}
  config.headers['X-Client-Screen'] = currentScreen()
  return config
})

// 세션이 만료되면 백엔드(Spring Security)가 API 요청을 로그인 HTML 페이지로 리다이렉트할 수 있다.
// 그 HTML이 200으로 들어오면 호출한 쪽은 JSON인 줄 알고 깨지므로, 여기서 401 실패로 바꿔 넘긴다.
function isHtmlResponse(res) {
  const type = String(res.headers?.['content-type'] || '')
  return type.includes('text/html') || (typeof res.data === 'string' && /^\s*<!doctype html/i.test(res.data))
}

client.interceptors.response.use(
  (res) => {
    if (isHtmlResponse(res)) {
      const err = new Error('로그인이 필요합니다.')
      err.config = res.config
      err.response = { status: 401, data: null, headers: res.headers, config: res.config }
      return Promise.reject(err)
    }
    return res
  },
  async (err) => {
    const original = err.config
    // /auth/me는 만료된 액세스 토큰을 refresh로 살려 재시도 (로그인·refresh 자체의 401은 재시도 금지)
    const isAuthEndpoint = original.url?.includes('/auth/') && !original.url?.includes('/auth/me')
    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true, headers: { 'X-Client-Screen': currentScreen() } })
        return client(original)
      } catch {
        // not logged in — let the caller's own .catch() handle the fallback
      }
    }
    return Promise.reject(err)
  }
)

export default client
