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

후보 승인:

```bash
npm run puzzles:review -- --id <id> --status approved
```

후보 반려:

```bash
npm run puzzles:review -- --id <id> --status rejected --reason "사유"
```

예약:

```bash
npm run puzzles:schedule -- --id <id>
```

예약은 `approved` 상태이고 최소 품질 점수 이상인 문제만 가능하다.

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
- 하루 한 문제 공개 제약이 있는가
- 같은 공개 문제에서 사용자별 랭킹 기록이 하나만 허용되는가
- 랭킹 정렬 기준이 제품 기획과 일치하는가
- 이메일, 제출 답안, device/ip/user-agent hash가 공개 랭킹 API에 노출되지 않는가
- 그룹 랭킹 참여 테이블이 중복 참여를 막는가

계약이 실패하면 API 구현을 진행하지 않는다. 필요한 변경은 먼저 제품 기획, DB 아키텍처, `schema/database-contract.json`을 함께 갱신한다.

실제 DB 적용 SQL은 `supabase/migrations/20260510190000_initial_pinpoint_schema.sql`에 둔다. 적용 절차는 `docs/database-setup.md`를 따른다.

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

1. 오후 5시 공개분이 충분한지 확인한다.
2. 부족하면 후보 문제를 생성하고 dry-run 검증한다.
3. 통과한 후보를 저장한다.
4. 운영자가 후보를 읽고 승인 또는 반려한다.
5. 승인된 문제를 다음 공개일 오후 5시로 예약한다.
6. 스케줄러 또는 운영자가 `puzzles:publish`를 실행한다.

## 리포트 확인

하네스 실행 후 `reports/puzzle-harness-report.json`을 확인한다. 이 파일에는 입력 파일, dry-run 여부, 추가 후보 수, 검증 이슈, 스코어링 결과, 실행 시각이 기록된다.
