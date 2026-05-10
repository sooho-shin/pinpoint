# Atomic Design 규칙

## 계층

Figma 컴포넌트는 다음 계층을 따른다.

```text
Foundations -> Atoms -> Molecules -> Organisms -> Templates -> Screens
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

## Organisms

Organisms는 화면의 주요 영역이다.

- PuzzleBoard
- ResultPanel
- GameHeader
- AdminCandidateCard
- AdminReviewPanel
- LeaderboardPanel
- RankingPrivacyPrompt

## Templates

Templates는 화면 구조를 잡는다.

- DailyPuzzleTemplate
- ResultTemplate
- AdminReviewTemplate
- RankingTemplate

## 금지

- 같은 역할의 버튼을 화면마다 새 스타일로 만들지 않는다.
- 카드를 중첩하지 않는다.
- 장식용 gradient blob이나 orb를 만들지 않는다.
- 텍스트가 프레임 밖으로 넘치게 두지 않는다.
- 화면을 마케팅 랜딩 페이지처럼 만들지 않는다.
