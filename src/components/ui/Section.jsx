export default function Section({ as: As = 'section', padding = 'px-6', className = '', children, ...props }) {
  return (
    <As className={`w-full max-w-[1180px] mx-auto ${padding} ${className}`} {...props}>
      {children}
    </As>
  )
}
