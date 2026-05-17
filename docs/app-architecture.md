# 앱 아키텍처

## 목적

이 문서는 한국어 Pinpoint의 프론트엔드와 백엔드 구현 계약이다. 구현자는 이 문서, `schema/app-contract.json`, 기존 DB 계약, Figma 계약을 함께 기준으로 삼는다.

앱 구현의 1차 목표는 다음 범위다.

- 오늘 공개된 퍼즐을 플레이할 수 있다.
- 잠긴 단서와 정답은 서버가 허용하기 전까지 노출하지 않는다.
- 로그인하지 않은 사용자도 오늘 공개 문제를 바로 풀 수 있다.
- Google 로그인 사용자는 닉네임을 설정하고 성공 기록을 오늘의 랭킹에 올릴 수 있다.
- 오늘의 랭킹 1등은 100자 확성기 메시지를 남길 수 있다.
- 오늘 문제 없음, 실패, 이미 푼 상태를 정상적으로 처리한다.

## 권장 스택

- App framework: Next.js App Router
- Language: TypeScript
- UI: React Server Components 기본, 필요한 상호작용만 Client Components
- Styling: Tailwind CSS + `design/tokens.json`
- Icons: `lucide-react`
- Auth/DB: Supabase Auth + Supabase Postgres
- Supabase SSR: `@supabase/ssr`
- Backend: Next.js Route Handlers

별도 Express 서버를 만들지 않는다. MVP의 서버 기능은 Next.js Route Handler를 backend-for-frontend로 사용한다.

## 핵심 원칙

### Figma Atomic Design 일치

앱 UI는 Figma의 `design/components.json`, `design/screens.json`, `design/tokens.json`를 코드 계약으로 사용한다. 코드 컴포넌트 구조는 Figma Atomic layer와 1:1로 대응해야 한다.

- `src/components/atoms/*`는 `design/components.json`의 `atoms` 항목을 모두 가진다.
- `src/components/molecules/*`는 `design/components.json`의 `molecules` 항목을 모두 가진다.
- `src/components/organisms/*`는 `design/components.json`의 `organisms` 항목을 모두 가진다.
- `src/components/templates/*`는 `design/components.json`의 `templates` 항목을 모두 가진다.
- page route는 organism을 직접 배치하지 않고 template 컴포넌트를 통해 화면을 구성한다.
- 스타일 색상은 `design/tokens.json` 값을 `src/app/globals.css` CSS 변수로 반영한다.
- 핵심 모바일 수치인 `390 / 32 / 326 / 24 / 278`, atom height `52 / 56`, ranking row `64`는 Figma layout contract와 어긋나면 안 된다.

Figma에 없는 새 UI primitive를 만들지 않는다. 필요한 경우 먼저 Figma 계약과 `schema/app-contract.json`을 갱신한다.

### 서버 권위

퍼즐 진행 상태, 공개된 단서 수, 정답 판정, 경과 시간, 랭킹 등록은 서버가 결정한다. 클라이언트가 보낸 `used_clue_count`, `elapsed_ms`, `is_correct` 값은 신뢰하지 않는다.

### 정답/잠긴 단서 비노출

브라우저는 다음 값을 terminal result 전까지 받아서는 안 된다.

- `answer`
- `aliases`
- `rationale`
- `submitted_answer`
- `normalized_answer`
- 아직 공개되지 않은 clue

Supabase browser client로 `puzzles`를 직접 읽는 구현은 금지한다. 오늘 문제 조회는 반드시 `/api/today`를 통한다.

### 인증과 프로필 분리

Google OAuth는 인증 전용이다. 가입 시작 화면에서 닉네임을 먼저 입력받고, OAuth 콜백에서 신규 사용자 프로필이 없으면 해당 닉네임으로 `profiles`를 생성한다. 랭킹, 공유, 그룹 화면에는 `profiles.nickname`만 노출한다. 이메일은 API 응답과 UI에 노출하지 않는다.

### 익명 플레이와 로그인 랭킹

