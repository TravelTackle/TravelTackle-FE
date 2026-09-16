import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Skeleton from './ui/Skeleton'
import Avatar from './ui/Avatar'
import { useNotifications } from '../notifications/NotificationContext'
import { describeNotification, notificationKind, notificationTarget } from '../notifications/describe'
import { timeAgo } from '../lib/homeFormat'
import { useLanguage } from '../i18n'

// NotificationPanel(종 팝오버 안쪽) 전용 문구 — Navbar/Footer와 같은 패턴
const T = {
  ko: {
    title: '알림',
    unread: (n) => `새 ${n > 99 ? '99+' : n}`,
    markAllRead: '모두 읽음',
    loadingAria: '알림을 불러오는 중',
    loadError: '알림을 불러오지 못했어요.',
    retry: '다시 시도',
    emptyTitle: '아직 알림이 없어요',
    emptyDesc: '계획을 공개하면 다른 여행자의 참견과 스크랩이 여기에 모여요.',
    listAria: '알림 목록',
    loadMore: '이전 알림 더 보기',
    travelerFallback: '여행자',
  },
  en: {
    title: 'Notifications',
    unread: (n) => `${n > 99 ? '99+' : n} new`,
    markAllRead: 'Mark all read',
    loadingAria: 'Loading notifications',
    loadError: 'Could not load notifications.',
    retry: 'Try again',
    emptyTitle: 'No notifications yet',
    emptyDesc: "Publish a trip and feedback or saves from other travelers will show up here.",
    listAria: 'Notification list',
    loadMore: 'Load earlier notifications',
    travelerFallback: 'A traveler',
  },
}

function RowSkeleton({ i }) {
  return (
    <li className="flex items-start gap-3 px-3.5 py-2.5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" style={{ animationDelay: `${i * 80}ms` }} />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-11/12" style={{ animationDelay: `${i * 80 + 40}ms` }} />
        <Skeleton className="mt-1.5 h-2.5 w-3/5" style={{ animationDelay: `${i * 80 + 80}ms` }} />
        <Skeleton className="mt-1.5 h-2 w-10" style={{ animationDelay: `${i * 80 + 120}ms` }} />
      </div>
    </li>
  )
}

// 종 아이콘 팝오버 안쪽 — 헤더(미읽음 수 · 모두 읽음) / 목록 / 더 보기. 데이터는 NotificationContext에서
export default function NotificationPanel({ onNavigate }) {
  const { items, unreadCount, loading, loadingMore, error, hasMore, load, loadMore, markRead, markAllRead } = useNotifications()
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const showSkeleton = loading && items.length === 0

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-slate-900">{copy.title}</span>
          {unreadCount > 0 && (
            <span key={unreadCount} className="ai-pop rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{copy.unread(unreadCount)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="text-[11.5px] font-semibold text-slate-400 transition-colors hover:text-brand disabled:cursor-default disabled:opacity-50 disabled:hover:text-slate-400"
        >
          {copy.markAllRead}
        </button>
      </div>

      {showSkeleton ? (
        <ul className="py-1" role="status" aria-label={copy.loadingAria}>
          {[0, 1, 2].map((i) => (
            <RowSkeleton key={i} i={i} />
          ))}
        </ul>
      ) : error ? (
        <div className="px-3.5 py-6 text-center">
          <p className="text-[12px] text-rose-500">{copy.loadError}</p>
          <button type="button" onClick={load} className="mt-2 text-[11.5px] font-semibold text-brand underline underline-offset-2">
            {copy.retry}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <Icon icon="solar:bell-off-linear" width={22} />
          </span>
          <p className="mt-3 text-[13px] font-bold text-slate-700">{copy.emptyTitle}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{copy.emptyDesc}</p>
        </div>
      ) : (
        <>
          <ul className="max-h-[400px] overflow-y-auto py-1" aria-label={copy.listAria}>
            {items.map((n, i) => {
              const kind = notificationKind(n)
              return (
                <li key={n.id} className="animate-slide-in" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
                  <Link
                    to={notificationTarget(n)}
                    onClick={() => {
                      markRead(n.id)
                      onNavigate?.()
                    }}
                    className={`relative flex items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-slate-50 ${n.read ? '' : 'bg-brand-light/50'}`}
                  >
                    {/* 행위자 사진 + 오른쪽 아래 종류 배지(참견 장미 / 스크랩 호박), 미읽음 점은 왼쪽 위 */}
                    <span className="relative shrink-0">
                      <Avatar user={{ name: n.actor?.name || copy.travelerFallback, profileImageUrl: n.actor?.profileImageUrl }} size={36} />
                      <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface ${kind.tone}`}>
                        <Icon icon={kind.icon} width={9} />
                      </span>
                      {!n.read && <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-surface" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12.5px] leading-snug ${n.read ? 'text-slate-600' : 'text-slate-900'}`}>{describeNotification(n, language)}</span>
                      {n.feedback?.preview && (
                        <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-slate-500">“{n.feedback.preview}”</span>
                      )}
                      <span className="mt-1 block text-[10.5px] text-slate-400">{timeAgo(n.createdAt, language)}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
            {loadingMore && <RowSkeleton i={0} />}
          </ul>
          {hasMore && !loadingMore && (
            <button
              type="button"
              onClick={loadMore}
              className="border-t border-slate-100 py-2 text-[11.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand"
            >
              {copy.loadMore}
            </button>
          )}
        </>
      )}
    </div>
  )
}
