export default function Chip({ as: As = 'span', className = '', children, ...props }) {
  return (
    <As className={`rounded-full ${className}`} {...props}>
      {children}
    </As>
  )
}