로그인하지 않은 사용자는 오늘 문제 풀이, 결과 확인, 랭킹 조회에 접근할 수 있다. Today Puzzle, Result, Daily Ranking 화면은 첫 방문자가 10초 안에 플레이를 시작할 수 있도록 로그인 벽을 두지 않는다.

오늘 문제 진행 상태는 로그인 사용자는 `publication_id + user_id`, 비로그인 사용자는 `publication_id + anonymous_session_id` 기준으로 조회한다. 익명 세션은 서버가 발급한 httpOnly 쿠키로만 관리하고, 클라이언트 JS에서 읽을 수 없게 한다. 랭킹 등록, 그룹 참여, 1등 확성기 메시지는 로그인과 닉네임 설정을 요구한다.

같은 브라우저에서 비로그인으로 시작한 attempt는 로그인 후 계정으로 승계한다. 서버는 로그인 상태에서도 기존 `anonymous_session_id` 쿠키를 확인하고, 오늘 publication에 익명 attempt가 있으며 같은 사용자의 로그인 attempt가 없으면 해당 attempt의 `user_id`를 현재 사용자로 연결한다. 익명 attempt가 이미 `succeeded` 또는 `failed`이면 로그인 후에도 완료 상태를 유지하므로 같은 문제를 새로 풀 수 없다. 익명 성공 attempt는 로그인 후 프로필이 있으면 랭킹 등록 대상으로 승격할 수 있다.

### 사용자별 일일 풀이

KST 기준 하루에 공개되는 `puzzle_publications`는 하나지만, attempt는 사용자별로 독립된다.

- 같은 `publication_id`를 모든 로그인 사용자와 익명 세션이 각자 풀 수 있어야 한다.
- 한 사용자의 성공, 실패, terminal attempt, 랭킹 1등 달성은 다른 사용자의 `/api/attempts/start`, `/api/attempts/reveal`, `/api/attempts/submit`을 막지 않는다.
- attempt 조회와 이어풀기는 로그인 사용자는 `publication_id + user_id`, 비로그인 사용자는 `publication_id + anonymous_session_id` 기준으로 한다.
- 로그인 전 같은 브라우저의 익명 attempt가 있으면 로그인 사용자의 attempt로 먼저 승계한 뒤 조회한다.
- 같은 publication에 이미 로그인 사용자 attempt가 있으면 그 attempt를 우선하고 익명 attempt는 승계하지 않는다.
- `leaderboard_entries`는 성공 기록의 projection이며, 게임 플레이 가능 여부를 판단하는 잠금 테이블로 사용하지 않는다.
- 같은 사용자의 같은 공개 문제 랭킹 기록은 하나만 허용한다.

## 화면 범위

### `/`

Today Puzzle 화면이다.

상태:

- loading
- no puzzle
- ready
- playing
- solved
- failed
- already completed

기본 동작:

1. `/api/today`로 오늘 공개 문제와 첫 단서를 가져온다.
2. 새 플레이면 `/api/attempts/start`를 호출한다.
3. 오답 또는 넘기기 시 `/api/attempts/reveal`로 다음 단서를 연다.
4. 제출은 `/api/attempts/submit`으로 보낸다.
5. 결과는 `/result`로 이동하거나 같은 route의 result state로 표시한다.

### `/result`

성공/실패 결과 화면이다.

노출:

- 성공/실패 상태
- 사용한 단서 수
- 전체 단서
- 정답
- 공유 텍스트
- 랭킹 진입 또는 닉네임 CTA

### `/ranking`

오늘의 랭킹 화면이다.

노출:

- 확성기 메시지가 있으면 상단 compact banner
- visible 랭킹 목록
- 내 기록 강조
- 로그인 사용자라면 내 기록 강조

정렬:

```text
used_clue_count asc
elapsed_ms asc
submitted_at asc
```

### `/signin`

Google 로그인 화면이다.

로그인하면 성공 기록을 오늘의 랭킹에 올릴 수 있다는 상태를 보여준다.

Google OAuth 시작 전에 닉네임을 필수로 입력받는다. 닉네임은 2~12자의 한국어, 영문, 숫자만 허용한다. 신규 사용자는 콜백에서 이 닉네임으로 프로필이 생성되고, 기존 사용자 프로필은 로그인 시 입력값으로 덮어쓰지 않는다.

