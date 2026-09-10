import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import Section from './ui/Section'
import Skeleton from './ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { createFeedback, getTripFeedback } from '../api/feed'
import { saveTrip } from '../api/trip'
import { formatDate, formatDay } from '../lib/homeFormat'

const DAYS_PER_VIEW = 4
const PLACES_PER_DAY = 3
const RECENT_FEEDBACK = 3
const QUICK = ['동선이 좋아요 👍', '여기도 가보세요 📍', '시간이 촉박해보여요 ⏱️']

// 피드를 못 불러왔을 때 보여주는 예시 계획 — id가 없어 참견은 저장되지 않는다
const SAMPLE_PLAN = {
  id: null,
  title: '제주 서쪽 감성 로드',
  user: { nickname: '예시 여행자' },
  startDate: '2026-07-06',
  endDate: '2026-07-09',
  duration: '3박 4일',
  placeCount: 7,
  feedbackCount: 0,
  days: [
    { id: 'd1', day: 1, date: '2026-07-06', places: [{ name: '협재해수욕장' }, { name: '애월 카페거리' }] },
    { id: 'd2', day: 2, date: '2026-07-07', places: [{ name: '한림공원' }, { name: '한담 해안산책로' }] },
    { id: 'd3', day: 3, date: '2026-07-08', places: [{ name: '협재 흑돼지거리' }] },
    { id: 'd4', day: 4, date: '2026-07-09', places: [{ name: '공항 이동' }, { name: '기념품 쇼핑' }] },
  ],
}

function formatRange(start, end) {
  const a = formatDay(start)
  const b = formatDay(end)
  if (!a || !b) return ''
  return `${a} ~ ${b}`
}

function DayCard({ day }) {
  const extra = day.places.length - PLACES_PER_DAY
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-2.5 min-w-0 sm:flex-1">
      <div className="text-[10px] font-bold text-slate-400">Day {day.day}</div>
      <div className="text-[12px] font-bold text-slate-700 mb-2 truncate">{formatDay(day.date) || ' '}</div>
      <div className="flex flex-col gap-1">
        {day.places.slice(0, PLACES_PER_DAY).map((p, i) => (
          <div key={`${p.name}-${i}`} className="flex items-center gap-1 bg-brand rounded-md px-1.5 py-1">
            <Icon icon="solar:map-point-bold" width={10} color="white" className="shrink-0" />
            <span className="text-[10.5px] font-bold text-white truncate">{p.name}</span>
          </div>
        ))}
        {extra > 0 && <div className="text-[10.5px] font-semibold text-slate-400 px-1">+{extra}곳 더</div>}
        {day.places.length === 0 && <div className="text-[10.5px] text-slate-300 px-1">비어 있어요</div>}
      </div>
    </div>
  )
}

