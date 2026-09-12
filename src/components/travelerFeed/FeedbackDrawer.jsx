import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Skeleton from '../ui/Skeleton'
import { useAuth } from '../../context/AuthContext'
import { addRecommendationToCart, createFeedback, getTripFeedback } from '../../api/feed'
import { getTourContents } from '../../api/tour'
import { getCartItems } from '../../api/cart'
import { formatDate, shortRegion } from '../../lib/homeFormat'

const MAX_LENGTH = 2000
const PAGE_SIZE = 30
const MAX_RECOMMENDATIONS = 5

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
  const [places, setPlaces] = useState([]) // 추천할 장소 [{ contentId, title, address, imageUrl }]
  const [pickerOpen, setPickerOpen] = useState(false)
  const [carted, setCarted] = useState(() => new Set()) // 이 세션에서 장바구니에 담은 추천 id
  const listRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!tripId) return
    let ignore = false
    setState({ items: [], loading: true, error: false })
    setDraft('')
    setSubmitError('')
    setPlaces([])
    setPickerOpen(false)
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
                      {f.recommendations?.length > 0 && (
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
                                    carted.has(rec.id) ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-brand-dark shadow-card hover:bg-brand-light'
                                  }`}
                                >
                                  <Icon icon={carted.has(rec.id) ? 'solar:cart-check-bold' : 'solar:cart-large-2-linear'} width={13} />
                                  {carted.has(rec.id) ? '담음' : '담기'}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
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
                    className={`rounded-2xl border bg-white transition-colors ${
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
    <div className="nav-pop mb-2 rounded-2xl border border-rose-100 bg-white p-3 shadow-card">
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
                tab === t.key ? 'bg-white text-rose-600 shadow-card' : 'text-slate-500 hover:text-slate-700'
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
