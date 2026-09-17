// 알림 하나를 화면에 옮기는 공통 헬퍼 — 팝오버 목록(NotificationPanel)과 실시간 토스트(NotificationContext)가 같이 쓴다

// 좋아요 알림 타입 — 백엔드 enum 이름이 확정되기 전이라 쓸 법한 이름을 모두 받는다
const LIKE_TYPES = new Set(['FEEDBACK_LIKE', 'FEEDBACK_LIKED', 'LIKE'])
export const isLikeNotification = (n) => LIKE_TYPES.has(n?.type)

// 알림 종류별 아이콘·색 — 참견은 장미색 말풍선, 좋아요는 장미색 하트(참견 좋아요 버튼과 같은 색), 스크랩은 호박색
const KINDS = {
  FEEDBACK: { icon: 'solar:chat-round-dots-bold', tone: 'bg-rose-50 text-rose-500' },
  LIKE: { icon: 'mdi:heart', tone: 'bg-rose-500 text-white' },
  SCRAP: { icon: 'solar:bookmark-bold', tone: 'bg-amber-50 text-amber-600' },
}

export function notificationKind(n) {
  if (isLikeNotification(n)) return KINDS.LIKE
  return KINDS[n?.type] ?? KINDS.FEEDBACK
}

// 눌렀을 때 갈 곳
// - 참견: 마이페이지에서 내 계획의 참견 드로어(?feedback=)
// - 스크랩: 마이페이지에서 내 계획 상세(?open=)
// - 좋아요: 좋아요 받은 참견은 남의 계획에 내가 단 것 — 여행자 피드에서 그 계획 상세 + 참견 드로어를 열고
//   해당 참견을 강조한다(?open=<tripId>&feedback=<feedbackId>). TravelerFeedPage가 읽어 처리한다
export function notificationTarget(n) {
  const tripId = n?.trip?.id
  if (isLikeNotification(n)) {
    if (!tripId) return '/feed'
    const fid = n?.feedback?.id
    return `/feed?open=${tripId}&feedback=${fid ?? 'open'}`
  }
  if (!tripId) return '/mypage'
  return n?.type === 'FEEDBACK' ? `/mypage?feedback=${tripId}` : `/mypage?open=${tripId}`
}

function whereOf(f) {
  if (f?.target === 'DAY' && f.dayNumber) return ` Day ${f.dayNumber}`
  if (f?.target === 'ITEM' && f.itemTitle) return ` · ${f.itemTitle}`
  return ''
}

// "OO님이 <계획> Day 2 · 장소에 참견을 남겼어요" / "OO님이 <계획>을 스크랩했어요" / "OO님이 <계획>에 남긴 내 참견을 좋아해요"
export function describeNotification(n) {
  const actor = n?.actor?.name || '여행자'
  const title = n?.trip?.title || '계획'
  if (n?.type === 'SCRAP') {
    return (
      <>
        <b className="font-bold">{actor}</b>님이 <b className="font-bold">{title}</b>을 스크랩했어요
      </>
    )
  }
  if (isLikeNotification(n)) {
    return (
      <>
        <b className="font-bold">{actor}</b>님이 <b className="font-bold">{title}</b>
        {whereOf(n?.feedback)}에 남긴 내 참견을 좋아해요
      </>
    )
  }
  return (
    <>
      <b className="font-bold">{actor}</b>님이 <b className="font-bold">{title}</b>
      {whereOf(n?.feedback)}에 참견을 남겼어요
    </>
  )
}
