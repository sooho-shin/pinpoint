# Narrow

Narrow는 매일 한 문제씩 공개되는 한국어 연상 퍼즐 게임이다. 플레이어는 순서대로 공개되는 5개의 단서를 보고 하나의 정답을 맞힌다. 핵심 재미는 모호한 단서가 점점 하나의 답으로 수렴하는 순간에 있다.

## 현재 상태

### 제품 기획

- 하루 한 문제를 KST 오후 5시에 공개한다.
- 사용자는 5개 단서 안에 정답을 맞힌다.
- 적은 단서로 맞힐수록 결과 공유와 랭킹 가치가 높다.
- MVP 랭킹은 `오늘의 랭킹`과 `그룹 랭킹`을 우선한다.
- 로그인 사용자의 연속 정답일은 `연승 랭킹`으로 별도 표시한다.
- 오늘의 랭킹 1등은 다음 문제가 공개될 때까지 메인 최상단에 100자 메시지를 고정할 수 있다.
- 오늘 문제 풀이, 결과 확인, 랭킹 조회는 로그인 없이 시작할 수 있다.
- 성공한 비로그인 사용자는 닉네임을 입력해 오늘의 랭킹에 등록할 수 있다.
- 그룹 참여, 1등 메시지, 문제 평가는 Google 로그인 후 닉네임을 연결한다.
- 로그인 없이 커스텀 Pinpoint 게임을 만들고 링크로 공유할 수 있다.
- 이메일은 랭킹/그룹/공유 화면에 노출하지 않는다.

관련 문서:

- `docs/product-plan.md`
- `docs/design-plan.md`
- `docs/app-architecture.md`

### Figma 디자인

Figma 디자인 파일:

```text
https://www.figma.com/design/2ItGTte1dpGtKzTjCOQFhW
```

현재 반영된 화면:

- Today Puzzle
- Solved Result
- Failed Result
- Share Preview
- Daily Ranking
- Group Ranking
- Ranking Empty State
- Admin Review
- Sign In
- Nickname Setup
- Custom Game Create
- Custom Game Play
- Custom Game Ranking
- Custom Game Manage

로그인 기반 화면도 추가되어 있다.

- Google 로그인 화면
- 닉네임 설정 화면
- Google 로그인/닉네임 연동 prototype note

관련 파일:

- `docs/figma-architecture.md`
- `docs/figma-operations.md`
- `design/tokens.json`
- `design/components.json`
- `design/screens.json`
- `reports/figma-design-report.json`
- `reports/figma-screens/`

### 데이터베이스

Supabase 프로젝트가 생성되었고, 실제 원격 Supabase DB에 초기 테이블 migration이 적용되었다.

프로젝트:

```text
project ref: ktbwxwzxsljjhtallios
project url: https://ktbwxwzxsljjhtallios.supabase.co
```

생성된 테이블:

- `profiles`
- `puzzles`
- `puzzle_publications`
- `attempts`
- `leaderboard_entries`
- `daily_winner_messages`
- `daily_puzzle_feedback`
- `user_daily_results`
- `user_streaks`
- `groups`
- `group_members`
- `group_leaderboard_entries`
- `custom_games`
- `custom_game_attempts`
- `custom_game_reports`

RLS는 위 테이블 모두 활성화되어 있다.

Migration 파일:

```text
supabase/migrations/20260510190000_initial_pinpoint_schema.sql
supabase/migrations/20260511120000_add_daily_winner_messages.sql
supabase/migrations/20260515183000_add_anonymous_attempt_lookup_index.sql
supabase/migrations/20260517100000_add_attempt_uniqueness_for_claiming.sql
supabase/migrations/20260517143000_add_daily_puzzle_feedback.sql
supabase/migrations/20260518120000_add_user_streaks.sql
supabase/migrations/20260523180500_harden_public_table_grants.sql
supabase/migrations/20260523190000_allow_anonymous_share_groups.sql
supabase/migrations/20260611132000_add_custom_games.sql
```

DB 설계 원칙:

- Google Auth 사용자와 공개 프로필을 분리한다.
- 문제 원본과 일일 공개 이벤트를 분리한다.
- 풀이 기록과 랭킹 노출 데이터를 분리한다.
- 일일 완료 결과와 연승 projection을 분리한다.
- 같은 공개 문제에서 사용자별 랭킹 기록은 하나만 허용한다.
- 비로그인 랭킹은 `anonymous_session_id`와 닉네임 snapshot으로 분리한다.
- 커스텀 게임은 일일 publication과 별도 테이블에서 관리한다.
- 공개 문제별 1등 확성기 메시지는 하나만 노출한다.
- 이메일, 제출 답안, device/ip/user-agent hash는 공개 API에 노출하지 않는다.

