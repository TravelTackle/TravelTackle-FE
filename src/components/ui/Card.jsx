export default function Card({ as: As = 'div', shadow = false, className = '', children, ...props }) {
  const shadowClass = shadow ? 'shadow-card hover:shadow-card-hover' : ''
  return (
    <As className={`lift bg-surface border border-slate-100 rounded-2xl ${shadowClass} ${className}`} {...props}>
      {children}
    </As>
  )
}
