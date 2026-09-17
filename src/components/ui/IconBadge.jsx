export default function IconBadge({ as: As = 'div', className = '', children, ...props }) {
  return (
    <As className={`flex items-center justify-center ${className}`} {...props}>
      {children}
    </As>
  )
}
