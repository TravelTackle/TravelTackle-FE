// Fisher-Yates — 원본 배열은 건드리지 않고 섞은 새 배열을 반환한다
export function shuffle(list) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 최신순은 유지하되, 한쪽 타입이 훨씬 많아도(예: 계획이 기록보다 훨씬 많음) 화면에 연달아 몰리지 않게
// 두 그룹을 비율대로 고르게 섞는다. 각 그룹 내부의 상대 순서(= 최신순)는 그대로 유지한다 — 무작위 셔플이 아니다.
// 그룹 두 개짜리 스트라이트-라인(Bresenham) 방식: 진행률이 뒤처진 쪽에서 하나씩 꺼낸다.
export function interleaveByKey(list, keyFn) {
  const groups = new Map()
  list.forEach((item) => {
    const key = keyFn(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  })
  if (groups.size <= 1) return [...list]

  const queues = [...groups.values()]
  const cursors = queues.map(() => 0)
  const result = []
  for (let n = 0; n < list.length; n++) {
    let pick = -1
    let lowestProgress = Infinity
    queues.forEach((queue, i) => {
      if (cursors[i] >= queue.length) return
      const progress = cursors[i] / queue.length
      if (progress < lowestProgress) {
        lowestProgress = progress
        pick = i
      }
    })
    result.push(queues[pick][cursors[pick]])
    cursors[pick] += 1
  }
  return result
}
