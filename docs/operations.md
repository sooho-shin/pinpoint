# 운영 절차

## 후보 생성 요청

사용자가 "오늘 문제 후보 만들어줘" 또는 "하네스 돌려줘"라고 요청하면 에이전트는 다음 순서로 작업한다.

1. `.agents/skills/korean-pinpoint-puzzle/SKILL.md`를 읽는다.
2. `docs/product-plan.md`와 `docs/harness-architecture.md`를 확인한다.
3. `.agents/skills/korean-pinpoint-puzzle/references/puzzle-rules.md`를 확인한다.
4. 후보 문제 JSON을 `tmp/candidates.json` 형식으로 작성한다.
5. dry-run으로 하네스를 실행한다.
6. 이슈가 있으면 후보를 수정한다.
7. 최종 후보를 운영 데이터에 저장한다.

짧은 호출은 프로젝트 로컬 스킬 `$make-puzzles`를 사용한다.

```text
$make-puzzles 10
```

이 요청은 후보 10개 생성, dry-run 하네스 실행, fixture 테스트, 결과 보고까지 수행한다. 기본은 dry-run까지이며, 운영 데이터 저장은 사용자가 명시적으로 요청했을 때만 수행한다.

## 기본 명령

저장 없이 검증:

```bash
npm run puzzles:harness -- --input tmp/candidates.json --dry-run
```

저장까지 실행:

```bash
npm run puzzles:harness -- --input tmp/candidates.json
```

저장형 실행도 먼저 검증/스코어링을 수행한다. 실패 이슈가 있거나 `config/puzzle-policy.json`의 최소 품질 점수보다 낮으면 운영 데이터에 저장하지 않는다.

fixture 기반 테스트:

```bash
npm run puzzles:test
```

후보 저장은 반드시 `puzzles:harness`를 사용한다. `puzzles:add`는 하네스 내부 또는 디버깅용 저수준 명령이므로 운영 루틴에서 직접 사용하지 않는다.

후보 반려:

```bash
npm run puzzles:review -- --id <id> --status rejected --reason "사유"
```

예약:

```bash
npm run puzzles:schedule -- --id <id>
```

예약은 최소 품질 점수 이상인 `generated` 문제를 바로 사용한다. 별도 승인 단계는 없다.

공개:

```bash
npm run puzzles:publish
```

## 데이터베이스/API 계약

백엔드 API, DB migration, 인증/랭킹 구현을 시작하기 전에는 데이터베이스 계약을 먼저 확인한다.

참조 문서:

1. `docs/product-plan.md`
2. `docs/database-architecture.md`
3. `schema/database-contract.json`

검증 명령:

```bash
npm run db:check
```

이 검증은 다음 기준을 확인한다.

- Google 로그인 사용자와 공개 닉네임 프로필이 분리되어 있는가
- 문제 원본과 일일 공개 이벤트가 분리되어 있는가
- 풀이 기록과 랭킹 노출 데이터가 분리되어 있는가
- 오늘 공개 문제는 하나지만 모든 로그인 사용자와 익명 세션이 각자의 attempt로 풀 수 있는가
- 다른 사용자의 성공/1등/terminal attempt가 현재 사용자의 풀이 시작이나 제출을 막지 않는가
- 하루 한 문제 공개 제약이 있는가
- 같은 공개 문제에서 사용자별 랭킹 기록이 하나만 허용되는가
- 랭킹 정렬 기준이 제품 기획과 일치하는가
- 사용자별 일일 결과와 연승 projection이 분리되어 있고 연승 랭킹 정렬 기준이 제품 기획과 일치하는가
- 오늘의 1등 확성기 메시지가 랭킹 projection과 분리되어 있는가
- 확성기 메시지가 100자 제한, publication별 유니크 제약, 다음 공개 전까지의 노출 기간을 가지는가
- 이메일, 제출 답안, device/ip/user-agent hash가 공개 랭킹 API에 노출되지 않는가
- 그룹 랭킹 참여 테이블이 중복 참여를 막는가