관련 문서:

- `docs/database-architecture.md`
- `docs/database-setup.md`
- `schema/database-contract.json`

### 앱 구현

현재 Next.js App Router 구현은 다음 범위를 포함한다.

- 오늘 문제 플레이: `/`, `/api/today`, `/api/attempts/*`
- 결과와 랭킹: `/result`, `/ranking`, `/api/leaderboard/*`
- Google 로그인과 닉네임 설정: `/signin`, `/auth/callback`, `/nickname`
- 오늘의 1등 확성기: `/api/winner-message/*`
- 문제 평가와 한마디: `/api/puzzle-feedback/*`
- 그룹 공유 랭킹: `/api/groups`, `/api/groups/join`, `/api/leaderboard/group`
- 커스텀 게임 생성/플레이/랭킹/관리: `/custom/*`, `/api/custom-games/*`
- 게시자 콘텐츠와 SEO/광고 보조 route: `/about`, `/how-to-play`, `/archive`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, `/ads.txt`

앱 구현 기준:

- `docs/app-architecture.md`
- `docs/app-harness-architecture.md`
- `schema/app-contract.json`
- `.agents/skills/make-pinpoint-app/SKILL.md`

## 남은 운영 설정

### 1. Google OAuth 설정

DB와 앱 코드는 준비되어 있지만, 운영 환경에서는 Supabase Auth Provider 설정이 별도로 필요하다.

해야 할 일:

1. Google Cloud에서 OAuth Client ID/Secret 생성
2. Supabase Dashboard에서 `Authentication > Providers > Google` 열기
3. Google Provider 활성화
4. Client ID와 Client Secret 입력
5. Redirect URL 확인

Supabase callback URL:

```text
https://ktbwxwzxsljjhtallios.supabase.co/auth/v1/callback
```

Supabase Auth URL 설정:

```text
Site URL: https://pinpoint-seven.vercel.app
Additional Redirect URLs:
https://pinpoint-seven.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Vercel 환경 변수 `NEXT_PUBLIC_SITE_URL`도 운영에서는 반드시 `https://pinpoint-seven.vercel.app`로 둔다.

