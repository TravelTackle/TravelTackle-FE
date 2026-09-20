import { createContext, useContext, useEffect, useState } from 'react'

/**
 * 백엔드(챗봇·TourAPI)가 지원하는 9개 언어. 코드는 백엔드 language 파라미터와 동일하다.
 * 선택값은 저장·챗봇 전달용으로만 쓰고, UI 문구는 바꾸지 않는다(모드 전환 설계는 docs/i18n-mode-design.md).
 */
export const LANGUAGES = [
  { code: 'ko', label: '한국어', short: 'KO' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ja', label: '日本語', short: 'JA' },
  { code: 'zh', label: '简体中文', short: '简中' },
  { code: 'zh-tw', label: '繁體中文', short: '繁中' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'ru', label: 'Русский', short: 'RU' },
]

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  // UI 언어는 ko 고정 — 국적 설정과 무관하고 언어 변경은 추후 지원 예정
  const [language, setLanguage] = useState('ko')

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
