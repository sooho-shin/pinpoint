# 앱 아키텍처

## 목적

이 문서는 Narrow의 프론트엔드와 백엔드 구현 계약이다. 구현자는 이 문서, `schema/app-contract.json`, 기존 DB 계약, Figma 계약을 함께 기준으로 삼는다.

앱 구현의 1차 목표는 다음 범위다.

- 오늘 공개된 퍼즐을 플레이할 수 있다.
- 잠긴 단서와 정답은 서버가 허용하기 전까지 노출하지 않는다.
- 로그인하지 않은 사용자도 오늘 공개 문제를 바로 풀 수 있다.
- Google 로그인 사용자는 닉네임을 설정하고 성공 기록을 오늘의 랭킹에 올릴 수 있다.
- 오늘의 랭킹 1등은 100자 확성기 메시지를 남길 수 있다.
- 오늘 문제 없음, 실패, 이미 푼 상태를 정상적으로 처리한다.
- 소개, 플레이 방법, 지난 문제 같은 게시자 콘텐츠 페이지를 제공해 서비스 설명과 검색/검수용 콘텐츠를 분리한다.
- 플레이 방법과 지난 문제는 전역 상단 메뉴에서 접근할 수 있게 한다.

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

Google OAuth는 인증 전용이다. 먼저 Google 로그인을 완료하고, OAuth 콜백에서 신규 사용자 프로필이 없으면 `/nickname` 화면으로 보내 닉네임을 설정하게 한다. 기존 사용자 프로필이 있으면 닉네임 입력 없이 원래 화면으로 돌아간다. 랭킹, 공유, 그룹 화면에는 `profiles.nickname`만 노출한다. 이메일은 API 응답과 UI에 노출하지 않는다.

### 익명 플레이와 로그인 랭킹

로그인하지 않은 사용자는 오늘 문제 풀이, 결과 확인, 랭킹 조회에 접근할 수 있다. Today Puzzle, Result, Daily Ranking 화면은 첫 방문자가 10초 안에 플레이를 시작할 수 있도록 로그인 벽을 두지 않는다.

오늘 문제 진행 상태는 로그인 사용자는 `publication_id + user_id`, 비로그인 사용자는 `publication_id + anonymous_session_id` 기준으로 조회한다. 익명 세션은 서버가 발급한 httpOnly 쿠키로만 관리하고, 클라이언트 JS에서 읽을 수 없게 한다. 랭킹 등록, 그룹 참여, 1등 확성기 메시지는 로그인과 닉네임 설정을 요구한다.

같은 브라우저에서 비로그인으로 시작한 attempt는 로그인 후 계정으로 승계한다. 서버는 로그인 상태에서도 기존 `anonymous_session_id` 쿠키를 확인하고, 오늘 publication에 익명 attempt가 있으며 같은 사용자의 로그인 attempt가 없으면 해당 attempt의 `user_id`를 현재 사용자로 연결한다. 익명 attempt가 이미 `succeeded` 또는 `failed`이면 로그인 후에도 완료 상태를 유지하므로 같은 문제를 새로 풀 수 없다. 익명 성공 attempt는 로그인 후 프로필이 있으면 랭킹 등록 대상으로 승격할 수 있다.

### 사용자별 일일 풀이

KST 기준 하루에 공개되는 `puzzle_publications`는 하나지만, attempt는 사용자별로 독립된다. 여기서 하루의 기준은 KST 17:00부터 다음날 KST 17:00 직전까지다. `publish_date_kst`는 공개 운영일이 시작된 KST 날짜이며, `/api/today`, daily ranking, winner message, daily feedback은 현재 KST 시간이 17:00 전이면 전날 `publish_date_kst`, 17:00 이후이면 오늘 `publish_date_kst`를 활성 공개일로 사용한다. KST 00:00 이후에도 17:00 전까지는 전날 17:00에 공개된 문제가 계속 오늘 문제다.