function PanelSkeleton({ composer }) {
  return (
    <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-56" />
      {composer ? (
        <>
          <Skeleton className="mt-5 h-4 w-44" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-[88px] w-full rounded-2xl" />
          <div className="mt-3 flex justify-end">
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: DAYS_PER_VIEW }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-2.5">
              <Skeleton className="h-2.5 w-10" />
              <Skeleton className="mt-1.5 h-3 w-16" />
              <Skeleton className="mt-3 h-6 w-full rounded-md" />
              <Skeleton className="mt-1 h-6 w-4/5 rounded-md" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ParticipateSection({ feed }) {
  const { user } = useAuth()
  const plans = useMemo(() => feed.items.filter((i) => i.type === 'plan' && i.days.length > 0), [feed.items])

  const [planIdx, setPlanIdx] = useState(0)
  const [dayStart, setDayStart] = useState(0)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null) // { tone: 'ok' | 'err', message, login? }
  const [added, setAdded] = useState({}) // 이 세션에서 남긴 참견 수 (tripId → n)
  const [recent, setRecent] = useState({ items: [], loading: false }) // 이 계획의 최근 참견
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState({}) // 이 세션에서 내 여행으로 담은 계획

  const plan = plans.length ? plans[planIdx % plans.length] : SAMPLE_PLAN
  const isSample = plan === SAMPLE_PLAN
  const days = plan.days
  const canPageDays = days.length > DAYS_PER_VIEW
  const visibleDays = days.slice(dayStart, dayStart + DAYS_PER_VIEW)
  const feedbackCount = plan.feedbackCount + (added[plan.id] ?? 0)
  const saved = Boolean(savedIds[plan.id])

  // 계획이 바뀔 때마다 그 계획에 달린 최근 참견을 불러온다
  useEffect(() => {
    if (!plan.id) {
      setRecent({ items: [], loading: false })
      return undefined
    }
    let ignore = false
    setRecent({ items: [], loading: true })
    getTripFeedback(plan.id, { page: 0, size: RECENT_FEEDBACK })
      .then((page) => {
        if (!ignore) setRecent({ items: page.content || [], loading: false })
      })
      .catch(() => {
        if (!ignore) setRecent({ items: [], loading: false })
      })
    return () => {
      ignore = true
    }
  }, [plan.id])

  async function handleSave() {
    if (saving || saved) return
    if (isSample) {
      setNotice({ tone: 'err', message: '예시 계획은 담을 수 없어요.' })
      return
    }
    if (!user) {
      setNotice({ tone: 'err', message: '로그인 후 내 여행으로 담을 수 있어요.', login: true })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      await saveTrip(plan.id)
      setSavedIds((c) => ({ ...c, [plan.id]: true }))
      setNotice({ tone: 'ok', message: '내 여행으로 담았어요.', trips: true })
    } catch (err) {
      const status = err.response?.status
      setNotice(
        status === 401
          ? { tone: 'err', message: '로그인 후 내 여행으로 담을 수 있어요.', login: true }
          : status === 409
            ? { tone: 'err', message: '이미 내 여행에 담긴 계획이에요.', trips: true }
            : { tone: 'err', message: '계획을 담지 못했어요. 잠시 후 다시 시도해주세요.' },
      )
    } finally {
      setSaving(false)
    }
  }

  function showNextPlan() {
    setPlanIdx((i) => i + 1)
    setDayStart(0)
    setText('')
    setNotice(null)
  }

  function shiftDays(direction) {
    setDayStart((s) => Math.min(Math.max(0, s + direction * DAYS_PER_VIEW), days.length - DAYS_PER_VIEW))
  }

  async function submit() {
    const content = text.trim()
    if (!content || sending) return
    if (isSample) {
      setNotice({ tone: 'err', message: '예시 계획이라 참견을 남길 수 없어요. 여행자 피드에서 실제 계획을 골라보세요.' })
      return
    }
    if (!user) {
      setNotice({ tone: 'err', message: '로그인 후 참견을 남길 수 있어요.', login: true })
      return
    }
    setSending(true)
    setNotice(null)
    try {
      const created = await createFeedback(plan.id, content)
      setText('')
      setAdded((c) => ({ ...c, [plan.id]: (c[plan.id] ?? 0) + 1 }))
      if (created?.id) setRecent((r) => ({ ...r, items: [created, ...r.items].slice(0, RECENT_FEEDBACK) }))
      setNotice({ tone: 'ok', message: '참견을 남겼어요. 여행자에게 바로 전달됐어요.' })
    } catch (err) {
      const status = err.response?.status
      setNotice(
        status === 401
          ? { tone: 'err', message: '로그인 후 참견을 남길 수 있어요.', login: true }
          : status === 403
            ? { tone: 'err', message: '이 계획에는 참견을 남길 수 없어요.' }
            : { tone: 'err', message: '참견을 남기지 못했어요. 잠시 후 다시 시도해주세요.' },
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Section as="section" id="participate" className="py-14 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-[22px] font-bold text-slate-900 text-balance">
          다른 여행자의 계획에 직접 <span className="text-brand font-extrabold">참견</span>해보세요
        </h2>
        <button
          type="button"
          onClick={showNextPlan}
          disabled={feed.loading || plans.length < 2}
          className="shrink-0 flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3.5 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:hover:bg-white"
        >
          <Icon icon="solar:refresh-linear" width={14} /> 다른 계획 보기
        </button>
      </div>

      {feed.loading ? (
        <div className="grid md:grid-cols-2 gap-4" role="status" aria-label="여행 계획을 불러오는 중">
          <PanelSkeleton />
          <PanelSkeleton composer />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* 왼쪽: Day별 일정 */}
          <div key={plan.id ?? 'sample'} className="animate-slide-in bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-slate-900 truncate">{plan.title}</div>
                <div className="text-[11.5px] text-slate-400 mt-0.5">{formatRange(plan.startDate, plan.endDate)}</div>
              </div>
              {canPageDays && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => shiftDays(-1)}
                    disabled={dayStart === 0}
                    className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
                    aria-label="이전 날짜 보기"
                  >
                    <Icon icon="solar:alt-arrow-left-linear" width={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftDays(1)}
                    disabled={dayStart + DAYS_PER_VIEW >= days.length}
                    className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
                    aria-label="다음 날짜 보기"
                  >
                    <Icon icon="solar:alt-arrow-right-linear" width={13} />
                  </button>
                </div>
              )}
            </div>

            {/* 날짜가 4일 미만이어도 빈 칸 없이 폭을 나눠 갖도록 sm 이상에서는 flex */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
              {visibleDays.map((d) => (
                <DayCard key={d.id ?? d.day} day={d} />
              ))}
            </div>

            {canPageDays && (
              <div className="mt-3 text-[11px] font-semibold text-slate-400 tabular-nums">
                Day {dayStart + 1}–{Math.min(dayStart + DAYS_PER_VIEW, days.length)} / 총 {days.length}일
              </div>
            )}
          </div>

          {/* 오른쪽: 참견 입력 */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-extrabold text-slate-900">이 계획, 어떻게 생각하세요?</h3>
                <div className="text-[11.5px] text-slate-400 mt-0.5 truncate">
                  {plan.user.nickname} · {plan.duration} · 장소 {plan.placeCount}곳
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 text-brand text-[11px] font-bold tabular-nums">
                  <Icon icon="solar:chat-round-dots-bold" width={13} /> 참견 {feedbackCount}
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || saved}
                  aria-pressed={saved}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${
                    saved
                      ? 'border-brand/30 bg-brand-light text-brand'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand disabled:opacity-60'
                  }`}
                >
                  <Icon icon={saved ? 'solar:bookmark-bold' : 'solar:bookmark-linear'} width={13} />
                  {saved ? '담았어요' : saving ? '담는 중…' : '내 여행으로 담기'}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setText((t) => (t ? t + ' ' : '') + q)}
                  className="bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[11.8px] font-semibold text-slate-600 hover:border-brand hover:text-brand transition-all"
                >
                  {q}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="participate-text">참견 내용</label>
            <textarea
              id="participate-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="직접 참견을 남겨보세요"
              rows={3}
              maxLength={2000}
              disabled={sending}
              className="mt-4 w-full resize-none bg-white border border-slate-200 rounded-2xl p-3 text-[13px] text-slate-700 placeholder-slate-400 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all disabled:opacity-60"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p
                role="status"
                aria-live="polite"
                className={`min-w-0 text-[12px] font-semibold ${notice?.tone === 'ok' ? 'text-emerald-600' : 'text-rose-500'}`}
              >
                {notice?.message}
                {notice?.login && (
                  <>
                    {' '}
                    <Link to="/login" className="underline underline-offset-2 text-brand">로그인하기</Link>
                  </>
                )}
                {notice?.trips && (
                  <>
                    {' '}
                    <Link to="/trips" className="underline underline-offset-2 text-brand">나의 여행 보기</Link>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={submit}
                disabled={sending || !text.trim()}
                className="shrink-0 bg-brand hover:bg-brand-dark text-white text-[12.5px] font-bold rounded-xl px-5 py-2.5 transition-all disabled:opacity-40 disabled:hover:bg-brand"
              >
                {sending ? '남기는 중…' : '참견 남기기'}
              </button>
            </div>

            {/* 이 계획에 먼저 달린 참견 */}
            {recent.loading ? (
              <ul className="mt-4 flex flex-col gap-2 border-t border-slate-200/70 pt-4" role="status" aria-label="참견을 불러오는 중">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex gap-2.5">
                    <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="mt-1.5 h-3 w-5/6" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : recent.items.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2.5 border-t border-slate-200/70 pt-4" aria-label="최근 참견">
                {recent.items.map((f) => (
                  <li key={f.id} className="flex gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                      <Icon icon="solar:user-bold" width={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5 text-[11px]">
                        <span className="font-bold text-slate-700 truncate">{f.author?.name || '여행자'}</span>
                        <span className="shrink-0 text-slate-400">{formatDate(f.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600 line-clamp-2">{f.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : !isSample ? (
              <p className="mt-4 border-t border-slate-200/70 pt-4 text-[11.5px] text-slate-400">
                아직 참견이 없어요. 첫 번째 참견을 남겨보세요.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </Section>
  )
}
