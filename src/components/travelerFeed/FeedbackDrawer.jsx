import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Avatar from '../ui/Avatar'
import { Link } from 'react-router-dom'
import Skeleton from '../ui/Skeleton'
import { useAuth } from '../../context/AuthContext'
import { addRecommendationToCart, createFeedback, deleteFeedback, getTripFeedback, updateFeedback } from '../../api/feed'
import { getTourContents } from '../../api/tour'
import { getCartItems } from '../../api/cart'
import { formatDate, shortRegion } from '../../lib/homeFormat'

const MAX_LENGTH = 2000
const PAGE_SIZE = 30
const MAX_RECOMMENDATIONS = 5

// 참견 항목 우측 위 점 세개 메뉴 — 수정하기/삭제하기. FeedDetailDrawer의 CardMenu와 같은 패턴.
function FeedbackItemMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative ml-auto shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="더보기"
        className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
      >
        <Icon icon="mdi:dots-vertical" width={15} />
      </button>
      {open && (
        <div className="nav-pop absolute right-0 top-full z-30 mt-1 w-28 overflow-hidden rounded-xl border border-slate-100 bg-surface py-1 shadow-popup">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Icon icon="mdi:pencil-outline" width={13} />
            수정하기
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[12px] font-semibold text-rose-500 transition-colors hover:bg-rose-50"
          >
            <Icon icon="mdi:trash-can-outline" width={13} />
            삭제하기
          </button>
        </div>
      )}
    </div>
  )
}

