# 언어 기반 이원화 설계 — 현지인 모드 / 여행자 모드

> 상태: **설계만 확정, 구현 보류.** 언어 선택기(저장·챗봇 연동)까지만 구현되어 있고,
> 아래의 모드 전환은 이 문서 승인 후 구현한다.

## 1. 배경과 원칙

트레블 참견의 핵심 루프는 **"외국인 여행자가 계획을 올리면 → 한국인 현지인이 참견한다"**.
두 사용자군은 목적이 반대이므로 같은 홈을 번역만 해서 보여주면 안 된다.

- **현지인(ko)**: 참견을 *하는* 사람. 피드백 대기 중인 계획 피드가 중심.
- **여행자(ko 외 8개 언어)**: 참견을 *받는* 사람. 계획 만들기·추천·챗봇이 중심.

분리 방식은 **언어 기반** (URL 분리 아님): `language === 'ko'` → 현지인 모드, 그 외 → 여행자 모드.

## 2. 현재 구현된 것 (이 문서와 무관하게 동작)

| 항목 | 위치 | 상태 |
|---|---|---|
| 언어 상태·사전·폴백(`ko`→`en`) | `src/i18n/index.jsx` | ✅ `LanguageProvider`, `useLanguage()`, 9개 언어 |
| 언어 선택 드롭다운 | `src/components/Navbar.jsx` | ✅ 선택 시 `localStorage(tt-language)`·`<html lang>` 반영 |
| 챗봇 다국어 | `src/components/ChatbotWidget.jsx` | ✅ 선택 언어를 `/api/chat`의 `language`로 전달 (백엔드 완비) |
| 알려진 한계 | 챗봇 인사말 | 마운트 시점 언어로 고정 — 모드 전환 구현 시 함께 해결 |

## 3. 모드 전환 설계

### 3.1 진입점

```jsx
// HomePage.jsx (구현 시)
const { language } = useLanguage()
return language === 'ko' ? <LocalHome /> : <TravelerHome />
```

- `LocalHome` = **현재 HomePage 그대로** (HeroSlider, AiSummaryFeed, ParticipateSection, ExploreSection).
- 첫 방문 언어 감지: `localStorage` 값 → 없으면 `navigator.language`가 ko*면 ko, 아니면 en.

### 3.2 TravelerHome 섹션 구성 (위→아래)

1. **Hero** — 한 문장 가치 제안 + 챗봇 열기 CTA (여행자의 첫 행동은 질문이므로 검색보다 챗봇 우선)
2. **취향 기반 추천** — `RecommendedSpots` 재사용, 단 다국어 TourAPI 필요(§4)
3. **내 계획 + 받은 참견** — 로그인 시: 내 계획 카드에 현지인 참견 배지. 비로그인 시: 데모 카드 + 가입 CTA
4. **How it works** — 계획 → 현지인 참견 → 완성 (기존 HeroSlider의 3단계를 정적 3열로)
5. **Footer** — 공용, `t()` 적용

### 3.3 Navbar 모드별 차이

| | 현지인(ko) | 여행자(그 외) |
|---|---|---|
| 메뉴 | 여행지 탐색 · 여행자 피드 · 나의 여행 (현행) | Plan a trip · My feedback · Explore |
| 언어 선택기 | 유지 (여행자 모드로 나가는 통로) | 유지 |
| 참견 알림 벨 | 유지 | 내 계획에 달린 참견 알림으로 용도 변경 |

### 3.4 온보딩(설문)

- 여행자 모드에서도 설문 흐름은 동일. 선택지 라벨만 `t()` 필요
  (백엔드 enum 값은 언어 무관이므로 API 변경 없음).
- `preferenceOptions.js`의 `label`을 키로 바꾸고 사전에 언어별 라벨 추가.

## 4. 백엔드 필요 작업 (travel_tackle 리포)

1. **관광지 API 다국어 노출** — `GET /api/tour/contents`가 현재 KorService2 고정.
   `TourService.getFilteredContentsInLanguage(service, …)`가 이미 있으므로
   컨트롤러에 `language` 쿼리 파라미터만 추가하면 됨 (챗봇 툴과 같은 매핑: en→EngService2 등).
2. **추천 섹션 다국어** — `RecommendationService`도 내부적으로 KorService2 고정. 동일 방식 확장.
3. **참견(피드백) 텍스트** — 사용자 생성 콘텐츠라 자동 번역 불가.
   **[결정 필요]** 정책 선택지: (a) 원문 그대로 표시, (b) LLM 번역 버튼(비용 발생), (c) 현지인이 영어 참견 작성 유도.
   → 비용이 걸린 문제이므로 구현 전 사용자 결정 필요.

## 5. 구현 단계 (승인 후)

- **Phase 1 (프론트만)**: HomePage 모드 분기 + TravelerHome 뼈대(§3.2의 1·4·5) + Navbar 모드 분기 + 챗봇 인사말 언어 동기화
- **Phase 2 (백엔드 연동)**: §4-1·2 → TravelerHome에 다국어 추천 섹션 활성화
- **Phase 3 (정책 결정 후)**: 받은 참견 표시 + 번역 정책 적용, 온보딩 다국어

## 6. 미결정 사항 (사용자 결정 대기)

- 참견 텍스트 번역 정책 (§4-3)
- 여행자 모드에서 피드(다른 여행자 계획 구경) 노출 여부
- `zh`/`zh-tw` 등 UI 사전 번역 범위 — MVP는 UI en 폴백 + 데이터만 해당 언어로 제공할지
