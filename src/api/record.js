import client from './client'

// 여행 기록(후기) — 계획당 1개, 제목·내용 필수, 사진 1장 이상. 백엔드 TripRecordController(/api/trips/{tripId}/record).
// 사진은 multipart로 보내면 서버가 S3에 올린 뒤 기록에 붙인다(jpeg/png/webp, 파일당 10MB·요청 50MB 이하).

function toFormData({ title, content, photos }) {
  const form = new FormData()
  form.append('title', title)
  form.append('content', content)
  photos.forEach((photo, i) => {
    const blob = photo.blob ?? photo
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    form.append('photos', blob, photo.name ?? `photo-${i + 1}.${ext}`)
  })
  // captions는 선택 — 하나라도 있으면 photos와 인덱스를 맞춰 전부 보낸다(비어 있으면 빈 문자열)
  if (photos.some((p) => p.caption)) {
    photos.forEach((p) => form.append('captions', p.caption ?? ''))
  }
  return form
}

// photos: [{ blob: Blob, caption?: string, name?: string }] 또는 Blob/File 배열
export function createTripRecord(tripId, data) {
  return client
    .post(`/trips/${tripId}/record`, toFormData(data), { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data)
}

export function updateTripRecord(tripId, data) {
  return client
    .patch(`/trips/${tripId}/record`, toFormData(data), { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data)
}

export function getTripRecord(tripId) {
  return client.get(`/trips/${tripId}/record`).then((res) => res.data)
}

export function deleteTripRecord(tripId) {
  return client.delete(`/trips/${tripId}/record`)
}

// 백엔드 ErrorResponse.code → 사용자 문구. 모르는 코드는 서버 message를 그대로 쓴다.
const MESSAGES = {
  TRIP_016: '이 계획에는 이미 기록이 있어요. 계획당 기록은 하나만 남길 수 있어요.',
  TRIP_005: '여행 계획을 찾을 수 없어요.',
  TRIP_006: '내 여행 계획에만 기록을 남길 수 있어요.',
  IMAGE_001: '사진 저장소가 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.',
  IMAGE_002: 'jpeg, png, webp 사진만 올릴 수 있어요.',
  IMAGE_003: '사진은 한 장에 10MB, 전체 50MB까지 올릴 수 있어요.',
  COMMON_002: '입력값을 다시 확인해주세요.',
}

export function recordErrorMessage(err) {
  const status = err?.response?.status
  const data = err?.response?.data
  if (status === 401) return '로그인이 필요해요.'
  if (data?.code && MESSAGES[data.code]) return MESSAGES[data.code]
  if (status === 413) return MESSAGES.IMAGE_003
  return data?.message || '기록을 올리지 못했어요. 잠시 후 다시 시도해주세요.'
}
