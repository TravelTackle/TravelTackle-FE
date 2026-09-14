import client from './client'

export function requestEmailCode(email) {
  return client.post('/auth/email-verifications', { email })
}

export function confirmEmailCode(email, code) {
  return client.post('/auth/email-verifications/confirm', { email, code })
}

export function signup({ email, password, name, nationality }) {
  return client.post('/auth/signup', { email, password, name, nationality })
}

export function login({ email, password }) {
  return client.post('/auth/login', { email, password }).then((res) => res.data)
}

export function logout() {
  return client.post('/auth/logout')
}

export function getMe() {
  return client.get('/auth/me').then((res) => res.data)
}

// 닉네임/언어 통합 수정 — 둘 중 바꾸지 않는 값은 null/undefined로 보내면 그대로 유지된다.
// 응답은 CurrentUserResponse 전체(authProviders 포함)라 그대로 setUser에 넣으면 된다.
export function updateProfile({ name, preferredLanguage } = {}) {
  return client.patch('/auth/me', { name, preferredLanguage }).then((res) => res.data)
}

// 프로필 사진 교체 — multipart 필드 'image' (jpeg/png/webp, 10MB 이하). 응답은 CurrentUserResponse 전체(profileImageUrl 포함)
export function updateProfileImage(file) {
  const form = new FormData()
  form.append('image', file, file.name || 'profile.jpg')
  return client.put('/auth/me/profile-image', form).then((res) => res.data)
}

// 프로필 사진 삭제(기본 이미지로) — 응답은 CurrentUserResponse 전체(profileImageUrl null)
export function removeProfileImage() {
  return client.delete('/auth/me/profile-image').then((res) => res.data)
}

const IMAGE_MESSAGES = {
  IMAGE_001: '사진 저장소가 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.',
  IMAGE_002: 'jpeg, png, webp 사진만 올릴 수 있어요.',
  IMAGE_003: '사진은 10MB까지 올릴 수 있어요.',
  IMAGE_004: '사진을 저장소에 올리지 못했어요. 잠시 후 다시 시도해주세요.',
}
export function profileImageErrorMessage(err) {
  const status = err?.response?.status
  const data = err?.response?.data
  if (data?.code && IMAGE_MESSAGES[data.code]) return IMAGE_MESSAGES[data.code]
  if (status === 401) return '로그인이 필요해요.'
  if (status === 413) return IMAGE_MESSAGES.IMAGE_003
  return data?.message || '프로필 사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.'
}

export function changePassword({ currentPassword, newPassword }) {
  return client.patch('/auth/password', { currentPassword, newPassword })
}

// 4개 값 전체 교체(PUT) — 서버는 부모/자식 종속 규칙을 강제하지 않으므로 프론트에서 맞춰 보낸다.
export function updateNotificationSettings({ notifyEmail, notifyFeedback, notifyRecommend, notifyEvent }) {
  return client.put('/auth/notifications', { notifyEmail, notifyFeedback, notifyRecommend, notifyEvent }).then((res) => res.data)
}

// 확인 없이 즉시 하드 삭제 + 서버가 쿠키까지 정리해준다. 204 응답, 별도 로그아웃 호출 불필요.
export function deleteAccount() {
  return client.delete('/auth/me')
}

export function requestPasswordReset(email) {
  return client.post('/auth/password-resets', { email })
}

export function confirmPasswordReset({ email, code, newPassword }) {
  return client.post('/auth/password-resets/confirm', { email, code, newPassword })
}
