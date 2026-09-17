import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * 라이트/다크 모드.
 * - mode: 'light' | 'dark' | 'system' — 사용자가 고른 값(localStorage 'tt-theme'). 기본은 system.
 * - resolved: 실제 적용 중인 값('light' | 'dark'). system이면 OS 설정을 따르고 바뀌면 같이 바뀐다.
 * 적용은 <html class="dark">로 한다. index.html의 인라인 스크립트가 첫 페인트 전에 같은 규칙으로 클래스를
 * 먼저 붙여 두므로 새로고침 때 흰 화면이 번쩍이지 않는다. 색 자체는 index.css의 .dark 블록이 담당한다.
 */
export const THEME_MODES = [
  { key: 'light', label: '라이트', icon: 'solar:sun-2-linear' },
  { key: 'dark', label: '다크', icon: 'solar:moon-linear' },
  { key: 'system', label: '시스템', icon: 'solar:monitor-linear' },
]

const STORAGE_KEY = 'tt-theme'
const ThemeContext = createContext(null)
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return THEME_MODES.some((m) => m.key === saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

function resolve(mode) {
  return mode === 'system' ? (media().matches ? 'dark' : 'light') : mode
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readMode)
  const [resolved, setResolved] = useState(() => resolve(mode))

  useEffect(() => {
    setResolved(resolve(mode))
    if (mode !== 'system') return undefined
    const mq = media()
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const setMode = useCallback((next) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 프라이빗 모드 등 저장이 막혀도 이번 세션에서는 동작한다
    }
  }, [])

  // 한 번 누르면 지금 보이는 것의 반대로 — system이었다면 그 시점의 반대 값으로 고정된다
  const toggle = useCallback(() => setMode(resolved === 'dark' ? 'light' : 'dark'), [resolved, setMode])

  const value = useMemo(() => ({ mode, resolved, setMode, toggle }), [mode, resolved, setMode, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
