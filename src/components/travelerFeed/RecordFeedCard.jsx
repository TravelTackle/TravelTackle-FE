import Card from '../ui/Card'
import { FeedUserHeader, FeedActionBar } from './FeedCardChrome'

export default function RecordFeedCard({ item, onOpen }) {
  return (
    <Card
      as="div"
      role="button"
      tabIndex={0}
      shadow
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(item)
      }}
      className="cursor-pointer p-4 text-left"
    >
      <FeedUserHeader item={item} />

      {/* 가로 사진은 4:3, 세로 사진은 계획 카드 썸네일과 같은 4:5로 맞춰 폭에 비례해 스케일 */}
      <div
        className={`relative mt-3 w-full overflow-hidden rounded-2xl bg-slate-200 ${
          item.orientation === 'portrait' ? 'aspect-[4/5]' : 'aspect-[4/3]'
        }`}
      >
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>

      <div className="mt-3 text-[14px] font-bold text-slate-900">{item.title}</div>
      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-slate-500">{item.comment}</p>

      <FeedActionBar />
    </Card>
  )
}
