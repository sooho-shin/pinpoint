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
10. `use_figma`로 layout containment audit를 실행한다.
11. `use_figma`로 component composition audit를 실행한다.
12. layout audit 결과를 `reports/figma-layout-report.json`에 기록한다.
13. composition audit 결과를 `reports/figma-composition-report.json`에 기록한다.
14. `npm run figma:layout:contract`와 `npm run figma:composition:contract`를 실행한다.
15. 리포트가 있으면 `npm run figma:layout:check`와 `npm run figma:composition:check`를 실행한다.
16. 누락 또는 불일치를 `reports/figma-design-report.json`에 기록한다.

## 검증 기준

- Figma 페이지 구조가 아키텍처와 일치해야 한다.
- Foundations 토큰이 화면에서 사용되어야 한다.
- Atoms, Molecules, Organisms, Templates 계층이 구분되어야 한다.
- Today Puzzle, Solved Result, Failed Result, Admin Review 화면이 있어야 한다.
- 랭킹 기획이 반영된 Daily Ranking 또는 Group Ranking 화면이 있어야 한다.
- 모바일 우선 화면이 있어야 한다.
- 텍스트가 프레임 밖으로 넘치거나 겹치면 안 된다.
- Auth 화면의 Brand, Title, Subtitle은 중복되거나 서로 겹치면 안 된다.
- Auth 화면은 Brand y=40, Title y=88, Subtitle y=132, Panel y=252 기준 rhythm을 따른다.
- 패널 내부 마지막 control 하단과 패널 하단 사이 여백은 24px 이상이어야 한다.
- 입력창, 버튼, 탭, 랭킹 row 같은 컨트롤이 부모 카드/패널 밖으로 넘치면 안 된다.
- `TextInput`은 부모 content width에 맞춰야 하며, 고정 폭 때문에 패널 밖으로 나가면 실패다.
- `Button`과 `TextInput`은 부모 frame의 좌우뿐 아니라 하단 bounds도 넘치면 안 된다.
- `GuessInputGroup`은 `TextInput`과 `Button`을 모두 포함하고, 전체 molecule이 `PuzzleBoard` 카드 안에 있어야 한다.
- `ShareActionGroup`과 `LeaderboardTabs`의 버튼은 각 slot 안에 들어가야 하고 전체 action bar 폭이 부모 content width를 넘으면 안 된다.
- `RankingRow`의 score badge pill은 row와 parent card bounds 안에 있어야 한다.
- `LeaderboardPanel`은 탭과 모든 visible `RankingRow`를 포함해야 하며, 마지막 row와 패널 하단 사이 여백은 24px 이상이어야 한다.
- Daily Ranking과 Group Ranking에서 5개 row를 보여줄 때 row stack이 카드 밖으로 삐져나오면 실패다.
- 버튼 라벨은 화면 맥락과 맞아야 한다. 정답 제출 버튼이 닉네임 저장 라벨을 표시하면 실패다.
- `02 Screens` 페이지에 `design/screens.json`의 사용자 화면이 실제 frame으로 존재해야 한다.
- `02 Screens`와 `03 Admin` 페이지가 비어 있으면 실패다.
- Screens는 Templates 또는 Organisms instance로 구성되어야 한다.
- Molecules, Organisms, Templates는 하위 계층 component instance를 사용해야 한다.
- Button, TextInput, RankingRow, LeaderboardTabs, Panel 역할 UI를 rectangle/text/frame으로 다시 그리면 실패다.
- 같은 역할의 UI가 서로 다른 스타일로 반복되면 안 된다.

## Layout audit 리포트

Figma MCP의 `use_figma`로 화면과 주요 컴포넌트의 좌표를 수집해 `reports/figma-layout-report.json`을 만든다. 리포트는 최소한 다음을 포함한다.

- `version`
- `fileKey`
- `ranAt`
- `screens`
- `containmentChecks`
- `issues`

`containmentChecks`는 control bounds와 container bounds를 함께 기록한다. `issues`가 비어 있지 않거나 containment 계산이 실패하면 `npm run figma:layout:check`가 실패해야 한다.

## Composition audit 리포트

Figma MCP의 `use_figma`로 컴포넌트 인스턴스 사용 관계를 수집해 `reports/figma-composition-report.json`을 만든다. 리포트는 최소한 다음을 포함한다.

- `version`
- `fileKey`
- `ranAt`
- `pages`
- `components`
- `screens`
- `issues`

`components`는 각 컴포넌트의 instance 사용 목록과 direct-drawn UI 후보를 기록한다. `screens`는 각 화면 frame의 required instance 충족 여부를 기록한다. `issues`가 비어 있지 않거나 required instance가 누락되면 `npm run figma:composition:check`가 실패해야 한다.

## Code Connect 절차

Code Connect는 후속 단계다. 다음 조건을 만족할 때만 진행한다.

- 앱 코드에 대응 컴포넌트가 존재한다.
- Figma 컴포넌트가 정리되어 있다.
- 필요한 경우 컴포넌트가 팀 라이브러리에 publish되어 있다.
- 매핑 대상과 코드 소스가 명확하다.

초기 Figma 디자인 생성 단계에서는 Code Connect를 실행하지 않는다.
