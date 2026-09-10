import { useEffect, useState } from 'react'
import { getFeed } from '../api/feed'
import { adaptFeedItem } from '../data/feedAdapter'

// 인기순: 참견(피드백)이 많은 순, 같으면 최신순. 백엔드가 sort=popular를 지원하면 서버 정렬을 그대로 쓰고
// 아직 최신순만 주는 동안은 여기서 안정 정렬로 맞춘다 (stable sort라 서버 순서는 동점일 때만 유지).
function sortByPopularity(items) {
  return [...items].sort((a, b) => (b.feedbackCount ?? 0) - (a.feedbackCount ?? 0))
}

// 홈의 세 섹션(모아보기·참견하기·탐색 탭)이 같은 피드를 쓰므로 페이지에서 한 번만 불러 내려준다.
export default function useHomeFeed() {
  const [state, setState] = useState({ items: [], loading: true, error: false })

  useEffect(() => {
    let ignore = false
    getFeed({ size: 30, sort: 'popular' })
      .then((page) => {
        if (!ignore) {
          const content = Array.isArray(page?.content) ? page.content : []
          setState({ items: sortByPopularity(content.map(adaptFeedItem)), loading: false, error: false })
        }
      })
      .catch(() => {
        if (!ignore) setState({ items: [], loading: false, error: true })
      })
    return () => {
      ignore = true
    }
  }, [])

  return state
}
