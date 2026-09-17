import client from './client'

// 알림 API — 내 계획에 참견이 달렸을 때(FEEDBACK), 누군가 내 계획을 스크랩했을 때(SCRAP). 로그인 필요.
// NotificationResponse: { id, type: 'FEEDBACK'|'SCRAP', read, createdAt,
//   actor: { id, name } | null, trip: { id, title, thumbnailUrl } | null,
//   feedback: { id, target: 'TRIP'|'DAY'|'ITEM', dayNumber, itemTitle, preview } | null }

// 목록(최신순) + 미읽음 수. size 최대 50. → { unreadCount, content, page, size, totalElements, totalPages }
export function getNotifications({ page = 0, size = 20 } = {}) {
  return client.get('/notifications', { params: { page, size } }).then((res) => res.data)
}

// 종 아이콘 배지용 — { unreadCount }
export function getUnreadCount() {
  return client.get('/notifications/unread-count').then((res) => res.data)
}

export function markNotificationRead(notificationId) {
  return client.patch(`/notifications/${notificationId}/read`)
}

export function markAllNotificationsRead() {
  return client.patch('/notifications/read-all')
}

// 실시간 푸시(SSE). 서버 이벤트: connected · notification({ notification, unreadCount }) · unread-count({ unreadCount }) · heartbeat(25초).
// EventSource는 헤더를 못 붙이지만 같은 출처(/api 프록시)라 인증 쿠키가 자동으로 실린다.
// HTTP 오류(토큰 만료 등)로 끊기면 EventSource가 스스로 재접속하지 않으므로, onError에서 닫고 뒤로 물러나며 다시 연다.
// 재접속 전에 getUnreadCount()를 한 번 불러 axios 인터셉터가 만료된 액세스 토큰을 refresh하게 한다.
export function openNotificationStream({ onNotification, onUnreadCount }) {
  let source = null
  let retryTimer = null
  let closed = false
  let backoff = 3000

  const parse = (e) => {
    try {
      return JSON.parse(e.data)
    } catch {
      return null
    }
  }

  function connect() {
    if (closed) return
    source = new EventSource('/api/notifications/stream', { withCredentials: true })
    source.addEventListener('connected', () => {
      backoff = 3000
    })
    source.addEventListener('notification', (e) => {
      const data = parse(e)
      if (data?.notification) onNotification?.(data)
    })
    source.addEventListener('unread-count', (e) => {
      const data = parse(e)
      if (data && typeof data.unreadCount === 'number') onUnreadCount?.(data)
    })
    source.onerror = () => {
      // CONNECTING 상태면 브라우저가 알아서 다시 붙는 중 — CLOSED일 때만 우리가 다시 연다
      if (source?.readyState !== EventSource.CLOSED) return
      source.close()
      source = null
      if (closed) return
      retryTimer = setTimeout(() => {
        getUnreadCount()
          .then((d) => onUnreadCount?.(d))
          .catch(() => {})
          .finally(connect)
      }, backoff)
      backoff = Math.min(backoff * 2, 60000)
    }
  }

  connect()

  return () => {
    closed = true
    clearTimeout(retryTimer)
    source?.close()
    source = null
  }
}
