// 로딩 중 자리 표시 블록. 크기/모서리는 className으로 지정 (예: "h-3 w-2/3", "h-14 w-14 rounded-xl")
export default function Skeleton({ className = '', ...props }) {
  return <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} {...props} />
}
