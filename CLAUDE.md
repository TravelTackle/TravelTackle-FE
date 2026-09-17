# Travel Tackle Frontend

React 19 + Vite + Tailwind v4. 백엔드(`../Travel_tackle`)는 읽기 전용 — 수정하지 않는다.

## 디자인 일관성 규칙
새 UI를 만들 때는 값을 새로 짓지 말고 먼저 아래를 확인하고 재사용한다.

- `src/index.css`의 `@theme` 토큰 (`--color-brand*`, `--shadow-card`, `--shadow-card-hover`, `--shadow-popup`, `--shadow-float*`)
- `src/components/ui/`의 공용 컴포넌트: `Section`(페이지 폭 래퍼), `SectionHeader`(제목+더보기 링크), `Card`(흰 배경 카드 셸), `Button`(solid/invert/light 변형), `IconBadge`(아이콘 원형/사각 배지), `Chip`(필 형태 뱃지)

반복되는 카드/버튼/그림자 스타일을 컴포넌트마다 새 Tailwind 임의값(`shadow-[...]` 등)으로 다시 만들지 말 것. 정말 그 화면 하나에서만 쓰이는 값이라면 인라인으로 둬도 된다 — 무리하게 토큰화/컴포넌트화하지 않는다.

## 라이트/다크 모드 규칙
다크 모드는 `src/index.css`의 `.dark` 블록이 색 변수(`--color-slate-*`, 브랜드 톤, 강조색 틴트)를 뒤집어서 동작한다. 컴포넌트에 `dark:` 클래스를 늘어놓지 말고 아래 토큰만 지키면 자동으로 따라온다.

- 카드·패널·시트·팝오버의 흰 바탕은 `bg-white`가 아니라 **`bg-surface`** (다크에서 남색). `text-white`는 색 버튼 위 글자라 그대로 둔다.
- 사진·색 배경 위의 흰 반투명 칩(`bg-white/90` 등)은 항상 밝으므로 글자는 slate가 아니라 **`text-ink` / `text-ink-brand`** (모드와 무관하게 어두움).
- 사진 위 어두운 오버레이, 모달 배경, 툴팁은 `bg-slate-900/…`이 아니라 **`bg-black/…`** (뒤집히면 안 되는 색).
- 인라인 style로 색을 박아야 하면(히어로 그라데이션처럼) `useTheme().resolved === 'dark'`로 다크용 값을 따로 고른다.
- 새 화면을 만들면 두 모드 모두에서 글자 대비를 확인한다. 색 이름을 새로 짓기 전에 위 토큰으로 되는지 먼저 본다.

