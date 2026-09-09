# Travel Tackle Frontend

React 19 + Vite + Tailwind v4. 백엔드(`../Travel_tackle`)는 읽기 전용 — 수정하지 않는다.

## 디자인 일관성 규칙
새 UI를 만들 때는 값을 새로 짓지 말고 먼저 아래를 확인하고 재사용한다.

- `src/index.css`의 `@theme` 토큰 (`--color-brand*`, `--shadow-card`, `--shadow-card-hover`, `--shadow-popup`, `--shadow-float*`)
- `src/components/ui/`의 공용 컴포넌트: `Section`(페이지 폭 래퍼), `SectionHeader`(제목+더보기 링크), `Card`(흰 배경 카드 셸), `Button`(solid/invert/light 변형), `IconBadge`(아이콘 원형/사각 배지), `Chip`(필 형태 뱃지)

반복되는 카드/버튼/그림자 스타일을 컴포넌트마다 새 Tailwind 임의값(`shadow-[...]` 등)으로 다시 만들지 말 것. 정말 그 화면 하나에서만 쓰이는 값이라면 인라인으로 둬도 된다 — 무리하게 토큰화/컴포넌트화하지 않는다.
