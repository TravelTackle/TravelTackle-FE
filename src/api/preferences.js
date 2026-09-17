import client from './client'

export function getPreferences() {
  return client.get('/preferences').then((res) => res.data)
}

export function createPreferences(data) {
  return client.post('/preferences', data).then((res) => res.data)
}

export function updatePreferences(data) {
  return client.put('/preferences', data).then((res) => res.data)
}
