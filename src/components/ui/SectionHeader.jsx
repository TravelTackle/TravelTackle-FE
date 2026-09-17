export default function SectionHeader({ title, moreHref = '#' }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[19px] font-bold text-slate-900">{title}</h2>
      <a href={moreHref} className="text-[12.5px] font-semibold text-slate-400 hover:text-slate-700 transition-all">더보기 &gt;</a>
    </div>
  )
}
