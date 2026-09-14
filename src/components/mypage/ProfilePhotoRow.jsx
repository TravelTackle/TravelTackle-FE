import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Cropper from 'react-easy-crop'
import { Avatar } from '../Navbar'
import { getCroppedImg } from '../travelerFeed/cropImage'
import { profileImageErrorMessage, removeProfileImage, updateProfileImage } from '../../api/auth'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/**
 * 계정 설정 > 프로필 사진 행. 사진 고르기 → 원형 크롭 → 업로드(PUT /auth/me/profile-image) / 삭제(DELETE).
 * 응답이 CurrentUserResponse 전체라 onUpdated로 그대로 setUser에 넣는다.
 */
export default function ProfilePhotoRow({ user, nickname, onUpdated, onError }) {
  const inputRef = useRef(null)
  const [pending, setPending] = useState(null) // { url } — 크롭 중인 원본
  const [busy, setBusy] = useState(false) // 업로드·삭제 중
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const hasImage = Boolean(user?.profileImageUrl)

  // 크롭 취소·완료 후 원본 object URL 해제
  useEffect(() => () => pending?.url && URL.revokeObjectURL(pending.url), [pending])

  function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPT.includes(file.type)) return onError?.('jpeg, png, webp 사진만 올릴 수 있어요.')
    if (file.size > MAX_BYTES) return onError?.('사진은 10MB까지 올릴 수 있어요.')
    setPending({ url: URL.createObjectURL(file) })
  }

  async function upload(blob) {
    setBusy(true)
    try {
      const file = new File([blob], 'profile.jpg', { type: blob.type || 'image/jpeg' })
      const me = await updateProfileImage(file)
      onUpdated?.(me, '프로필 사진을 변경했어요')
    } catch (err) {
      onError?.(profileImageErrorMessage(err))
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  async function remove() {
    setConfirmingDelete(false)
    setBusy(true)
    try {
      const me = await removeProfileImage()
      onUpdated?.(me, '프로필 사진을 삭제했어요')
    } catch (err) {
      onError?.(err?.response?.data?.message || '프로필 사진을 삭제하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="relative">
        <Avatar user={{ ...user, name: nickname }} size={56} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white" role="status" aria-label="저장 중">
            <Icon icon="solar:refresh-linear" width={20} className="ai-spin" />
          </span>
        )}
      </div>
      <input ref={inputRef} type="file" accept={ACCEPT.join(',')} className="hidden" onChange={pick} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
      >
        <Icon icon="solar:camera-linear" width={14} />
        {hasImage ? '사진 변경' : '사진 올리기'}
      </button>
      {hasImage &&
        (confirmingDelete ? (
          <span className="flex items-center gap-2 text-[12px]">
            <span className="text-slate-500">기본 이미지로 돌릴까요?</span>
            <button type="button" onClick={remove} className="font-bold text-rose-500 hover:text-rose-600">
              삭제
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="font-semibold text-slate-400 hover:text-slate-600">
              취소
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
            className="text-[12px] font-semibold text-slate-400 transition-colors hover:text-rose-500 disabled:opacity-50"
          >
            삭제
          </button>
        ))}
      <p className="w-full text-[11.5px] text-slate-400">jpeg · png · webp, 10MB 이하. 정사각형으로 잘라 올려요.</p>

      {pending && <CropModal imageUrl={pending.url} busy={busy} onCancel={() => setPending(null)} onConfirm={upload} />}
    </>
  )
}

// 원형 크롭 — RecordUploadModal의 크롭 화면과 같은 부품(react-easy-crop)을 1:1 원형으로
function CropModal({ imageUrl, busy, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  async function confirm() {
    if (!area) return
    const { blob } = await getCroppedImg(imageUrl, area)
    onConfirm(blob)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="프로필 사진 자르기">
      <div className="nav-pop w-full max-w-[420px] overflow-hidden rounded-3xl bg-surface shadow-popup ring-1 ring-black/5">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-[15px] font-extrabold text-slate-900">프로필 사진 자르기</h3>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon icon="solar:close-circle-linear" width={18} />
          </button>
        </div>
        <div className="relative h-[320px] w-full bg-black">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, px) => setArea(px)}
          />
        </div>
        <div className="flex items-center gap-3 px-5 py-3">
          <Icon icon="mdi:image-size-select-small" width={16} className="shrink-0 text-slate-400" />
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-brand" aria-label="확대" />
          <Icon icon="mdi:image-size-select-large" width={18} className="shrink-0 text-slate-400" />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-full px-4 py-2 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            취소
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !area}
            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy && <Icon icon="solar:refresh-linear" width={14} className="ai-spin" />}
            {busy ? '올리는 중…' : '이 사진으로'}
          </button>
        </div>
      </div>
    </div>
  )
}
