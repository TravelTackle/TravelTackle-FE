import { useEffect, useState } from 'react'
import { getFeed } from '../api/feed'
import { adaptFeedItem } from '../data/feedAdapter'

// 다른 페이지를 다녀와도 홈이 스켈레톤부터 다시 시작하지 않도록, 마지막 결과를 모듈에 남겨 둔다
let cache = null

// 홈의 세 섹션(모아보기·참견하기·탐색 탭)이 같은 피드를 쓰므로 페이지에서 한 번만 불러 내려준다.
// 캐시가 있으면 그걸 먼저 보여주고 뒤에서 조용히 새로 받는다 (stale-while-revalidate).
export default function useHomeFeed() {
  const [state, setState] = useState(() =>
    cache ? { items: cache, loading: false, error: false, fromCache: true } : { items: [], loading: true, error: false, fromCache: false },
  )

  useEffect(() => {
    let ignore = false
    getFeed({ size: 30, sort: 'popular' })
      .then((page) => {
        if (ignore) return
        const content = Array.isArray(page?.content) ? page.content : []
        cache = content.map(adaptFeedItem) // sort=popular: 서버가 참견 수 내림차순 + 최신순으로 정렬해 준다
        setState({ items: cache, loading: false, error: false, fromCache: false })
      })
      .catch(() => {
        if (!ignore && !cache) setState({ items: [], loading: false, error: true, fromCache: false })
      })
    return () => {
      ignore = true
    }
  }, [])

  return state
}
