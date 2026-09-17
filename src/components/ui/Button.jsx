const VARIANTS = {
  solid: 'bg-brand text-white hover:bg-brand-dark',
  invert: 'bg-surface text-brand-dark hover:bg-slate-50',
  light: 'bg-brand-light text-brand-dark hover:bg-teal-100',
}

export default function Button({ as: As = 'button', variant = 'solid', className = '', children, ...props }) {
  return (
    <As className={`transition-all ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </As>
  )
}
