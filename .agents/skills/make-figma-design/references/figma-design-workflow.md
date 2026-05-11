# Figma 디자인 워크플로우

## 디자인 우선 흐름

이 프로젝트는 Figma 디자인을 먼저 확정하고 나중에 코드를 작성한다.

```text
Figma 디자인 시스템
→ Figma 화면
→ 검증
→ 앱 코드
→ Code Connect
```

## Figma MCP 사용

- 새 파일이 필요하면 `create_new_file`을 사용한다.
- Figma에 객체를 만들거나 수정할 때는 `use_figma`를 사용한다.
- 결과 이미지를 확인할 때는 `get_screenshot`을 사용한다.
- 구조 확인이 필요하면 `get_metadata`를 사용한다.

## 검증

최소 검증 항목:

- 필요한 페이지가 모두 있는가
- Foundations가 있는가
- Atomic 컴포넌트 계층이 있는가
- Today Puzzle 화면이 있는가
- Result 화면이 있는가
- Admin Review 화면이 있는가
- 모바일 화면에서 텍스트가 넘치지 않는가
- 모바일 화면에서 TextInput, Button, Panel, Card가 부모 content bounds 밖으로 넘치지 않는가
- 재사용 컨트롤은 고정 폭으로 임의 배치하지 않고 부모 content width에 맞게 들어가는가
- 카드/패널 내부 컨트롤은 좌우 padding을 포함해 containment audit를 통과하는가
- `02 Screens`와 `03 Admin` 페이지가 비어 있지 않은가
- Screens가 Templates 또는 Organisms instance로 구성되어 있는가
- Molecules/Organisms/Templates가 하위 계층 component instance를 사용하는가
- Button, TextInput, RankingRow, LeaderboardTabs, Panel 역할의 UI가 직접 그린 rectangle/text/frame으로 대체되지 않았는가
- 동일 역할 UI가 같은 컴포넌트 스타일을 따르는가

## Layout containment audit

Figma 화면 생성 또는 수정 후 `use_figma`로 주요 screen, panel, card, control의 geometry를 검사한다.

- screen frame 밖으로 자식 노드가 나가면 실패
- panel/card surface 밖으로 입력창, 버튼, 탭, 랭킹 row가 나가면 실패
- Auth 화면에서 Brand, Title, Subtitle이 중복되거나 서로 겹치면 실패
- Auth 화면의 Brand/Title/Subtitle/Panel y 위치가 `design/screens.json`의 auth rhythm 계약과 다르면 실패
- 패널 내부 마지막 control 하단과 panel 하단 사이 여백이 24px 미만이면 실패
- Button과 TextInput이 부모 frame의 하단 밖으로 나가면 실패
- `GuessInputGroup` 전체가 `PuzzleBoard` 카드 밖으로 나가면 실패
- `GuessInputGroup` 안의 Button이 molecule bounds 밖으로 나가면 실패
- `ShareActionGroup`과 `LeaderboardTabs` 안의 모든 Button이 각 slot bounds 밖으로 나가면 실패
- `RankingRow` 안의 Badge pill이 row bounds 또는 parent card bounds 밖으로 나가면 실패
- `LeaderboardPanel` 안의 `LeaderboardTabs`와 모든 visible `RankingRow`가 panel surface 밖으로 나가면 실패
- 랭킹 리스트의 마지막 visible row 하단과 `LeaderboardPanel` 하단 사이 여백이 24px 미만이면 실패
- 2-column action bar는 전체 width가 278px content width를 넘으면 실패
- content padding이 24px인 326px 패널의 내부 control width는 기본 278px이어야 한다
- `TextInput`은 nickname, answer, invite code 같은 긴 값이 들어가도 부모 content bounds 안에 있어야 한다
- 버튼 라벨은 사용 맥락과 맞아야 한다. Today Puzzle의 정답 제출 버튼이 닉네임 저장처럼 다른 화면 액션을 표시하면 실패
- `02 Screens` 페이지에 필요한 화면 frame이 비어 있으면 실패

검사 결과는 `reports/figma-layout-report.json`에 기록하고 `npm run figma:layout:check`로 검증한다.

## Component composition audit

Figma 화면 생성 또는 수정 후 `use_figma`로 Atomic Design 조립 구조를 검사한다.

- `01 Components`에 필요한 component가 없으면 실패
- `02 Screens` 또는 `03 Admin` 페이지가 비어 있으면 실패
- `design/screens.json`에 있는 화면 frame이 없으면 실패
- Screen frame 안에 required instance가 없으면 실패
- Molecule, Organism, Template이 하위 계층 instance를 하나도 쓰지 않으면 실패
- Button/Input/Field/Row/Tabs/Panel/Card 유사 이름의 직접 그린 node가 상위 계층에 있으면 실패

검사 결과는 `reports/figma-composition-report.json`에 기록하고 `npm run figma:composition:check`로 검증한다.

## Code Connect

초기 디자인 생성 단계에서는 Code Connect를 실행하지 않는다. Code Connect는 코드 컴포넌트가 생기고 Figma 컴포넌트가 정리된 뒤 수행한다.
