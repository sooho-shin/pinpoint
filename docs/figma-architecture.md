# Figma 아키텍처

## 목적

Figma 파일은 한국어 Pinpoint의 디자인 원본이다. 코드 구현은 Figma 디자인 시스템과 화면을 기준으로 한다.

## 페이지 구조

Figma 파일은 다음 페이지를 가진다.

```text
00 Foundations
01 Components
02 Screens
03 Admin
04 Prototype Notes
```

### 00 Foundations

- Color tokens
- Typography tokens
- Spacing scale
- Radius scale
- Shadow/elevation
- Layout grid

### 01 Components

Atomic Design 계층으로 컴포넌트를 정리한다.

```text
Atoms
Molecules
Organisms
Templates
```

Atomic Design은 이름만 계층화하는 것이 아니라 인스턴스 조립 구조까지 포함한다.

```text
Molecules -> Atoms instance
Organisms -> Molecules/Atoms instance
Templates -> Organisms instance
Screens -> Templates/Organisms instance
```

상위 계층에서 Button, Text Input, Ranking Row, Leaderboard Tabs, Panel 같은 UI를 rectangle/text/frame으로 다시 만들지 않는다.

### 02 Screens

사용자 플레이 화면을 둔다.

- Sign In
- Nickname Setup
- Today Puzzle
- Solved Result
- Failed Result
- Share Preview
- Daily Ranking
- Group Ranking
- Ranking Empty State

각 화면 frame은 `design/screens.json`의 `requiredInstances`를 만족해야 한다. `02 Screens` 페이지가 비어 있거나 화면 frame이 component instance 없이 직접 그린 UI로만 구성되면 실패다.

### 03 Admin

운영자 리뷰 화면을 둔다.

- Candidate List
- Candidate Detail
- Review Actions
- Flagged Attempts

### 04 Prototype Notes

상태 전환, 인터랙션, 구현 메모를 둔다.

## Atomic Design 기준

### Foundations

- 색상, 타이포, spacing, radius 같은 원자 이전의 디자인 토큰

### Atoms

- Button
- Google Sign In Button
- Icon Button
- Text Input
- Badge
- Clue Number
- Status Dot
- Divider

### Molecules

- Clue Row
- Guess Input Group
- Score Badge
- Feedback Message
- Auth Status Message
- Share Action Group
- Ranking Row
- Leaderboard Tabs
- Group Invite Card

### Organisms

- Puzzle Board
- Result Panel
- Sign In Panel
- Nickname Panel
- Header
- Admin Candidate Card
- Admin Review Panel
- Leaderboard Panel
- Ranking Privacy Prompt

### Templates

- Daily Puzzle Template
- Auth Template
- Result Template
- Admin Review Template
- Ranking Template

## 검증 계약

Figma 파일은 두 가지 자동 검증 계약을 통과해야 한다.

```bash
npm run figma:layout:contract
npm run figma:composition:contract
```

Figma MCP에서 생성한 리포트가 있으면 다음 검증도 통과해야 한다.

```bash
npm run figma:layout:check
npm run figma:composition:check
```

`figma:layout:check`는 화면/패널/컨트롤의 bounds overflow를 검사한다. `figma:composition:check`는 Screens와 상위 컴포넌트가 하위 컴포넌트 instance로 조립되었는지 검사한다.

## Code Connect 위치

Code Connect는 Figma 디자인을 만드는 단계가 아니다. 앱 코드가 생기고 Figma 컴포넌트가 정리된 뒤, Figma 컴포넌트와 코드 컴포넌트를 매핑하는 단계에서 사용한다.

후속 연결 예:

```text
Figma Button ↔ code Button
Figma TextInput ↔ code TextInput
Figma ClueRow ↔ code ClueRow
Figma PuzzleBoard ↔ code PuzzleBoard
```
