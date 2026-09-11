// 백엔드 FeedItemResponse/PublicTripDetailResponse를 TravelerFeedPage 컴포넌트가
// 기대하는 목업 shape(plan/record)로 변환.

function formatTime(time) {
  return time ? time.slice(0, 5) : ''
}

function toDuration(startDate, endDate) {
  const nights = Math.round((new Date(endDate) - new Date(startDate)) / 86_400_000)
  return `${nights}박 ${nights + 1}일`
}

function adaptDays(days) {
  return (days || []).map((day) => ({
    id: day.id,
    day: day.dayNumber,
    date: day.date,
    stops: day.items.map((item) => ({
      time: formatTime(item.startTime),
      title: item.cachedTitle,
      address: item.address,
      memo: item.memo,
      icon: 'mdi:map',
      iconBg: 'bg-brand',
      imageUrl: item.cachedImageUrl,
    })),
    places: day.items.map((item) => ({
      name: item.cachedTitle,
      time: `${formatTime(item.startTime)}~${formatTime(item.endTime)}`,
      imageUrl: item.cachedImageUrl,
    })),
  }))
}

function adaptPlan({ tripId, ownerName, region, title, startDate, endDate, days, feedbackCount, saveCount, createdAt }) {
  const adaptedDays = adaptDays(days)
  return {
    id: tripId,
    type: 'plan',
    user: { nickname: ownerName },
    region,
    title,
    startDate,
    endDate,
    feedbackCount: feedbackCount ?? 0,
    saveCount: typeof saveCount === 'number' ? saveCount : null, // 내 여행으로 담은(저장) 수 — 좋아요 엔티티가 생기면 likeCount를 따로 받는다
    createdAt,
    duration: toDuration(startDate, endDate),
    placeCount: adaptedDays.reduce((sum, d) => sum + d.places.length, 0),
    days: adaptedDays,
  }
}

function adaptRecord(entry) {
  return {
    id: `${entry.tripId}-record`,
    type: 'record',
    user: { nickname: entry.ownerName },
    region: entry.region,
    title: entry.title,
    comment: entry.content,
    planId: entry.tripId,
    orientation: 'landscape',
    imageUrl: entry.thumbnailUrl,
    feedbackCount: entry.feedbackCount ?? 0,
    saveCount: typeof entry.saveCount === 'number' ? entry.saveCount : null,
    createdAt: entry.createdAt,
  }
}

export function adaptFeedItem(entry) {
  return entry.type === 'PLAN' ? adaptPlan(entry) : adaptRecord(entry)
}

export function adaptPlanDetail(detail) {
  return adaptPlan({
    tripId: detail.id,
    ownerName: detail.ownerName,
    region: detail.region,
    title: detail.title,
    startDate: detail.startDate,
    endDate: detail.endDate,
    days: detail.days,
  })
}
