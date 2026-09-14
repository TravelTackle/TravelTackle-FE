import { useEffect, useState } from 'react'

function initialOf(user) {
  const source = user?.name || user?.nickname || user?.email || ''
  return source.trim().charAt(0).toUpperCase() || '·'
}

// 아바타 — 프로필 사진(profileImageUrl)이 있으면 그 사진, 없거나 못 불러오면 이름 첫 글자를 브랜드 그라디언트 원 안에.
// user는 { name | nickname | email, profileImageUrl } 모양이면 뭐든 된다(내 정보, 피드 작성자, 참견 작성자, 알림 행위자).
export default function Avatar({ user, size = 28, className = '' }) {
  const src = user?.profileImageUrl || null
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const showImage = src && !failed
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold text-white ring-2 ring-surface ${
        showImage ? 'bg-slate-100' : 'bg-gradient-to-br from-brand to-brand-mid'
      } ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {showImage ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : initialOf(user)}
    </span>
  )
}