광고와 분석을 켜려면 Vercel 환경 변수에 다음 값을 추가한다.

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-4621241846705196
NEXT_PUBLIC_GOOGLE_ADSENSE_SCRIPT_ENABLED=true
NEXT_PUBLIC_CONTACT_EMAIL=contact@example.com
```

`NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`는 `/ads.txt`와 사이트 확인용 publisher 스크립트에 사용한다. `NEXT_PUBLIC_GOOGLE_ADSENSE_SCRIPT_ENABLED=false`로 두면 긴급하게 전역 스크립트를 끌 수 있다. AdSense 콘솔에서는 승인 전후 모두 Auto ads를 별도로 켜지 않는다. 광고 슬롯은 플레이, 로그인, 랭킹 같은 상호작용 중심 화면이 아니라 `/about`, `/how-to-play`, `/archive`처럼 게시자 콘텐츠가 충분한 화면부터 제한적으로 붙인다.

### 2. 운영 데이터 관리

새 문제 후보, 오늘 문제 공개, 리셋은 로컬 JSON만 바꾸는 방식이 아니라 하네스와 Supabase 동기화 절차를 따른다.

- 후보 생성과 저장은 `puzzles:harness`를 사용한다.
- 예약 문제는 `db:sync-puzzles`로 Supabase에 반영한다.
- KST 17:00 공개는 Vercel cron 또는 `db:publish-daily`가 처리한다.
- 오늘 공개 문제를 바꾸거나 풀이 상태를 초기화할 때는 reset/dev reset 스크립트를 사용한다.
- 현재 라이브 상태 보고가 필요하면 `puzzle_publications`와 `puzzles`를 먼저 조회한다.

### 3. 큰 변경 전 검증

API 구현 전 반드시 DB 계약을 확인한다.

```bash
npm run db:check
```

프론트엔드/백엔드 앱 계약도 먼저 확인한다.

```bash
npm run app:contract
```

## 명령어

### 퍼즐 하네스

후보 검증 dry-run:

```bash
npm run puzzles:harness -- --input tmp/candidates.json --dry-run
```

후보 저장:

```bash
npm run puzzles:harness -- --input tmp/candidates.json
```

fixture 테스트:

```bash
npm run puzzles:test
```

후보 예약:

```bash
npm run puzzles:schedule -- --id <id>
```

예약과 동시에 앱 DB에 반영:

```bash
npm run puzzles:schedule -- --id <id> --sync-db
```

JSON 운영 원장 공개:

```bash
npm run puzzles:publish
```

앱 DB 동기화:

```bash
npm run db:sync-puzzles
```

앱 DB 기준 오늘 공개:

```bash
npm run db:publish-daily
```

배포 환경에서는 `vercel.json`의 cron이 UTC 08:00, 즉 KST 오후 5시에 `/api/cron/publish-daily`를 호출한다. 오늘 예약 row가 없으면 미사용 generated 후보를 자동으로 공개한다. 별도 상주 프로세스를 계속 실행하지 않는다.

라이브 운영 상태 점검:

```bash
npm run db:status
```

이 명령은 Supabase를 읽기 전용으로 조회해 활성 공개일, publication 상태, attempt/leaderboard/feedback/group/winner message 집계, 다음 7일 예약, 커스텀 게임 상태를 JSON으로 출력한다. 기본 출력은 오늘 정답과 단서 본문을 숨긴다. 운영상 정답 확인이 꼭 필요하면 다음처럼 명시적으로 실행한다.

```bash
npm run db:status -- --show-answer
```

특정 KST 공개일 또는 테스트 시각 기준으로 확인:

```bash
npm run db:status -- --date 2026-06-16
npm run db:status -- --now 2026-06-16T08:10:00.000Z
```

### DB 하네스

DB 계약 검증:

```bash
npm run db:contract
```

Migration SQL 검증:

```bash
npm run db:migration:check
```

전체 DB 검증:

```bash
npm run db:check
```

### 앱 하네스

구현 전 계약 검증:

```bash
npm run app:contract
```

계약 및 구현 파일 검증:

```bash
npm run app:check
```

구현 파일 존재를 필수로 하는 검증:

```bash
npm run app:implementation:check
```

### Figma 검증

Figma 디자인 작업 후에는 layout contract와 composition contract를 확인한다.

```bash
npm run figma:layout:contract
npm run figma:composition:contract
```

Figma MCP로 audit 리포트를 만든 뒤에는 실제 리포트 검증도 실행한다.

```bash
npm run figma:layout:check
npm run figma:composition:check
```

검증 리포트:

```text
reports/figma-layout-report.json
reports/figma-composition-report.json
```

`figma:layout:check`는 화면과 컨트롤의 overflow를 막는다. `figma:composition:check`는 `02 Screens`와 `03 Admin`이 비어 있거나, 화면/상위 컴포넌트가 Atomic Design component instance를 쓰지 않는 경우 실패한다.

### Supabase migration 적용

Supabase CLI는 설치되어 있고, 이 repo는 프로젝트에 연결되어 있다.

새 migration을 실제 Supabase DB에 반영:

```bash
supabase db push
```

새 migration을 만들거나 수정한 뒤에는 먼저 다음을 실행한다.

```bash
npm run db:check
```

## 주요 디렉터리

```text
.agents/skills/                 프로젝트 로컬 Codex 스킬
config/                          퍼즐 품질 정책
data/                            JSON 기반 후보/일일 퍼즐 저장소
design/                          디자인 토큰/컴포넌트/화면 계약
docs/                            제품, 디자인, DB, 운영 문서
fixtures/                        하네스 테스트 fixture
reports/                         하네스/디자인/DB 리포트
schema/                          퍼즐 및 DB 계약
scripts/                         퍼즐/DB 하네스 스크립트
supabase/migrations/             실제 Supabase DB migration
```

## 주의

- `.env`와 Supabase secret key는 커밋하지 않는다.
- `supabase/.temp/`는 로컬 연결 캐시이며 커밋하지 않는다.
- 초기 Figma 디자인 단계에서는 Code Connect를 실행하지 않는다.
- 백엔드 API 작업 전에는 `npm run db:check`를 먼저 실행한다.
- 문제 후보 저장은 직접 JSON을 수정하지 말고 `puzzles:harness`를 사용한다.
