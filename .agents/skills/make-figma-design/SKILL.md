---
name: make-figma-design
description: 사용자가 `$make-figma-design`처럼 요청하면 한국어 Pinpoint의 Figma 디자인을 design-first 방식으로 생성하거나 갱신한다. Atomic Design, Figma MCP, design system, screens, screenshot validation.
---

# Make Figma Design

이 스킬은 한국어 Pinpoint의 Figma 디자인을 생성하거나 갱신할 때 사용한다. 이 프로젝트는 디자인을 먼저 만들고 그 다음 코드를 작성한다.

## 필수 참조 문서

작업 전 반드시 아래 문서를 읽는다.

1. `docs/product-plan.md`
2. `docs/design-plan.md`
3. `docs/figma-architecture.md`
4. `docs/figma-operations.md`
5. `design/tokens.json`
6. `design/components.json`
7. `design/screens.json`
8. `references/atomic-design-rules.md`
9. `references/figma-design-workflow.md`

## 핵심 원칙

- Code Connect는 초기 디자인 생성 단계에서 사용하지 않는다.
- 먼저 Figma 디자인 시스템과 화면을 만든다.
- 앱 코드가 생긴 뒤에 Code Connect를 연결한다.
- Atomic Design 계층을 유지한다.
- 첫 화면은 랜딩 페이지가 아니라 실제 Today Puzzle 화면이다.
- 모바일 우선으로 만들고, Admin 화면은 데스크톱 우선으로 만든다.
- 모든 화면과 주요 컴포넌트는 layout containment audit를 통과해야 한다.
- TextInput, Button, Panel, Card 같은 컨트롤은 부모 패널/카드/화면의 content bounds 밖으로 나가면 실패로 본다.
- Button과 TextInput은 좌우뿐 아니라 하단까지 부모 frame bounds 안에 있어야 한다.
- Auth 계열 화면의 헤더는 Brand, Title, Subtitle이 각각 한 번만 보여야 하며, `GameHeader`와 화면 전용 제목을 같은 위치에 중복 배치하면 실패로 본다.
- Auth 계열 화면은 32px 좌우 padding, Brand y=40, Title y=88, Subtitle y=132, Panel y=252를 기준 rhythm으로 사용한다.
- 패널 내부는 top/bottom padding 30px 이상을 유지하고, 마지막 버튼 하단과 패널 하단 사이 여백은 24px 이상이어야 한다.
- `GuessInputGroup`은 입력창과 제출 버튼을 모두 포함해야 하며, 이 molecule 전체가 `PuzzleBoard` 카드 안에 있어야 한다.
- `ShareActionGroup`과 `LeaderboardTabs`의 버튼은 각 슬롯 안에 들어가야 하며, 2개 버튼을 배치할 때 전체 폭이 부모 content width를 넘으면 실패로 본다.
- `RankingRow`의 rank, name/meta, score badge는 row 안에 있어야 하며 badge pill이 카드 밖으로 나가면 실패로 본다.
- `LeaderboardPanel`은 탭과 표시되는 모든 `RankingRow`를 포함해야 하며, 마지막 row 하단과 패널 하단 사이 여백이 24px 미만이면 실패로 본다.
- 랭킹 화면에서 5개 row를 표시할 때 panel 높이를 줄여 row stack이 카드 밖으로 삐져나오게 만들면 실패로 본다.
- 버튼 라벨은 화면 맥락과 맞아야 한다. 정답 제출 버튼을 닉네임 저장 버튼 라벨로 재사용하면 실패로 본다.
- Atomic Design은 이름 규칙이 아니라 인스턴스 조립 규칙이다.
- Molecules는 Atoms 인스턴스, Organisms는 Molecules/Atoms 인스턴스, Templates는 Organisms 인스턴스, Screens는 Templates/Organisms 인스턴스로 조립한다.
- 화면이나 상위 컴포넌트에서 TextInput, Button, RankingRow, Panel 같은 UI를 rectangle/text/frame으로 직접 다시 그리면 실패로 본다.

## 실행 절차

1. Figma 파일 생성 또는 대상 Figma 파일 확인
2. 페이지 생성: `00 Foundations`, `01 Components`, `02 Screens`, `03 Admin`, `04 Prototype Notes`
3. Foundations 토큰 배치
4. Atomic 컴포넌트 생성
5. Today Puzzle, Solved Result, Failed Result, Admin Review 화면 생성
6. `get_screenshot`으로 주요 화면 확인
7. `use_figma`로 주요 화면과 컴포넌트의 bounds를 검사해 layout containment audit를 수행
8. `use_figma`로 상위 계층이 하위 컴포넌트 인스턴스를 쓰는지 component composition audit를 수행
9. `get_metadata` 또는 `use_figma` 검사로 페이지/컴포넌트 누락 확인
10. layout audit 결과를 `reports/figma-layout-report.json`에 기록
11. composition audit 결과를 `reports/figma-composition-report.json`에 기록
12. `npm run figma:layout:contract`와 `npm run figma:composition:contract`를 실행
13. 리포트가 있으면 `npm run figma:layout:check`와 `npm run figma:composition:check`를 실행
14. 결과를 `reports/figma-design-report.json`에 기록

## 보고 형식

최종 보고에는 다음을 포함한다.

- Figma 파일 URL
- 생성/수정한 페이지
- 생성/수정한 컴포넌트
- 생성/수정한 화면
- 검증 결과
- layout containment audit 결과와 남은 overflow 이슈 수
- component composition audit 결과와 missing instance/direct-drawn UI 이슈 수
- Code Connect를 아직 실행하지 않은 이유 또는 실행 가능 조건
