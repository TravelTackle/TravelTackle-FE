import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from '../../i18n'

const LABEL = {
  ko: '이미지 준비 중이에요',
  en: 'Image coming soon',
}

// 이미지가 없거나 불러오지 못했을 때 카드 사진 자리에 보여주는 안내. 부모가 크기를 정한다(absolute inset-0 또는 h-full)
export function ImagePlaceholder({ className = '', label, compact = false }) {
  const { language } = useLanguage()
  const text = label ?? (LABEL[language] ?? LABEL.en)
  return (
    <div
      role="img"
      aria-label={text}
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-50 to-slate-200 text-slate-400 ${className}`}
    >
      <Icon icon="solar:gallery-linear" width={compact ? 18 : 22} className="text-slate-300" />
      {!compact && <span className="text-[11px] font-semibold">{text}</span>}
    </div>
  )
}

// 카드용 이미지 — src가 없거나 로드에 실패하면 ImagePlaceholder로 바뀐다.
// className은 <img>와 자리 표시 둘 다에 적용되는 크기/위치 클래스(예: "absolute inset-0 h-full w-full"), imgClassName은 <img>에만(예: hover 확대)
export default function CardImage({ src, alt = '', className = '', imgClassName = '', compact = false, ...props }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src]) // src가 바뀌면 다시 시도

  if (!src || failed) {
    return (
      <div className={className}>
        <ImagePlaceholder compact={compact} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className} ${imgClassName}`}
      {...props}
    />
  )
}