계약이 실패하면 API 구현을 진행하지 않는다. 필요한 변경은 먼저 제품 기획, DB 아키텍처, `schema/database-contract.json`을 함께 갱신한다.

실제 DB 적용 SQL은 `supabase/migrations/`의 migration 파일들에 둔다. 적용 절차는 `docs/database-setup.md`를 따른다.

## 프론트엔드/백엔드 앱 계약

사용자가 프론트엔드, 백엔드, Next.js 앱, Supabase API 구현을 요청하면 프로젝트 로컬 스킬 `$make-pinpoint-app`를 사용한다.

```text
$make-pinpoint-app
```

구현 전에 다음 문서와 계약을 확인한다.

1. `docs/app-architecture.md`
2. `docs/app-harness-architecture.md`
3. `schema/app-contract.json`
4. `docs/product-plan.md`
5. `docs/database-architecture.md`
6. `docs/design-plan.md`

앱 구현 전 계약 검증:

```bash
npm run app:contract
```

앱 구현 중 또는 구현 후 검증:

```bash
npm run app:check
```

구현 파일까지 반드시 존재해야 하는 단계에서는 다음 명령을 사용한다.

```bash
npm run app:implementation:check
```

앱 구현은 Next.js App Router와 Route Handler를 기준으로 한다. 브라우저 Supabase client로 `puzzles`를 직접 읽거나, terminal result 전 정답/별칭/잠긴 단서를 응답하는 구현은 금지한다.

## Figma 디자인 요청

사용자가 Figma 디자인 생성을 요청하면 프로젝트 로컬 스킬 `$make-figma-design`를 사용한다.

```text
$make-figma-design
```

이 요청은 디자인 우선 흐름을 따른다.

```text
디자인 기획
→ Figma 디자인 시스템 생성
→ Figma 화면 생성
→ 디자인 검증
→ 앱 코드 구현
→ Code Connect 연결
```

초기 Figma 디자인 생성 단계에서는 Code Connect를 실행하지 않는다.

## 매일 운영 루틴

### 라이브 상태 점검

운영 상태를 보고하거나 reset/dev reset 전에 반드시 Supabase 기준 상태를 먼저 확인한다. 로컬 JSON은 후보/예약 원장이지만 앱 노출의 source of truth는 Supabase `puzzle_publications`와 관련 projection 테이블이다.

기본 점검:

```bash
npm run db:status
```

이 명령은 읽기 전용으로 다음 항목을 JSON 리포트로 출력한다.

- 활성 KST 공개일과 해당 publication 상태
- 연결된 puzzle의 id, category, difficulty, clue count
- 오늘 publication의 attempts 상태별 수, ranked 수, 로그인/익명 분포
- leaderboard visible/flagged/hidden 수와 로그인/익명 분포
- winner message, daily feedback, group/member/group leaderboard 집계
- 다음 7일 publication queue
- quality 70 이상 unused generated/approved 후보 수
- custom game active/hidden/deleted 집계

기본 출력은 오늘 정답과 단서 본문을 숨긴다. 정답 확인이 운영상 꼭 필요할 때만 명시적으로 실행한다.

```bash
npm run db:status -- --show-answer
```

특정 공개일이나 테스트 시각을 기준으로 볼 수 있다.

```bash
npm run db:status -- --date 2026-06-16
npm run db:status -- --now 2026-06-16T08:10:00.000Z
```

점검 결과 해석 기준:

- `activePublication`이 `null`이면 오늘 활성 공개일의 앱 노출 문제가 먼저다. `publicationQueue.nextSevenDays`와 `unusedGeneratedOrApprovedCandidatesOverQuality70`를 확인한 뒤 `npm run db:publish-daily` 또는 cron 로그를 본다.
- `activePublication.status`가 `scheduled`이면 아직 공개 전이거나 publish job이 돌지 않은 상태다.
- attempts는 있는데 leaderboard가 비어 있으면 사용자가 성공하지 않았거나 닉네임 등록/flagged 상태를 확인한다.
- leaderboard는 있는데 group leaderboard가 비어 있으면 그룹 참여와 projection 동기화 경로를 본다.
- winner message가 visible인데 화면에 보이지 않으면 `visibleUntil`과 현재 active publication이 맞는지 확인한다.
- reset 전에는 이 리포트를 먼저 저장하거나 요약해 삭제 범위를 명확히 한다.

