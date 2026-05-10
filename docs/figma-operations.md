# Figma 운영 절차

## 기본 원칙

Figma 작업은 디자인 우선 흐름으로 진행한다. 코드를 먼저 만들고 Figma를 맞추는 방식이 아니라, Figma에서 제품 화면과 디자인 시스템을 확정한 뒤 코드를 작성한다.

## 생성 절차

1. `docs/design-plan.md`를 읽는다.
2. `docs/figma-architecture.md`를 읽는다.
3. `design/tokens.json`, `design/components.json`, `design/screens.json`을 확인한다.
4. Figma 파일이 없으면 새 design file을 만든다.
5. `00 Foundations` 페이지를 만든다.
6. `01 Components` 페이지에 Atomic 컴포넌트를 만든다.
7. `02 Screens` 페이지에 사용자 화면을 조립한다.
8. `03 Admin` 페이지에 운영자 리뷰 화면을 만든다.
9. screenshot과 metadata로 결과를 검증한다.
10. 누락 또는 불일치를 `reports/figma-design-report.json`에 기록한다.

## 검증 기준

- Figma 페이지 구조가 아키텍처와 일치해야 한다.
- Foundations 토큰이 화면에서 사용되어야 한다.
- Atoms, Molecules, Organisms, Templates 계층이 구분되어야 한다.
- Today Puzzle, Solved Result, Failed Result, Admin Review 화면이 있어야 한다.
- 랭킹 기획이 반영된 Daily Ranking 또는 Group Ranking 화면이 있어야 한다.
- 모바일 우선 화면이 있어야 한다.
- 텍스트가 프레임 밖으로 넘치거나 겹치면 안 된다.
- 같은 역할의 UI가 서로 다른 스타일로 반복되면 안 된다.

## Code Connect 절차

Code Connect는 후속 단계다. 다음 조건을 만족할 때만 진행한다.

- 앱 코드에 대응 컴포넌트가 존재한다.
- Figma 컴포넌트가 정리되어 있다.
- 필요한 경우 컴포넌트가 팀 라이브러리에 publish되어 있다.
- 매핑 대상과 코드 소스가 명확하다.

초기 Figma 디자인 생성 단계에서는 Code Connect를 실행하지 않는다.
