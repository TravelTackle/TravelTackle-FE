import logoIcon from '../../assets/logo-icon.svg'

export default function IntroPanel() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-brand-light via-surface to-teal-50 flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle, #0D9488 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />

      <div className="relative text-center px-10 max-w-[420px]">
        <img
          src={logoIcon}
          alt=""
          className="w-52 h-52 mx-auto mb-8 animate-float drop-shadow-[0_24px_40px_rgba(13,148,136,0.28)]"
        />
        <h1 className="text-[30px] leading-[1.3] font-extrabold tracking-tight text-slate-900">
          여행의 시작부터 완성까지,
          <br />
          우리의 <span className="text-brand">참견</span>이 여행이 됩니다
        </h1>
      </div>
    </div>
  )
}
