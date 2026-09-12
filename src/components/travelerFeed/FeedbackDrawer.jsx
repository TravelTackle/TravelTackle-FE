import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Skeleton from '../ui/Skeleton'
import { useAuth } from '../../context/AuthContext'
import { createFeedback, getTripFeedback } from '../../api/feed'
import { formatDate } from '../../lib/homeFormat'

const MAX_LENGTH = 2000
const PAGE_SIZE = 30

// 참견 사이드 패널 — 카드의 참견 아이콘을 누르면 오른쪽에서 열린다. 목록(스켈레톤 → 참견들) + 아래 고정 작성란.
// target: { tripId, title, ownerName } — 기록 카드에서 열면 그 기록의 계획이 대상이다.
export default function FeedbackDrawer({ target, onClose, onPosted }) {
  const { user, loading: authLoading } = useAuth()
  const open = !!target
  const tripId = target?.tripId
  const [state, setState] = useState({ items: [], loading: false, error: false })
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const listRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!tripId) return
    let ignore = false
    setState({ items: [], loading: true, error: false })
    setDraft('')
    setSubmitError('')
    getTripFeedback(tripId, { page: 0, size: PAGE_SIZE })
      .then((page) => {
        if (ignore) return
        setState({ items: Array.isArray(page?.content) ? page.content : [], loading: false, error: false })
      })
      .catch(() => { if (!ignore) setState({ items: [], loading: false, error: true }) })
    return () => { ignore = true }
  }, [tripId])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit() {
    const content = draft.trim()
    if (!content || submitting || !tripId) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const created = await createFeedback(tripId, content)
      setState((s) => ({ ...s, items: [created, ...s.items] }))
      setDraft('')
      onPosted?.(tripId)
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
    } catch (err) {
      const data = err?.response?.data
      setSubmitError(
        err?.response?.status === 401 ? '로그인이 필요해요.' : data?.message || '참견을 남기지 못했어요. 잠시 후 다시 시도해주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const count = state.items.length
  // 백엔드는 본인 계획에 참견을 막는다(TRIP_019). 피드 응답엔 작성자 id가 없어 이름으로 가려낸다.
  const isMine = !!(user && target?.ownerName && target.ownerName === user.name)

  return (
    <>
      {open && <button aria-label="참견 패널 닫기" onClick={onClose} className="fixed inset-0 z-[57] cursor-default bg-slate-900/10" />}

      <aside
        aria-label="참견"
        className={`fixed top-16 bottom-0 right-0 z-[58] flex w-full max-w-[420px] flex-col bg-white shadow-popup transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {open && (
          <>
            <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5">
              <button
                onClick={onClose}
                aria-label="닫기"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-50"
              >
                <Icon icon="mdi:chevron-right" width={20} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-slate-900">참견</h2>
                  {state.loading ? (
                    <Skeleton className="h-4 w-8 rounded-md" />
                  ) : (
                    <span key={count} className="ai-pop rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                      {count}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">
                  <span className="font-semibold text-slate-700">{target.title}</span>
                  {target.ownerName && <span className="text-slate-400"> · {target.ownerName}</span>}
                </p>
              </div>
            </header>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {state.loading ? (
                <FeedbackSkeleton />
              ) : state.error ? (
                <div className="py-16 text-center text-[13px] text-rose-500">참견을 불러오지 못했어요.</div>
              ) : state.items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-brand">
                    <Icon icon="mdi:comment-text-outline" width={22} />
                  </span>
                  <p className="text-[13px] font-semibold text-slate-700">아직 참견이 없어요</p>
                  <p className="text-[12px] text-slate-400">이 계획에 첫 번째 참견을 남겨보세요.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {state.items.map((f, i) => (
                    <li
                      key={f.id ?? i}
                      className="animate-slide-in rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card"
                      style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-[11px] font-bold text-brand-dark">
                          {(f.author?.name || '여').slice(0, 1)}
                        </span>
                        <span className="truncate text-[12.5px] font-bold text-slate-800">{f.author?.name || '여행자'}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-slate-400">{formatDate(f.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{f.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white p-4">
              {isMine ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[12.5px] text-slate-600">내 계획에는 참견을 남길 수 없어요. 다른 여행자의 참견을 여기서 확인하세요.</p>
                  <Link to="/trips" className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-slate-700 transition-colors hover:border-brand/40">
                    나의 여행
                  </Link>
                </div>
              ) : !authLoading && !user ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[12.5px] text-slate-600">로그인하면 참견을 남길 수 있어요.</p>
                  <Link to="/login" className="shrink-0 rounded-full bg-brand px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-dark">
                    로그인
                  </Link>
                </div>
              ) : (
                <>
                  <div
                    className={`rounded-2xl border bg-white transition-colors ${
                      submitting ? 'border-slate-200' : 'border-slate-200 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10'
                    }`}
                  >
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
                      }}
                      disabled={submitting}
                      rows={3}
                      placeholder="이 계획에 참견을 남겨보세요. 추천 장소, 동선, 시간 배분 무엇이든 좋아요."
                      className="w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-300 disabled:text-slate-400"
                    />
                    <div className="flex items-center justify-between px-3 pb-2.5">
                      <span className="text-[11px] text-slate-300">{draft.length}/{MAX_LENGTH}</span>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!draft.trim() || submitting}
                        className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        {submitting ? <Icon icon="mdi:loading" width={14} className="animate-spin" /> : <Icon icon="solar:chat-round-dots-bold" width={14} />}
                        {submitting ? '남기는 중' : '참견 남기기'}
                      </button>
                    </div>
                  </div>
                  {submitError && <p role="alert" className="mt-2 text-[12px] font-semibold text-rose-500">{submitError}</p>}
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}

function FeedbackSkeleton() {
  return (
    <ul className="flex flex-col gap-3" role="status" aria-label="참견을 불러오는 중">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-2xl border border-slate-100 p-3.5" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" style={{ animationDelay: `${i * 90}ms` }} />
            <Skeleton className="h-3 w-16" style={{ animationDelay: `${i * 90 + 40}ms` }} />
            <Skeleton className="ml-auto h-2.5 w-14" style={{ animationDelay: `${i * 90 + 80}ms` }} />
          </div>
          <Skeleton className="mt-3 h-3 w-11/12" style={{ animationDelay: `${i * 90 + 120}ms` }} />
          <Skeleton className="mt-2 h-3 w-2/3" style={{ animationDelay: `${i * 90 + 160}ms` }} />
        </li>
      ))}
    </ul>
  )
}
