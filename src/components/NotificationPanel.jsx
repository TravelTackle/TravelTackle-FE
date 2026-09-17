import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Skeleton from './ui/Skeleton'
import Avatar from './ui/Avatar'
import { useNotifications } from '../notifications/NotificationContext'
import { describeNotification, notificationKind, notificationTarget } from '../notifications/describe'
import { timeAgo } from '../lib/homeFormat'

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
  const { items, unreadCount, loading, loadingMore, error, hasMore, load, loadMore, markRead, markAllRead, clearAll } = useNotifications()
  const showSkeleton = loading && items.length === 0
  const [confirmClear, setConfirmClear] = useState(false) // "모두 지우기" 2단계 확인
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState('')

  useEffect(() => {
    if (!clearError) return undefined
    const t = setTimeout(() => setClearError(''), 2500)
    return () => clearTimeout(t)
  }, [clearError])

  async function handleClearAll() {
    setConfirmClear(false)
    setClearing(true)
    const result = await clearAll()
    setClearing(false)
    if (!result.ok) setClearError(result.message)
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-slate-900">알림</span>
          {unreadCount > 0 && (
            <span key={unreadCount} className="ai-pop rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">새 {unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
        {confirmClear ? (
          // 확인 단계 — 헤더 오른쪽이 그 자리에서 질문으로 바뀐다
          <span className="flex items-center gap-2 text-[11.5px]">
            <span className="text-slate-500">알림 {items.length}개를 지울까요?</span>
            <button type="button" onClick={handleClearAll} className="font-bold text-rose-500 hover:text-rose-600">
              지우기
            </button>
            <button type="button" onClick={() => setConfirmClear(false)} className="font-semibold text-slate-400 hover:text-slate-600">
              취소
            </button>
          </span>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0 || clearing}
              className="text-[11.5px] font-semibold text-slate-400 transition-colors hover:text-brand disabled:cursor-default disabled:opacity-50 disabled:hover:text-slate-400"
            >
              모두 읽음
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={items.length === 0 || clearing}
              className="flex items-center gap-1 text-[11.5px] font-semibold text-slate-400 transition-colors hover:text-rose-500 disabled:cursor-default disabled:opacity-50 disabled:hover:text-slate-400"
            >
              {clearing && <Icon icon="solar:refresh-linear" width={12} className="ai-spin" />}
              모두 지우기
            </button>
          </div>
        )}
      </div>
      {clearError && (
        <p role="alert" className="border-b border-rose-100 bg-rose-50 px-3.5 py-2 text-[11.5px] font-semibold text-rose-500">
          {clearError}
        </p>
      )}

      {showSkeleton ? (
        <ul className="py-1" role="status" aria-label="알림을 불러오는 중">
          {[0, 1, 2].map((i) => (
            <RowSkeleton key={i} i={i} />
          ))}
        </ul>
      ) : error ? (
        <div className="px-3.5 py-6 text-center">
          <p className="text-[12px] text-rose-500">알림을 불러오지 못했어요.</p>
          <button type="button" onClick={load} className="mt-2 text-[11.5px] font-semibold text-brand underline underline-offset-2">
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <Icon icon="solar:bell-off-linear" width={22} />
          </span>
          <p className="mt-3 text-[13px] font-bold text-slate-700">아직 알림이 없어요</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">계획을 공개하면 다른 여행자의 참견과 스크랩이 여기에 모여요.</p>
        </div>
      ) : (
        <>
          <ul className="max-h-[400px] overflow-y-auto py-1" aria-label="알림 목록">
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
                      <Avatar user={{ name: n.actor?.name || '여행자', profileImageUrl: n.actor?.profileImageUrl }} size={36} />
                      <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface ${kind.tone}`}>
                        <Icon icon={kind.icon} width={9} />
                      </span>
                      {!n.read && <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-surface" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12.5px] leading-snug ${n.read ? 'text-slate-600' : 'text-slate-900'}`}>{describeNotification(n)}</span>
                      {n.feedback?.preview && (
                        <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-slate-500">“{n.feedback.preview}”</span>
                      )}
                      <span className="mt-1 block text-[10.5px] text-slate-400">{timeAgo(n.createdAt)}</span>
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
              이전 알림 더 보기
            </button>
          )}
        </>
      )}
    </div>
  )
}