### `/nickname`

닉네임 설정 화면이다.

정책:

- 2~12자
- 한국어, 영문, 숫자 조합 우선
- 비어 있는 값 금지
- 이메일 노출 금지
- 가입 시작 화면에서 정상 닉네임을 입력한 신규 사용자는 이 화면을 거치지 않는다.

## API 범위

### `GET /api/today`

오늘 KST 기준 published publication을 반환한다.

반환 가능:

- `publicationId`
- `publishDateKst`
- `category`
- `difficulty`
- 공개된 단서 목록
- 사용자 attempt summary
- 현재 확성기 메시지

반환 금지:

- 정답
- 별칭
- 잠긴 단서
- rationale

### `POST /api/attempts/start`

새 attempt를 시작한다.

서버 책임:

- 로그인 요청은 `user_id`, 비로그인 요청은 서버 발급 `anonymous_session_id` 저장
- 비로그인 요청도 새 익명 세션을 발급해 진행한다
- `started_at`은 서버 시각 사용
- 이미 terminal attempt가 있으면 기존 상태 반환
- 다른 사용자의 terminal attempt나 랭킹 기록은 현재 사용자의 시작 가능 여부에 영향을 주지 않음

### `POST /api/attempts/reveal`

다음 단서를 공개한다.

서버 책임:

- attempt 소유권 확인
- 현재 공개 단서 수를 서버 상태 기준으로 증가
- 최대 5개까지만 공개
- 정답/aliases는 반환하지 않음

### `POST /api/attempts/submit`

정답을 제출한다.

서버 책임:

- 입력 정규화
- `puzzles.answer`, `puzzles.aliases`와 비교
- 서버 기준 `elapsed_ms` 계산
- 성공 또는 5번째 단서 이후 실패면 terminal result 반환
- 로그인 + 닉네임 + 성공이면 `leaderboard_entries` 생성
- 비정상적으로 짧은 기록은 flagged 처리 가능

### `GET /api/leaderboard/daily`

오늘의 visible 랭킹을 반환한다.

비로그인 요청도 visible 랭킹 목록을 반환한다. 단, `myRank`와 1등 메시지 작성 권한은 로그인 사용자에게만 계산한다.

반환 가능:

- rank
- nickname
- used_clue_count
- elapsed_ms
- submitted_at

반환 금지:

- email
- submitted_answer
- normalized_answer
- device_hash
- ip_hash
- user_agent_hash

### `GET /api/winner-message/current`

현재 노출 가능한 1등 확성기 메시지를 반환한다. 없으면 `null`을 반환한다.

### `POST /api/winner-message`

오늘의 1등만 확성기 메시지를 작성한다.

서버 책임:

- 로그인 확인
- 닉네임 확인
- 100자 제한
- daily rank 1 검증
- `visible_until`은 다음 공개 전까지로 설정

## 구현 파일 구조

권장 구조:

```text
src/app/
  page.tsx
  result/page.tsx
  ranking/page.tsx
  signin/page.tsx
  nickname/page.tsx
  auth/callback/route.ts
  api/today/route.ts
  api/attempts/start/route.ts
  api/attempts/reveal/route.ts
  api/attempts/submit/route.ts
  api/leaderboard/daily/route.ts
  api/winner-message/current/route.ts
  api/winner-message/route.ts
src/components/
  atoms/
  molecules/
  organisms/
  templates/
src/lib/
  supabase/
  puzzle/
  ranking/
  validation/
```

## 환경 변수

필수:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이다. `NEXT_PUBLIC_` 접두사를 붙이면 안 된다.

## 1차 범위에서 제외

- 그룹 랭킹 생성/초대/참여 전체 흐름
- 관리자 리뷰 웹 UI
- 시즌 랭킹
- 문제 후보 생성 UI
- 운영자 moderation UI

위 기능은 DB와 디자인 계약에는 있지만, MVP 구현 후 별도 하네스 범위로 확장한다.
