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
    day: day.dayNumber,
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

function adaptPlan({ tripId, ownerName, region, title, startDate, endDate, days }) {
  const adaptedDays = adaptDays(days)
  return {
    id: tripId,
    type: 'plan',
    user: { nickname: ownerName },
    region,
    title,
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
