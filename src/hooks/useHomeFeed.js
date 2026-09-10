import { useEffect, useState } from 'react'
import { getFeed } from '../api/feed'
import { adaptFeedItem } from '../data/feedAdapter'

// 홈의 세 섹션(모아보기·참견하기·탐색 탭)이 같은 피드를 쓰므로 페이지에서 한 번만 불러 내려준다.
export default function useHomeFeed() {
  const [state, setState] = useState({ items: [], loading: true, error: false })

  useEffect(() => {
    let ignore = false
    getFeed({ size: 30 })
      .then((page) => {
        if (!ignore) setState({ items: (page.content || []).map(adaptFeedItem), loading: false, error: false })
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