- 같은 `publication_id`를 모든 로그인 사용자와 익명 세션이 각자 풀 수 있어야 한다.
- 한 사용자의 성공, 실패, terminal attempt, 랭킹 1등 달성은 다른 사용자의 `/api/attempts/start`, `/api/attempts/reveal`, `/api/attempts/submit`을 막지 않는다.
- attempt 조회와 이어풀기는 로그인 사용자는 `publication_id + user_id`, 비로그인 사용자는 `publication_id + anonymous_session_id` 기준으로 한다.
- 로그인 전 같은 브라우저의 익명 attempt가 있으면 로그인 사용자의 attempt로 먼저 승계한 뒤 조회한다.
- 같은 publication에 이미 로그인 사용자 attempt가 있으면 그 attempt를 우선하고 익명 attempt는 승계하지 않는다.
- `leaderboard_entries`는 성공 기록의 projection이며, 게임 플레이 가능 여부를 판단하는 잠금 테이블로 사용하지 않는다.
- 같은 사용자의 같은 공개 문제 랭킹 기록은 하나만 허용한다.
- 로그인 사용자의 terminal 결과는 `user_daily_results`에 `publication_id + user_id` 기준으로 하나만 저장한다.
- 연승 랭킹은 `user_daily_results`를 재계산한 `user_streaks` projection에서 읽는다. 오늘 문제 리셋은 오늘 결과를 삭제한 뒤 해당 사용자들의 projection을 다시 계산한다.
- 연승 랭킹 조회는 활성 공개일 기준 오늘 또는 직전 공개일에 성공한 사용자만 live current streak으로 인정한다.

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
- 그룹 만들기 카드와 초대 링크 복사 액션
- visible 랭킹 목록
- 내 기록 강조
- 로그인 사용자라면 내 기록 강조
- 오늘 문제를 완료한 로그인 사용자에게 문제 평가/한마디 작성 영역
- 오늘 문제를 완료한 사용자에게 visible 평가 목록
- 아직 완료하지 않은 사용자에게는 평가 목록 대신 완료 후 확인 가능 안내

정렬:

```text
used_clue_count asc
elapsed_ms asc
submitted_at asc
```

평가/한마디 정책:

- 작성은 로그인 + 닉네임 + 오늘 문제 완료 attempt가 필요하다.
- 조회도 오늘 문제 완료자에게만 허용한다.
- 한 사용자는 같은 공개 문제에 하나의 평가만 남긴다.
- 다시 제출하면 기존 평가를 수정한다.
- `comment`는 1~140자다.
- 정답, aliases, 제출 답안, 이메일, 해시 식별자는 평가 응답에 포함하지 않는다.

그룹 랭킹 정책:

- `/ranking?group={invite_code}`는 초대 코드에 해당하는 오늘 그룹 랭킹을 표시한다.
- 그룹 생성과 참여는 로그인 + 닉네임 설정을 요구한다.
- 그룹은 활성 공개일의 publication에만 유효하다.
- 초대 링크로 들어온 로그인 사용자는 해당 그룹 멤버로 upsert된다.
- 이미 오늘 visible 랭킹 기록이 있는 멤버는 즉시 그룹 랭킹에 포함된다.
- 그룹 참여 후 오늘 문제를 성공한 사용자는 성공 시점에 속한 그룹 랭킹에 자동 반영된다.
- 그룹 랭킹 응답은 이메일, 제출 답안, 정답, aliases, 해시 식별자를 포함하지 않는다.

### `/signin`

Google 로그인 화면이다.

로그인하면 성공 기록을 오늘의 랭킹에 올릴 수 있다는 상태를 보여준다.

Google OAuth를 먼저 시작한다. 신규 사용자처럼 프로필 닉네임이 없으면 로그인 콜백 뒤 `/nickname`으로 이동해 2~12자의 한국어, 영문, 숫자 닉네임을 설정한다. 기존 사용자 프로필은 로그인 시 덮어쓰지 않는다.

Threads, Instagram, 카카오톡처럼 Google OAuth가 `disallowed_useragent`로 차단될 수 있는 인앱 브라우저에서는 Google 로그인 제출 버튼을 바로 노출하지 않는다. 대신 현재 URL을 외부 브라우저에서 열거나 복사하도록 안내한다. 이 처리는 Google OAuth 정책 회피가 아니라, 사용자를 Safari/Chrome 같은 허용 브라우저로 이동시키는 오류 예방 UI다.

### `/nickname`

닉네임 설정 화면이다.

정책:

- 2~12자
- 한국어, 영문, 숫자 조합 우선
- 비어 있는 값 금지
- 이메일 노출 금지
- 신규 사용자는 Google 로그인 뒤 이 화면에서 닉네임을 설정한다.

### `/about`

서비스 소개 콘텐츠 화면이다.

노출:

- Narrow의 문제 형식과 핵심 재미
- 매일 KST 17:00 공개 정책
- 랭킹, 그룹, 평가 기능의 역할
- 개인정보/광고/문의 링크로 이어지는 운영 정보

광고 검수와 검색 노출을 위해 정적 문서 형태로 유지하며, 사용자의 풀이 상태나 로그인 상태에 의존하지 않는다.

### `/how-to-play`

플레이 방법 콘텐츠 화면이다.

노출:

- 5개 단서가 단계적으로 열리는 규칙
- 제출, 다음 단서, 실패/성공 조건
- 난이도 기준을 설명하는 예시 문제
- 랭킹과 그룹 참여 기준

정답 입력 UI를 포함하지 않는 설명 페이지이며, 광고 도입 시에도 플레이 CTA나 제출 동작 주변에 광고를 배치하지 않는다.

### `/archive`

지난 문제 아카이브 화면이다.

노출:

