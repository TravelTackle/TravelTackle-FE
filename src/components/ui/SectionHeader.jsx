import { useLanguage } from '../../i18n'

const T = {
  ko: { more: '더보기' },
  en: { more: 'More' },
}

export default function SectionHeader({ title, moreHref = '#' }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[19px] font-bold text-slate-900">{title}</h2>
      <a href={moreHref} className="text-[12.5px] font-semibold text-slate-400 hover:text-slate-700 transition-all">{copy.more} &gt;</a>
    </div>
  )
}
