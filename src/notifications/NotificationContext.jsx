import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Avatar from '../components/ui/Avatar'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteAllNotifications, getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead, openNotificationStream } from '../api/notifications'
import { describeNotification, notificationKind, notificationTarget } from './describe'

/**
 * 알림 상태를 앱 전체에서 하나로 관리한다 — 종 배지(미읽음 수), 팝오버 목록, 실시간 푸시 토스트.
 * - 로그인하면 미읽음 수만 먼저 받고 SSE를 연다. 목록은 종을 처음 열 때 받는다.
 * - 새 알림이 오면 목록 맨 앞에 붙이고, 미읽음 수를 서버 값으로 맞추고, 토스트를 띄운다.
 * - 읽음 처리는 낙관적으로 먼저 반영하고 서버에 보낸다. 실패해도 SSE unread-count가 다시 맞춰 준다.
 */
const PAGE_SIZE = 20
const TOAST_MS = 6000
const NotificationContext = createContext(null)

const EMPTY = { items: [], unreadCount: 0, loading: false, loadingMore: false, error: false, page: 0, totalPages: 0, loaded: false }

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState(EMPTY)
  const [toasts, setToasts] = useState([]) // { id, notification }
  const userId = user?.userId ?? null

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: false }))
    getNotifications({ page: 0, size: PAGE_SIZE })
      .then((res) =>
        setState((s) => ({
          ...s,
          items: Array.isArray(res?.content) ? res.content : [],
          unreadCount: res?.unreadCount ?? s.unreadCount,
          page: 0,
          totalPages: res?.totalPages ?? 0,
          loading: false,
          loaded: true,
        })),
      )
      .catch(() => setState((s) => ({ ...s, loading: false, error: true })))
  }, [])

  const loadMore = useCallback(() => {
    setState((s) => {
      if (s.loadingMore || s.page + 1 >= s.totalPages) return s
      const next = s.page + 1
      getNotifications({ page: next, size: PAGE_SIZE })
        .then((res) =>
          setState((cur) => {
            const seen = new Set(cur.items.map((n) => n.id))
            const added = (res?.content ?? []).filter((n) => !seen.has(n.id))
            return { ...cur, items: [...cur.items, ...added], page: next, totalPages: res?.totalPages ?? cur.totalPages, loadingMore: false }
          }),
        )
        .catch(() => setState((cur) => ({ ...cur, loadingMore: false })))
      return { ...s, loadingMore: true }
    })
  }, [])

  const refreshUnread = useCallback(() => {
    getUnreadCount()
      .then((d) => setState((s) => ({ ...s, unreadCount: d?.unreadCount ?? s.unreadCount })))
      .catch(() => {})
  }, [])

  const markRead = useCallback((id) => {
    setState((s) => {
      const target = s.items.find((n) => n.id === id)
      if (!target || target.read) return s
      return { ...s, items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)), unreadCount: Math.max(0, s.unreadCount - 1) }
    })
    markNotificationRead(id).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, items: s.items.map((n) => (n.read ? n : { ...n, read: true })), unreadCount: 0 }))
    markAllNotificationsRead().catch(() => {})
  }, [])

  // 전체 삭제 — 먼저 비우고 서버에 보낸다. 실패하면 되돌리고 { ok:false, message }를 돌려줘 패널이 안내한다.
  const clearAll = useCallback(async () => {
    let previous = null
    setState((s) => {
      previous = s
      return { ...s, items: [], unreadCount: 0, page: 0, totalPages: 0 }
    })
    try {
      await deleteAllNotifications()
      return { ok: true }
    } catch (err) {
      if (previous) setState((s) => ({ ...s, items: previous.items, unreadCount: previous.unreadCount, page: previous.page, totalPages: previous.totalPages }))
      const status = err?.response?.status
      const message =
        status === 404 || status === 405 ? '알림 삭제는 아직 준비 중이에요.' : err?.response?.data?.message || '알림을 지우지 못했어요. 잠시 후 다시 시도해주세요.'
      return { ok: false, message }
    }
  }, [])

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  // 로그인 상태에 따라 미읽음 수 + SSE 연결 관리
  useEffect(() => {
    if (!userId) {
      setState(EMPTY)
      setToasts([])
      return undefined
    }
    refreshUnread()
    const stop = openNotificationStream({
      onNotification: ({ notification, unreadCount }) => {
        setState((s) => ({
          ...s,
          items: s.items.some((n) => n.id === notification.id) ? s.items : [notification, ...s.items],
          unreadCount: typeof unreadCount === 'number' ? unreadCount : s.unreadCount + 1,
        }))
        setToasts((t) => [{ id: notification.id, notification }, ...t].slice(0, 3))
      },
      onUnreadCount: ({ unreadCount }) => setState((s) => ({ ...s, unreadCount })),
    })
    return stop
  }, [userId, refreshUnread])

  const value = useMemo(
    () => ({ ...state, hasMore: state.page + 1 < state.totalPages, load, loadMore, refreshUnread, markRead, markAllRead, clearAll }),
    [state, load, loadMore, refreshUnread, markRead, markAllRead, clearAll],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismissToast} onOpen={markRead} />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

// 실시간으로 들어온 알림을 화면 오른쪽 위(네비 아래)에 잠깐 띄운다. 눌러 해당 화면으로 가면 읽음 처리
function ToastHost({ toasts, onDismiss, onOpen }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-3 top-[72px] z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4" role="status" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} notification={t.notification} onDismiss={() => onDismiss(t.id)} onOpen={() => onOpen(t.id)} />
      ))}
    </div>
  )
}

function Toast({ notification, onDismiss, onOpen }) {
  const navigate = useNavigate()
  const kind = notificationKind(notification)
  const timer = useRef(null)

  useEffect(() => {
    timer.current = setTimeout(onDismiss, TOAST_MS)
    return () => clearTimeout(timer.current)
  }, [onDismiss])

  return (
    <div className="noti-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-slate-100 bg-surface p-3 pr-2 shadow-popup ring-1 ring-black/5">
      <span className="relative shrink-0">
        <Avatar user={{ name: notification.actor?.name || '여행자', profileImageUrl: notification.actor?.profileImageUrl }} size={36} />
        <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface ${kind.tone}`}>
          <Icon icon={kind.icon} width={9} />
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          onOpen()
          onDismiss()
          navigate(notificationTarget(notification))
        }}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-[12.5px] leading-snug text-slate-800">{describeNotification(notification)}</p>
        {notification.feedback?.preview && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-slate-500">“{notification.feedback.preview}”</p>}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="알림 닫기"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <Icon icon="solar:close-circle-linear" width={16} />
      </button>
    </div>
  )
}