- 현재 활성 공개일보다 이전에 published 상태였던 문제 목록
- 공개일, 정답, 카테고리, 난이도, 단서 요약
- 오늘 활성 문제는 제외해 스포일러를 막는다.

DB 조회는 서버 컴포넌트에서 admin client로 수행한다. 브라우저 클라이언트가 `puzzles.answer`, `puzzles.aliases`, 잠긴 단서를 직접 조회하지 않는다. 아카이브는 이미 지난 문제만 보여주므로 정답 노출이 허용된다.

### 광고 스크립트 정책

AdSense 사이트 소유권/검수 확인을 위해 Google이 요구하는 publisher 스크립트는 전역 `<head>`에 둘 수 있다. 단, 승인 전에는 광고 슬롯이나 Auto ads 배치 정책을 켜지 않는다. 승인 후 광고를 붙일 때도 `/about`, `/how-to-play`, `/archive`처럼 게시자 콘텐츠가 있는 화면부터 제한적으로 적용하고, `/`, `/result`, `/ranking`, `/signin`, `/nickname` 같은 상호작용 중심 화면에는 별도 검토 없이 광고를 붙이지 않는다.

### 전역 내비게이션 정책

상단 메뉴는 모든 화면에서 같은 위치에 표시한다. 브랜드 링크는 홈으로 이동하고, 주요 콘텐츠 메뉴는 `플레이 방법`, `지난 문제`를 노출한다. 개인정보처리방침, 이용약관, 문의, 소개는 푸터에 둔다.

## API 범위

### `GET /api/today`

오늘 활성 공개일 기준 published publication을 반환한다. 활성 공개일은 KST 17:00부터 다음날 KST 17:00 직전까지 유지된다. KST 17:00 이후 활성 공개일 publication이 아직 없으면 서버가 공개 로직을 즉시 실행해 cron 지연으로 인한 빈 상태를 줄인다.

반환 가능:

- `publicationId`
- `publishDateKst`
- `category`
- `difficulty`
- 공개된 단서 목록
- 사용자 attempt summary
- 현재 확성기 메시지

### `GET /api/leaderboard/group`

초대 코드에 해당하는 오늘 그룹 랭킹을 반환한다. 비로그인 사용자는 그룹 정보와 로그인 필요 상태만 받는다. 로그인 + 닉네임 사용자는 요청 시 그룹 멤버로 참여한다.

### `POST /api/groups`

활성 공개일의 그룹 랭킹 초대 링크를 만든다. 로그인 + 닉네임 설정이 필요하다.

### `POST /api/groups/join`

초대 코드로 활성 공개일의 그룹에 참여한다. 로그인 + 닉네임 설정이 필요하다.

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

### `GET /api/leaderboard/streak`

로그인 사용자의 현재 연승 랭킹을 반환한다. 비로그인 요청도 공개 연승 랭킹 목록은 볼 수 있지만, `isMe`와 `myRank`는 로그인 사용자에게만 계산된다.

정렬 기준:

```text
1순위: current_streak desc
2순위: last_success_publish_date_kst desc
3순위: longest_streak desc
4순위: total_success_count desc
```

반환 가능:

- rank
- nickname
- current_streak
- longest_streak
- total_success_count
- last_success_publish_date_kst

반환 금지:

- email
- answer
- aliases
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
- 기존 메시지가 있어도 현재 1등이면 같은 publication의 메시지 row를 자신의 랭킹 기록으로 덮어쓰기
- `visible_until`은 다음 공개 전까지로 설정

### `GET /api/puzzle-feedback/daily`

오늘 문제의 visible 평가 목록을 반환한다.

서버 책임:

- 오늘 publication 조회
- 현재 사용자의 로그인 상태 확인
- 현재 사용자가 오늘 문제를 완료했는지 확인
- 완료하지 않은 사용자는 목록 대신 작성/조회 불가 상태를 반환
- visible 평가만 최신순으로 반환

반환 가능:

- `canRead`
- `canWrite`
- `items[].id`
- `items[].nickname`
- `items[].rating` 또는 `items[].reaction`
- `items[].comment`
- `items[].created_at`
- `myFeedback`

반환 금지:

- email
- answer
- aliases
- submitted_answer
- normalized_answer
- device_hash
- ip_hash
- user_agent_hash

### `POST /api/puzzle-feedback`

오늘 문제를 완료한 로그인 사용자가 평가와 한마디를 작성하거나 수정한다.

서버 책임:

- 로그인 확인
- 닉네임 확인
- 오늘 publication 조회
- 현재 사용자의 오늘 문제 완료 attempt 확인
- `rating/reaction` 허용값 검증
- `comment` 1~140자 검증
- `publication_id, user_id` 기준 upsert
- 응답에서 정답, 제출 답안, 이메일, 해시 식별자를 제외

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
  api/puzzle-feedback/daily/route.ts
  api/puzzle-feedback/route.ts
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
