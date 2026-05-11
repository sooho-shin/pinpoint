# Atomic Design 규칙

## 계층

Figma 컴포넌트는 다음 계층을 따른다.

```text
Foundations -> Atoms -> Molecules -> Organisms -> Templates -> Screens
```

Atomic Design은 레이어 이름만 맞추는 규칙이 아니다. 상위 계층은 반드시 하위 계층 컴포넌트의 instance를 사용해 조립한다.

```text
Molecules -> Atoms instance
Organisms -> Molecules/Atoms instance
Templates -> Organisms instance
Screens -> Templates/Organisms instance
```

## Foundations

색상, 타이포그래피, spacing, radius, shadow, grid를 둔다. 화면에서 직접 쓰는 값은 가능하면 `design/tokens.json`의 값을 따른다.

## Atoms

Atoms는 더 작은 UI 컴포넌트로 나누기 어려운 단위다.

- Button
- IconButton
- TextInput
- Badge
- ClueNumber
- StatusDot
- Divider

## Molecules

Molecules는 atoms를 조합한 작은 기능 단위다.

- ClueRow
- GuessInputGroup
- ScoreBadge
- FeedbackMessage
- ShareActionGroup
- RankingRow
- LeaderboardTabs
- GroupInviteCard

Molecule 안의 Button, TextInput, Badge, ClueNumber, Divider 같은 요소는 직접 그린 rectangle/text/frame이 아니라 Atoms 컴포넌트 instance여야 한다.

## Organisms

Organisms는 화면의 주요 영역이다.

- PuzzleBoard
- ResultPanel
- GameHeader
- AdminCandidateCard
- AdminReviewPanel
- LeaderboardPanel
- RankingPrivacyPrompt

Organism 안의 반복 row, tab, input group, share action, button은 Molecules 또는 Atoms 컴포넌트 instance여야 한다.

## Templates

Templates는 화면 구조를 잡는다.

- DailyPuzzleTemplate
- ResultTemplate
- AdminReviewTemplate
- RankingTemplate

Template은 화면 레이아웃을 잡고 Organisms 컴포넌트 instance를 배치한다. Template 안에서 panel, board, ranking list를 rectangle/text/frame으로 다시 만들지 않는다.

## Screens

Screens는 최종 화면 frame이다. `02 Screens`와 `03 Admin`의 화면 frame은 Templates 또는 Organisms 컴포넌트 instance로 구성한다. 화면에서 Button, TextInput, RankingRow, Panel 같은 UI를 직접 그리면 실패다.

## 금지

- 같은 역할의 버튼을 화면마다 새 스타일로 만들지 않는다.
- 카드를 중첩하지 않는다.
- 장식용 gradient blob이나 orb를 만들지 않는다.
- 텍스트가 프레임 밖으로 넘치게 두지 않는다.
- 화면을 마케팅 랜딩 페이지처럼 만들지 않는다.
- instance를 detach해서 상위 계층 UI를 직접 편집하지 않는다.
- `Button`, `TextInput`, `RankingRow`, `LeaderboardTabs`, `Panel`, `Card` 역할을 rectangle/text/frame으로 재구현하지 않는다.
