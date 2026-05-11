---
name: reset-today-puzzle
description: 사용자가 `$reset-today-puzzle`, 오늘 문제 초기화, 오늘 문제 다시 풀게 해줘, 모든 유저 오늘 문제 재시작 등을 요청하면 Supabase의 오늘 공개 문제는 유지하고 사용자별 풀이/랭킹/1등 메시지 상태를 초기화한다. Optional --auth resets auth users too.
---

# Reset Today Puzzle

이 스킬은 한국어 Pinpoint의 오늘 공개 문제를 테스트 초기 상태로 되돌리는 호출형 스킬이다. 문제 자체와 오늘 publication은 유지하고, 사용자별 풀이 상태만 삭제하는 것이 기본 동작이다.

## 핵심 원칙

- `puzzles`는 삭제하지 않는다.
- 오늘의 `puzzle_publications` row는 삭제하지 않는다.
- 기본 리셋은 모든 사용자가 오늘 문제를 처음부터 다시 풀 수 있게 만드는 작업이다.
- 오늘 문제는 하나지만 attempt는 `publication_id + user_id` 기준으로 사용자별 분리된다.
- 랭킹, 1등 메시지, 그룹 랭킹 데이터는 오늘 publication의 파생 상태이므로 함께 초기화한다.
- Auth 유저 삭제는 사용자가 `--auth`, `회원가입부터`, `로그인도 초기화`처럼 명시한 경우에만 수행한다.

## 실행 전 확인

1. `.env.local`에 아래 값이 있어야 한다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. 기본 명령은 오늘 KST 날짜의 published publication을 찾는다.
3. 오늘 published publication이 없으면 먼저 오늘 문제를 공개해야 한다.

## 호출 매핑

사용자 요청이 아래에 해당하면 이 스킬을 사용한다.

- `$reset-today-puzzle`
- `오늘 문제 초기화`
- `오늘 문제 다시 풀게 해줘`
- `모든 유저 오늘 문제 처음부터`
- `오늘 풀이/랭킹 리셋`

## 기본 리셋

실행 전 확인만 할 때:

```bash
npm run db:reset:today -- --dry-run
```

실제로 초기화할 때:

```bash
npm run db:reset:today
```

삭제 범위:

- 오늘 publication의 `daily_winner_messages`
- 오늘 publication의 `group_leaderboard_entries`
- 오늘 publication의 `group_members`
- 오늘 publication의 `groups`
- 오늘 publication의 `leaderboard_entries`
- 오늘 publication의 `attempts`

유지 범위:

- `puzzles`
- `puzzle_publications`
- `profiles`
- `auth.users`

## 회원가입부터 다시 테스트

사용자가 로그인/Auth까지 초기화를 명시하면 아래 명령을 사용한다.

```bash
npm run db:reset:today -- --auth --dry-run
npm run db:reset:today -- --auth
```

추가 삭제 범위:

- `profiles`
- `auth.users`

## 날짜 지정

특정 KST 날짜를 리셋해야 하면 아래처럼 실행한다.

```bash
npm run db:reset:today -- --date 2026-05-11
```

`--auth`와 함께 쓸 수 있다.

## 보고 원칙

최종 보고에는 다음을 포함한다.

- 리셋한 KST 날짜
- 유지된 publication ID와 puzzle ID
- 삭제한 row 수
- `--auth` 수행 여부
- `puzzles`와 `puzzle_publications`가 유지됐는지 확인 결과
