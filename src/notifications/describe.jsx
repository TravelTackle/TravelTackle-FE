// 알림 하나를 화면에 옮기는 공통 헬퍼 — 팝오버 목록(NotificationPanel)과 실시간 토스트(NotificationContext)가 같이 쓴다

// 알림 종류별 아이콘·색 — 참견은 장미색(참견 버튼과 같은 색), 스크랩은 호박색(스크랩 아이콘과 같은 색)
const KINDS = {
  FEEDBACK: { icon: 'solar:chat-round-dots-bold', tone: 'bg-rose-50 text-rose-500' },
  SCRAP: { icon: 'solar:bookmark-bold', tone: 'bg-amber-50 text-amber-600' },
}

export function notificationKind(n) {
  return KINDS[n?.type] ?? KINDS.FEEDBACK
}

// 눌렀을 때 갈 곳 — 마이페이지로 가서 그 계획의 사이드바를 바로 연다.
// 참견은 상세 위에 참견 드로어까지(?feedback=), 스크랩은 계획 상세 드로어(?open=). MyPageSettings가 읽어 처리한다
export function notificationTarget(n) {
  const tripId = n?.trip?.id
  if (!tripId) return '/mypage'
  return n?.type === 'FEEDBACK' ? `/mypage?feedback=${tripId}` : `/mypage?open=${tripId}`
}

// "OO님이 <계획> Day 2 · 장소에 참견을 남겼어요" / "OO님이 <계획>을 스크랩했어요"
export function describeNotification(n, language = 'ko') {
  const actor = n?.actor?.name || (language !== 'ko' ? 'A traveler' : '여행자')
  const title = n?.trip?.title || (language !== 'ko' ? 'my trip' : '내 계획')
  if (n?.type === 'SCRAP') {
    if (language !== 'ko') {
      return (
        <>
          <b className="font-bold">{actor}</b> saved <b className="font-bold">{title}</b>
        </>
      )
    }
    return (
      <>
        <b className="font-bold">{actor}</b>님이 <b className="font-bold">{title}</b>을 스크랩했어요
      </>
    )
  }
  const f = n?.feedback
  if (language !== 'ko') {
    const where = f?.target === 'DAY' && f.dayNumber ? ` Day ${f.dayNumber}` : f?.target === 'ITEM' && f.itemTitle ? ` · ${f.itemTitle}` : ''
    return (
      <>
        <b className="font-bold">{actor}</b> left feedback on <b className="font-bold">{title}</b>
        {where}
      </>
    )
  }
  const where = f?.target === 'DAY' && f.dayNumber ? ` Day ${f.dayNumber}` : f?.target === 'ITEM' && f.itemTitle ? ` · ${f.itemTitle}` : ''
  return (
    <>
      <b className="font-bold">{actor}</b>님이 <b className="font-bold">{title}</b>
      {where}에 참견을 남겼어요
    </>
  )
}
