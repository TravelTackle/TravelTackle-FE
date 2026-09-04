import client from './client'

export function getFeed(params) {
  return client.get('/feed', { params }).then((res) => res.data)
}

export function getFeedDetail(tripId) {
  return client.get(`/feed/${tripId}`).then((res) => res.data)
}
