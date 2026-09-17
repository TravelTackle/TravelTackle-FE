import { useState } from 'react'
import { Icon } from '@iconify/react'
import Button from '../ui/Button'

const MAX_LENGTH = 100

// TripCreateModal과 동일한 오버레이+카드 패턴 — 계획을 전체공개로 바꿀 때(또는 이미 공개된 계획의
// 코멘트만 다시 바꿀 때) 한 줄 코멘트를 받는다. 비워서 게시해도 되고(건너뛰기), 나중에 다시 열어 바꿀 수도 있다.
export default function PublishCommentModal({ initialComment = '', editing = false, onClose, onSubmit }) {
  const [comment, setComment] = useState(initialComment)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    Promise.resolve(onSubmit(comment.trim())).catch(() => {
      setSubmitting(false)
      setError('저장하지 못했어요. 다시 시도해주세요.')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-[380px] rounded-2xl bg-surface p-6 shadow-popup" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-slate-800">{editing ? '코멘트 수정' : '전체공개로 바꿀까요?'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="닫기">
            <Icon icon="solar:close-circle-linear" width={22} />
          </button>
        </div>
        <p className="mb-4 text-[12.5px] text-slate-500">
          여행자 피드에 제목 아래로 보여줄 한 줄 코멘트를 남겨보세요. 선택 사항이에요.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="block">
            <input
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="예: 여유롭게 다녀온 2박3일 코스예요"
              className="h-12 w-full rounded-xl border border-slate-200 bg-surface px-4 text-[14px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand"
            />
          </label>
          <span className="self-end text-[11px] text-slate-300">{comment.length}/{MAX_LENGTH}</span>

          {error && <p className="text-[12px] text-rose-500">{error}</p>}

          <div className="mt-2 flex gap-2">
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setSubmitting(true)
                  Promise.resolve(onSubmit('')).catch(() => {
                    setSubmitting(false)
                    setError('게시하지 못했어요. 다시 시도해주세요.')
                  })
                }}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-[13.5px] font-bold text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                건너뛰기
              </button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl font-bold disabled:opacity-50"
            >
              {submitting && <Icon icon="mdi:loading" width={16} className="animate-spin" />}
              {submitting ? '저장 중' : editing ? '저장' : '게시하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