1. 오후 5시 공개분이 충분한지 확인한다.
2. 부족하면 후보 문제를 생성하고 dry-run 검증한다.
3. 통과한 후보를 저장한다.
4. 품질 기준을 통과한 후보를 다음 공개일 오후 5시로 예약한다.
5. 문제가 명백히 부적절하면 반려한다.
6. 예약된 문제를 Supabase에 동기화한다.
7. 스케줄러 또는 운영자가 KST 오후 5시 이후 DB 공개 명령을 실행한다.

운영 후보 생성/검증은 JSON 파일을 기준으로 한다. 실제 앱은 Supabase DB를 읽으므로, 공개 예약 후에는 반드시 DB 동기화가 필요하다.

현재 문제 운영 기준은 "누구나 아는 단어"다. 새 후보를 만들 때는 난이도 2~3만 사용하고, 정답 자체를 알기 위해 전문 교양이나 분야 배경지식이 필요한 문제는 만들지 않는다. `config/puzzle-policy.json`의 `allowedDifficulties`, `specializedAnswerTerms`, `specializedClueTerms`가 이 기준의 자동 게이트다.

```bash
npm run db:sync-puzzles
```

이 명령은 `data/puzzle-candidates.ko.json`의 generated/반려 문제와 `data/daily-puzzles.ko.json`의 예약/공개 문제를 Supabase `puzzles`, `puzzle_publications`에 반영한다.
이미 Supabase에 `published` 상태로 올라간 같은 공개일 row는 로컬 JSON의 `scheduled` 상태로 되돌리지 않는다. 운영 중인 공개 문제를 바꿔야 할 때는 일반 sync가 아니라 명시적인 reset/dev reset 절차를 사용한다.

DB 기준 공개:

```bash
npm run db:publish-daily
```

이 명령은 KST 오늘 날짜의 `scheduled` publication 중 `scheduled_at <= now()`인 row를 `published`로 바꾼다. 오늘 row가 없으면 Supabase의 미사용 `generated` 후보 중 품질 기준을 통과한 문제를 골라 오늘 `published` row를 만든다. KST 17:00 전에는 실행해도 공개하지 않는다. 수동 테스트는 `-- --force`를 붙인다.

Vercel 배포에서는 `vercel.json`의 cron이 UTC 08:00, 즉 KST 17:00에 `/api/cron/publish-daily`를 호출한다. 서버 프로세스가 계속 실행되는 방식이 아니라, 스케줄러가 하루 한 번 HTTP 요청을 보내는 방식이다. Vercel Hobby cron은 지정 hour 안에서 지연될 수 있으므로, `/api/today` 조회도 17:00 이후 활성 공개일 row가 없으면 같은 공개 로직을 실행하는 보조 안전장치 역할을 한다.
cron 또는 `/api/today` 공개 보완 로직이 실패하면 route handler가 Vercel 함수 로그에 에러 scope와 stack을 남긴다. 17시 이후 문제가 보이지 않으면 `/api/cron/publish-daily` 응답의 `skippedReason`, Vercel function log, Supabase의 `puzzle_publications` 상태를 함께 확인한다.

권장 수동 운영 예:

```bash
npm run puzzles:schedule -- --id <id> --sync-db
```

예약 상태 확인 후 공개 시각에:

```bash
npm run db:publish-daily
```

## 리포트 확인

하네스 실행 후 `reports/puzzle-harness-report.json`을 확인한다. 이 파일에는 입력 파일, dry-run 여부, 추가 후보 수, 검증 이슈, 스코어링 결과, 실행 시각이 기록된다.
