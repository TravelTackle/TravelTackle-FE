// maxWidth: 탑바(Navbar) 컨테이너와 좌우 끝을 맞춰야 하는 페이지는 'max-w-[1200px]'을 넘긴다
export default function Section({ as: As = 'section', padding = 'px-6', maxWidth = 'max-w-[1180px]', className = '', children, ...props }) {
  return (
    <As className={`w-full ${maxWidth} mx-auto ${padding} ${className}`} {...props}>
      {children}
    </As>
  )
}
