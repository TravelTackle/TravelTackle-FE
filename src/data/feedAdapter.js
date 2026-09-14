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

function adaptPlan({ tripId, ownerName, ownerId, ownerProfileImageUrl, region, title, startDate, endDate, days, feedbackCount, saveCount, createdAt, savedTripId, thumbnailUrl }) {
  const adaptedDays = adaptDays(days)
  return {
    id: tripId,
    type: 'plan',
    user: { nickname: ownerName, id: ownerId ?? null, profileImageUrl: ownerProfileImageUrl ?? null },
    region,
    title,
    startDate,
    endDate,
    feedbackCount: feedbackCount ?? 0,
    saveCount: typeof saveCount === 'number' ? saveCount : null, // 스크랩(내 여행으로 저장) 수 — 좋아요는 도입하지 않기로 해 이 값만 쓴다
    createdAt,
    duration: toDuration(startDate, endDate),
    placeCount: adaptedDays.reduce((sum, d) => sum + d.places.length, 0),
    days: adaptedDays,
    // 로그인 사용자가 이미 스크랩한 계획이면 그 SavedTrip id, 아니면 null — 있으면 스크랩된 것으로 취급하고
    // 스크랩 해제(unsaveTrip) 호출에도 그대로 쓴다. 별도 boolean을 더 두지 않는다(값이 둘로 어긋나는 걸 방지).
    savedTripId: savedTripId ?? null,
    // 이 트립에 공개 여행기록이 있는지 — thumbnailUrl은 기록 사진에서만 나오므로 있으면 기록이 있다는 뜻.
    // 보관함 상세에서 "이 여행의 기록 보기" 버튼을 보여줄지 판단하는 데 쓴다.
    hasRecord: !!thumbnailUrl,
  }
}

function adaptRecord(entry) {
  return {
    id: `${entry.tripId}-record`,
    type: 'record',
    user: { nickname: entry.ownerName, id: entry.ownerId ?? null, profileImageUrl: entry.ownerProfileImageUrl ?? null },
    region: entry.region,
    title: entry.title,
    comment: entry.content,
    planId: entry.tripId,
    orientation: 'landscape',
    imageUrl: entry.thumbnailUrl,
    feedbackCount: entry.feedbackCount ?? 0,
    saveCount: typeof entry.saveCount === 'number' ? entry.saveCount : null,
    createdAt: entry.createdAt,
    savedTripId: entry.savedTripId ?? null, // 기록이 가리키는 원본 계획(tripId) 기준 스크랩 여부
  }
}

export function adaptFeedItem(entry) {
  return entry.type === 'PLAN' ? adaptPlan(entry) : adaptRecord(entry)
}

export function adaptPlanDetail(detail) {
  return adaptPlan({
    tripId: detail.id,
    ownerName: detail.ownerName,
    ownerId: detail.ownerId,
    ownerProfileImageUrl: detail.ownerProfileImageUrl,
    region: detail.region,
    title: detail.title,
    startDate: detail.startDate,
    endDate: detail.endDate,
    days: detail.days,
    feedbackCount: detail.feedbackCount,
    saveCount: detail.saveCount, // 백엔드 PR #32부터 상세에도 스크랩 수가 온다
    savedTripId: detail.savedTripId,
  })
}

// 보관함(GET /saved-trips) 응답 → 피드 카드(PlanFeedCard/RecordFeedCard)와 같은 모양으로 변환.
// 스크랩할 때 어느 카드(계획/기록)에서 눌렀는지가 sourceType으로 저장돼 있어서, 보관함에서도
// 그 형태 그대로 보여준다 — 기록에서 스크랩했으면 기록 카드, 계획에서 스크랩했으면 계획 카드.
// 이미 스크랩된 상태로만 존재하는 목록이라 savedTripId는 항상 값이 있다.
// copiedTripId는 "나의 계획으로 복사하기"를 이미 눌렀는지 여부 — null이면 아직 복사 전.
export function adaptSavedTrip(entry) {
  const shared = { copiedTripId: entry.copiedTripId ?? null, savedAt: entry.savedAt }
  if (entry.sourceType === 'RECORD') {
    return {
      ...adaptRecord({
        tripId: entry.originalTripId,
        ownerName: entry.ownerName,
        ownerProfileImageUrl: entry.ownerProfileImageUrl,
        region: entry.region,
        title: entry.title,
        content: entry.content,
        thumbnailUrl: entry.thumbnailUrl,
        feedbackCount: entry.feedbackCount,
        saveCount: entry.saveCount,
        createdAt: entry.savedAt,
        savedTripId: entry.savedTripId,
      }),
      ...shared,
    }
  }
  return {
    ...adaptPlan({
      tripId: entry.originalTripId,
      ownerName: entry.ownerName,
      ownerProfileImageUrl: entry.ownerProfileImageUrl,
      region: entry.region,
      title: entry.title,
      startDate: entry.startDate,
      endDate: entry.endDate,
      days: entry.days,
      feedbackCount: entry.feedbackCount,
      saveCount: entry.saveCount,
      createdAt: entry.savedAt,
      savedTripId: entry.savedTripId,
      thumbnailUrl: entry.thumbnailUrl,
    }),
    ...shared,
  }
}

// 계획 상세 패널에서 "이 여행의 기록 보기"를 눌렀을 때 쓴다 — PublicTripDetailResponse(getFeedDetail)에는
// days와 record가 함께 오므로, 이미 있는 이 엔드포인트로 기록 쪽 상세도 그대로 만들 수 있다.
// 그 트립에 기록이 없으면(비공개 등) null.
export function adaptRecordDetail(detail) {
  if (!detail.record) return null
  return adaptRecord({
    tripId: detail.id,
    ownerName: detail.ownerName,
    ownerProfileImageUrl: detail.ownerProfileImageUrl,
    region: detail.region,
    title: detail.record.title,
    content: detail.record.content,
    thumbnailUrl: detail.record.photos?.[0]?.imageUrl,
    feedbackCount: detail.feedbackCount,
    savedTripId: detail.savedTripId,
    createdAt: detail.record.createdAt,
  })
}
