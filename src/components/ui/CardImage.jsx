import { useRef, useEffect, useState } from 'react'
import Skeleton from './Skeleton'
import { Icon } from '@iconify/react'

// 이미지가 없거나 불러오지 못했을 때 카드 사진 자리에 보여주는 안내. 부모가 크기를 정한다(absolute inset-0 또는 h-full)
export function ImagePlaceholder({ className = '', label = '이미지 준비 중이에요', compact = false }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-50 to-slate-200 text-slate-400 ${className}`}
    >
      <Icon icon="solar:gallery-linear" width={compact ? 18 : 22} className="text-slate-300" />
      {!compact && <span className="text-[11px] font-semibold">{label}</span>}
    </div>
  )
}

// src별로 로딩 상태를 분리해 사진이 바뀌면 스켈레톤부터 다시 표시한다.
export default function CardImage(props) {
  return <LoadingCardImage key={props.src || 'empty'} {...props} />
}

function LoadingCardImage({ src, alt = '', className = '', imgClassName = '', compact = false, onLoad, onError, ...props }) {
  const [status, setStatus] = useState('loading')
  const imageRef = useRef(null)

  useEffect(() => {
    const image = imageRef.current
    if (image?.complete) setStatus(image.naturalWidth > 0 ? 'loaded' : 'error')
  }, [])

  if (!src || status === 'error') {
    return (
      <div className={className}>
        <ImagePlaceholder compact={compact} />
      </div>
    )
  }

  return (
    <span className={`block overflow-hidden ${className}`} aria-busy={status === 'loading'}>
      <span className="relative block h-full w-full">
        {status === 'loading' && <Skeleton className="absolute inset-0 h-full w-full rounded-none motion-reduce:animate-none" />}
        <img
          {...props}
          ref={imageRef}
          src={src}
          alt={alt}
          loading={props.loading ?? 'lazy'}
          onLoad={(event) => {
            setStatus('loaded')
            onLoad?.(event)
          }}
          onError={(event) => {
            setStatus('error')
            onError?.(event)
          }}
          className={`h-full w-full object-cover ${imgClassName} ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          style={{ ...props.style, transitionProperty: 'opacity, transform', transitionDuration: '400ms' }}
        />
      </span>
    </span>
  )
}