// FeedDetailDrawer의 DeleteConfirmDialog와 같은 오버레이+흰 카드+버튼 2개 패턴
function DeleteFeedbackDialog({ deleting, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[320px] rounded-2xl bg-surface p-5 shadow-popup">
        <h3 className="text-[15px] font-bold text-slate-900">이 참견을 삭제하시겠어요?</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">삭제하면 되돌릴 수 없어요.</p>
        {error && <p className="mt-2 text-[12px] text-rose-500">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-full border border-slate-200 py-2 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-full bg-rose-500 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? '삭제 중…' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 참견 사이드 패널 — 카드의 참견 아이콘을 누르면 오른쪽에서 열린다. 목록(스켈레톤 → 참견들) + 아래 고정 작성란.
// target: { tripId, title, ownerName } — 기록 카드에서 열면 그 기록의 계획이 대상이다.
export default function FeedbackDrawer({ target, onClose, onPosted, onDeleted }) {
  const { user, loading: authLoading } = useAuth()
  const open = !!target
  const tripId = target?.tripId
  const [state, setState] = useState({ items: [], loading: false, error: false })
  // 무한 스크롤 — 30건 넘는 참견은 스크롤 끝(sentinel)에 닿을 때마다 다음 페이지를 이어붙인다.
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [places, setPlaces] = useState([]) // 추천할 장소 [{ contentId, title, address, imageUrl }]
  const [pickerOpen, setPickerOpen] = useState(false)
  const [carted, setCarted] = useState(() => new Set()) // 이 세션에서 장바구니에 담은 추천 id
  const listRef = useRef(null)
  const textareaRef = useRef(null)

  // 참견 수정 — 본인 글에만 점 세개 메뉴로 진입. 한 번에 하나만 수정 상태로 둔다.
  // editPlaces: 작성 때와 같은 PlacePicker를 재사용해 추천 장소도 같이 수정한다.
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [editPlaces, setEditPlaces] = useState([])
  const [editPickerOpen, setEditPickerOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  function startEdit(f) {
    setEditingId(f.id)
    setEditDraft(f.content)
    setEditPlaces((f.recommendations || []).map((r) => ({ contentId: r.contentId, title: r.title, imageUrl: r.imageUrl })))
    setEditPickerOpen(false)
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
    setEditPlaces([])
    setEditPickerOpen(false)
    setEditError('')
  }

  function addEditPlace(place) {
    setEditPlaces((prev) => {
      if (prev.some((p) => p.contentId === place.contentId) || prev.length >= MAX_RECOMMENDATIONS) return prev
      return [...prev, place]
    })
  }

  async function handleUpdate(f) {
    const content = editDraft.trim()
    if (!content || editSubmitting) return
    setEditSubmitting(true)
    setEditError('')
    try {
      const updated = await updateFeedback(tripId, f.id, content, {
        recommendations: editPlaces.map((p) => p.contentId),
      })
      setState((s) => ({ ...s, items: s.items.map((it) => (it.id === f.id ? updated : it)) }))
      cancelEdit()
    } catch (err) {
      setEditError(err?.response?.data?.message || '수정하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setEditSubmitting(false)
    }
  }

  // 참견 삭제 — 지금은 작성자 본인만(계획 소유자 삭제는 아직 안 함)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteFeedback(tripId, deleteTarget.id)
      setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== deleteTarget.id) }))
      onDeleted?.(tripId)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err?.response?.data?.message || '삭제하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!tripId) return
    let ignore = false
    setState({ items: [], loading: true, error: false })
    setDraft('')
    setSubmitError('')
    setPlaces([])
    setPickerOpen(false)
    setEditingId(null)
    setEditDraft('')
    setEditPlaces([])
    setEditPickerOpen(false)
    setEditError('')
    setDeleteTarget(null)
    setDeleteError('')
    setPage(0)
    setHasMore(true)
    getTripFeedback(tripId, { page: 0, size: PAGE_SIZE })
      .then((res) => {
        if (ignore) return
        setState({ items: Array.isArray(res?.content) ? res.content : [], loading: false, error: false })
        setHasMore(!res?.last)
      })
      .catch(() => { if (!ignore) setState({ items: [], loading: false, error: true }) })
    return () => { ignore = true }
  }, [tripId])

  // 목록 끝(sentinel)이 보이면 다음 페이지를 이어붙인다 — 로딩 중/이미 불러오는 중/더 없음일 땐 무시.
  const loadMoreFeedback = useCallback(() => {
    if (!tripId || state.loading || loadingMore || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    getTripFeedback(tripId, { page: nextPage, size: PAGE_SIZE })
      .then((res) => {
        setState((s) => ({ ...s, items: [...s.items, ...(Array.isArray(res?.content) ? res.content : [])] }))
        setPage(nextPage)
        setHasMore(!res?.last)
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false))
  }, [tripId, state.loading, loadingMore, hasMore, page])

  // 드로어는 자체 스크롤 컨테이너(listRef)를 쓰므로, 관찰 기준(root)도 창이 아니라 그 컨테이너로 잡는다.
  useEffect(() => {
    const el = sentinelRef.current
    const root = listRef.current
    if (!el || !root || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreFeedback()
      },
      { root, rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMoreFeedback, hasMore])

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
      const created = await createFeedback(tripId, content, { recommendations: places.map((p) => p.contentId) })
      setState((s) => ({ ...s, items: [created, ...s.items] }))
      setDraft('')
      setPlaces([])
      setPickerOpen(false)
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

  function addPlace(place) {
    setPlaces((prev) => {
      if (prev.some((p) => p.contentId === place.contentId) || prev.length >= MAX_RECOMMENDATIONS) return prev
      return [...prev, place]
    })
  }

  async function handleCart(rec) {
    if (carted.has(rec.id)) return
    try {
      await addRecommendationToCart(tripId, rec.id)
      setCarted((s) => new Set(s).add(rec.id))
    } catch (err) {
      if (err?.response?.status === 409) setCarted((s) => new Set(s).add(rec.id))
    }
  }

  const count = state.items.length
  // 백엔드는 본인 계획에 참견을 막는다(TRIP_019). 작성자 id가 내려올 때만 미리 안내하고, 없으면 서버 응답(message)에 맡긴다.
  const isMine = !!(user && target?.ownerId && target.ownerId === user.userId)

  return (
    <>
      {open && <button aria-label="참견 패널 닫기" onClick={onClose} className="fixed inset-0 z-[57] cursor-default bg-slate-900/10" />}

      <aside
        aria-label="참견"
        className={`fixed top-16 bottom-0 right-0 z-[58] flex w-full max-w-[420px] flex-col bg-surface shadow-popup transition-transform duration-300 ${
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
                    <span key={count} className="ai-pop rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-500">
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
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                    <Icon icon="mdi:comment-text-outline" width={22} />
                  </span>
                  <p className="text-[13px] font-semibold text-slate-700">아직 참견이 없어요</p>
                  <p className="text-[12px] text-slate-400">이 계획에 첫 번째 참견을 남겨보세요.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {state.items.map((f, i) => {
                    const isAuthor = !!(user && f.author?.id && f.author.id === user.userId)
                    const editing = editingId === f.id
                    return (
                    <li
                      key={f.id ?? i}
                      className="animate-slide-in rounded-2xl border border-slate-100 bg-surface p-3.5 shadow-card"
                      style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        {/* 작성자 id가 있을 때만 프로필로 연결 — 없으면(탈퇴 등) 그냥 텍스트로 둔다 */}
                        {f.author?.id ? (
                          <Link to={`/profile/${f.author.id}`} className="flex min-w-0 items-center gap-2 hover:opacity-80">
                            <Avatar user={{ name: f.author?.name || '여행자', profileImageUrl: f.author?.profileImageUrl }} size={28} />
                            <span className="truncate text-[12.5px] font-bold text-slate-800">{f.author?.name || '여행자'}</span>
                          </Link>
                        ) : (
                          <>
                            <Avatar user={{ name: f.author?.name || '여행자', profileImageUrl: f.author?.profileImageUrl }} size={28} />
                            <span className="truncate text-[12.5px] font-bold text-slate-800">{f.author?.name || '여행자'}</span>
                          </>
                        )}
                        <span className={`shrink-0 text-[11px] text-slate-400 ${isAuthor && !editing ? '' : 'ml-auto'}`}>{formatDate(f.createdAt)}</span>
                        {/* 본인 글일 때만 수정 메뉴 — 지금은 삭제는 없이 수정만 */}
                        {isAuthor && !editing && (
                          <FeedbackItemMenu onEdit={() => startEdit(f)} onDelete={() => setDeleteTarget(f)} />
                        )}
                      </div>
                      {editing ? (
                        <div className="mt-2">
                          {/* 작성란과 같은 PlacePicker 재사용 — 새로 추가만 여기서, 기존 추천 삭제는 아래 "추천 장소" 카드에서 */}
                          {editPickerOpen && (
                            <PlacePicker user={user} selected={editPlaces} onPick={addEditPlace} onClose={() => setEditPickerOpen(false)} />
                          )}
                          <textarea
                            autoFocus
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_LENGTH))}
                            disabled={editSubmitting}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-surface p-2.5 text-[13px] text-slate-800 outline-none focus:border-brand disabled:text-slate-400"
                          />
                          {editError && <p className="mt-1.5 text-[12px] font-semibold text-rose-500">{editError}</p>}
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setEditPickerOpen((v) => !v)}
                              aria-expanded={editPickerOpen}
                              disabled={editSubmitting}
                              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                                editPickerOpen || editPlaces.length
                                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                                  : 'border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-500'
                              }`}
                            >
                              <Icon icon="solar:map-point-add-linear" width={13} />
                              장소 추천하기{editPlaces.length ? ` ${editPlaces.length}` : ''}
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={editSubmitting}
                                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-60"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdate(f)}
                                disabled={!editDraft.trim() || editSubmitting}
                                className="rounded-full bg-brand px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {editSubmitting ? '저장 중…' : '저장'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{f.content}</p>
                      )}
                      {editing ? (
                        // 수정 중엔 추천 장소 카드 자체가 편집 대상 — 담기 버튼 대신 삭제(X) 버튼을 보여준다
                        editPlaces.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-1.5" aria-label="추천 장소">
                            {editPlaces.map((p) => (
                              <li key={p.contentId} className="flex items-center gap-2.5 rounded-xl bg-rose-50/60 p-1.5 pr-2">
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                                  {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 text-[10.5px] font-bold text-rose-500">
                                    <Icon icon="solar:map-point-bold" width={11} />
                                    추천 장소
                                  </div>
                                  <div className="truncate text-[12.5px] font-bold text-slate-800">{p.title}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditPlaces((prev) => prev.filter((x) => x.contentId !== p.contentId))}
                                  aria-label={`${p.title} 추천에서 빼기`}
                                  className="shrink-0 rounded-full p-1 text-rose-300 transition-colors hover:text-rose-500"
                                >
                                  <Icon icon="mdi:close-circle" width={18} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        f.recommendations?.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-1.5" aria-label="추천 장소">
                            {f.recommendations.map((rec) => (
                              <li key={rec.id} className="flex items-center gap-2.5 rounded-xl bg-rose-50/60 p-1.5 pr-2">
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                                  {rec.imageUrl && <img src={rec.imageUrl} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 text-[10.5px] font-bold text-rose-500">
                                    <Icon icon="solar:map-point-bold" width={11} />
                                    추천 장소
                                  </div>
                                  <div className="truncate text-[12.5px] font-bold text-slate-800">{rec.title}</div>
                                </div>
                                {isMine && (
                                  <button
                                    type="button"
                                    onClick={() => handleCart(rec)}
                                    disabled={carted.has(rec.id)}
                                    className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                      carted.has(rec.id) ? 'bg-emerald-50 text-emerald-600' : 'bg-surface text-brand-dark shadow-card hover:bg-brand-light'
                                    }`}
                                  >
                                    <Icon icon={carted.has(rec.id) ? 'solar:cart-check-bold' : 'solar:cart-large-2-linear'} width={13} />
                                    {carted.has(rec.id) ? '담음' : '담기'}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </li>
                  )})}
                </ul>
              )}

              {/* 스크롤이 끝에 닿으면 다음 페이지를 이어붙이는 트리거 — 목록이 비어있거나 로딩 중일 땐 안 보인다 */}
              {!state.loading && !state.error && state.items.length > 0 && (
                <div ref={sentinelRef} className="flex h-8 items-center justify-center">
                  {loadingMore && <Icon icon="mdi:loading" width={16} className="animate-spin text-slate-300" />}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-surface p-4">
              {isMine ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                  <p className="text-[12.5px] text-slate-600">위 목록은 다른 여행자들이 남긴 참견이에요.</p>
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
                  {pickerOpen && (
                    <PlacePicker
                      user={user}
                      selected={places}
                      onPick={addPlace}
                      onClose={() => setPickerOpen(false)}
                    />
                  )}
                  {places.length > 0 && (
                    <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="추천할 장소">
                      {places.map((p) => (
                        <li key={p.contentId} className="flex items-center gap-1.5 rounded-full bg-rose-50 py-1 pl-1 pr-2 text-[11.5px] font-bold text-rose-600">
                          <span className="h-5 w-5 overflow-hidden rounded-full bg-slate-200">
                            {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
                          </span>
                          <span className="max-w-[140px] truncate">{p.title}</span>
                          <button
                            type="button"
                            onClick={() => setPlaces((prev) => prev.filter((x) => x.contentId !== p.contentId))}
                            aria-label={`${p.title} 추천에서 빼기`}
                            className="text-rose-300 transition-colors hover:text-rose-500"
                          >
                            <Icon icon="mdi:close-circle" width={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div
                    className={`rounded-2xl border bg-surface transition-colors ${
                      submitting ? 'border-slate-200' : 'border-slate-200 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-500/10'
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
                    <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPickerOpen((v) => !v)}
                          aria-expanded={pickerOpen}
                          disabled={submitting}
                          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                            pickerOpen || places.length
                              ? 'border-rose-200 bg-rose-50 text-rose-600'
                              : 'border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-500'
                          }`}
                        >
                          <Icon icon="solar:map-point-add-linear" width={13} />
                          장소 추천하기{places.length ? ` ${places.length}` : ''}
                        </button>
                        <span className="text-[11px] text-slate-300">{draft.length}/{MAX_LENGTH}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!draft.trim() || submitting}
                        className="flex items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-rose-500"
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

      {deleteTarget && (
        <DeleteFeedbackDialog
          deleting={deleting}
          error={deleteError}
          onCancel={() => {
            setDeleteTarget(null)
            setDeleteError('')
          }}
          onConfirm={handleDelete}
        />
      )}
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

// 추천 장소 고르기 — 관광지 검색(TourAPI) 또는 내 장바구니에서 골라 참견에 붙인다. 최대 5곳.
function PlacePicker({ user, selected, onPick, onClose }) {
  const [tab, setTab] = useState('search') // 'search' | 'cart'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ items: [], loading: false, searched: false })
  const [cart, setCart] = useState({ items: [], loading: false, loaded: false })
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 입력을 멈춘 뒤에만 검색 — 외부 TourAPI를 거치는 호출이라 타이핑마다 바로 쏘지 않는다
  useEffect(() => {
    const keyword = query.trim()
    if (!keyword) {
      setResults({ items: [], loading: false, searched: false })
      return
    }
    let ignore = false
    setResults((r) => ({ ...r, loading: true }))
    const timer = setTimeout(() => {
      getTourContents({ keyword, size: 8, page: 1, arrange: 'O' })
        .then((data) => { if (!ignore) setResults({ items: data.items || [], loading: false, searched: true }) })
        .catch(() => { if (!ignore) setResults({ items: [], loading: false, searched: true }) })
    }, 350)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    if (tab !== 'cart' || cart.loaded || !user) return
    let ignore = false
    setCart((c) => ({ ...c, loading: true }))
    getCartItems()
      .then((items) => { if (!ignore) setCart({ items, loading: false, loaded: true }) })
      .catch(() => { if (!ignore) setCart({ items: [], loading: false, loaded: true }) })
    return () => { ignore = true }
  }, [tab, cart.loaded, user])

  const full = selected.length >= MAX_RECOMMENDATIONS
  const isPicked = (contentId) => selected.some((p) => p.contentId === contentId)
  const list = tab === 'search' ? results.items : cart.items
  const loading = tab === 'search' ? results.loading : cart.loading

  return (
    <div className="nav-pop mb-2 rounded-2xl border border-rose-100 bg-surface p-3 shadow-card">
      <div className="flex items-center gap-2">
        <div className="flex rounded-full bg-slate-100 p-0.5 text-[11.5px] font-bold">
          {[
            { key: 'search', label: '검색', icon: 'solar:magnifer-linear' },
            { key: 'cart', label: '내 장바구니', icon: 'solar:cart-large-2-linear' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${
                tab === t.key ? 'bg-surface text-rose-600 shadow-card' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon icon={t.icon} width={12} />
              {t.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-slate-400">{selected.length}/{MAX_RECOMMENDATIONS}</span>
        <button type="button" onClick={onClose} aria-label="장소 고르기 닫기" className="text-slate-400 transition-colors hover:text-slate-600">
          <Icon icon="mdi:close" width={16} />
        </button>
      </div>

      {tab === 'search' && (
        <div className="mt-2 flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 transition-colors focus-within:border-rose-400">
          <Icon icon="solar:magnifer-linear" width={14} className="shrink-0 text-slate-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="추천할 관광지, 맛집, 카페 이름"
            className="h-full w-full text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기" className="text-slate-300 hover:text-slate-500">
              <Icon icon="mdi:close-circle" width={14} />
            </button>
          )}
        </div>
      )}

      <div className="mt-2 max-h-52 overflow-y-auto">
        {loading ? (
          <ul className="flex flex-col gap-1" role="status" aria-label="장소를 찾는 중">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-2.5 p-1.5">
                <Skeleton className="h-10 w-10 rounded-lg" style={{ animationDelay: `${i * 80}ms` }} />
                <div className="flex-1">
                  <Skeleton className="h-3 w-2/3" style={{ animationDelay: `${i * 80 + 40}ms` }} />
                  <Skeleton className="mt-1.5 h-2.5 w-1/3" style={{ animationDelay: `${i * 80 + 80}ms` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : tab === 'cart' && !user ? (
          <p className="px-1 py-6 text-center text-[12px] text-slate-400">로그인하면 장바구니에서 고를 수 있어요.</p>
        ) : list.length === 0 ? (
          <p className="px-1 py-6 text-center text-[12px] text-slate-400">
            {tab === 'cart' ? '장바구니가 비어 있어요.' : results.searched ? '검색 결과가 없어요.' : '이름으로 검색해 추천할 장소를 골라보세요.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {list.map((place) => {
              const picked = isPicked(place.contentId)
              return (
                <li key={place.contentId}>
                  <button
                    type="button"
                    disabled={picked || full}
                    onClick={() => onPick({ contentId: place.contentId, title: place.title, address: place.address, imageUrl: place.imageUrl })}
                    className={`flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors ${
                      picked ? 'bg-rose-50' : full ? 'opacity-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                      {place.imageUrl && <img src={place.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-bold text-slate-800">{place.title}</div>
                      <div className="truncate text-[11px] text-slate-400">{place.address ? shortRegion(place.address) : ''} {place.address || ''}</div>
                    </div>
                    <Icon
                      icon={picked ? 'solar:check-circle-bold' : 'solar:add-circle-linear'}
                      width={18}
                      className={`shrink-0 ${picked ? 'text-rose-500' : 'text-slate-300'}`}
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
