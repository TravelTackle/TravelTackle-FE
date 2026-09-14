import client from './client'

export function requestEmailCode(email) {
  // 회원가입 전이라 아직 계정(User.preferredLanguage)이 없으므로, 지금 앱에서 선택된 언어를
  // 바디에 실어 보내야 인증 메일이 올바른 언어로 나간다.
  let language = 'ko'
  try {
    language = localStorage.getItem('tt-language') || 'ko'
  } catch {
    // 프라이빗 모드 등 localStorage 접근이 막힌 환경에서는 기본값(ko)으로 요청
  }
  return client.post('/auth/email-verifications', { email, language })
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
