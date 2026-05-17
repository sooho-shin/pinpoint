---
name: dev-reset-puzzle
description: 개발/테스트 중 오늘 문제를 기다리지 않고 새 문제로 교체하고, 오늘 publication의 attempts, leaderboard, winner message, group ranking 상태를 초기화할 때 사용한다. dev reset puzzle, next puzzle, ranking reset, Supabase.
---

# Dev Reset Puzzle

이 스킬은 개발 환경에서 “다음날까지 기다리지 않고” 오늘 공개 문제를 새 문제로 갈아끼우고, 오늘 풀이/랭킹 파생 상태를 초기화하는 호출형 스킬이다.

## 핵심 원칙

- 운영 루틴용 스킬이 아니다. 개발/테스트 편의용이다.
- 오늘의 `puzzle_publications` row는 유지하고 `puzzle_id`만 교체한다.
- 새 문제는 다른 날짜 publication에 이미 연결된 puzzle을 피한다.
- 최근 dev reset에 사용한 puzzle은 `tmp/dev-reset-puzzle-history.json` 기준으로 피한다.
- 기본 삭제 범위는 오늘 publication의 `attempts`, `leaderboard_entries`, `daily_winner_messages`, `groups`, `group_members`, `group_leaderboard_entries`다.
- `profiles`와 `auth.users`는 유지한다.
- 사용자가 “회원가입부터”, “로그인도 초기화”, `--auth`를 명시한 경우에만 Auth/Profile까지 삭제한다.

## 호출 매핑

아래 요청이면 이 스킬을 사용한다.

- `$dev-reset-puzzle`
- `다음 문제 내줘`
- `문제랑 랭킹 초기화해줘`
- `dev에서 새 문제로 리셋`
- `오늘 문제 갈아끼우고 다시 풀게 해줘`

## 기본 실행

먼저 dry-run으로 교체 대상과 삭제 범위를 확인한다.

```bash
npm run dev:reset-puzzle -- --dry-run
```

문제가 없으면 실제 실행한다.

```bash
npm run dev:reset-puzzle
```

## 옵션

특정 KST 날짜:

```bash
npm run dev:reset-puzzle -- --date 2026-05-17
```

특정 puzzle로 교체:

```bash
npm run dev:reset-puzzle -- --puzzle-id <id>
```

최근 사용 이력 초기화:

```bash
npm run dev:reset-puzzle -- --clear-history
```

로그인/Auth까지 초기화:

```bash
npm run dev:reset-puzzle -- --auth
```

## 보고 원칙

최종 보고에는 다음을 포함한다.

- 교체한 KST 날짜
- 유지한 publication ID
- 이전 puzzle ID와 새 puzzle 정답/카테고리/첫 단서
- 삭제한 attempts, leaderboard, winner message, group 관련 row 수
- Auth/Profile 삭제 여부
