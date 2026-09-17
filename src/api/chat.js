import client from './client'

export function sendChatMessage({ message, conversationId, language = 'ko' }, { signal } = {}) {
  return client
    .post('/chat', { message, conversationId, language }, { signal })
    .then((response) => response.data)
}
