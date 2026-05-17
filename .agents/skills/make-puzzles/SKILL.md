---
name: make-puzzles
description: 사용자가 `$make-puzzles 10`처럼 요청하면 한국어 Pinpoint 문제 후보를 지정 개수만큼 만들고, 프로젝트 기획/스킬 규칙을 따른 뒤 하네스 dry-run, fixture 테스트, 검증 리포트 확인까지 수행한다. Korean Pinpoint puzzle batch generation harness dry-run.
---

# Make Puzzles

이 스킬은 한국어 Pinpoint 문제 후보를 빠르게 만들기 위한 호출용 스킬이다. 사용자가 `$make-puzzles 10`, `$make-puzzles 5개`, `make-puzzles 3`처럼 요청하면 지정 개수만큼 후보를 만든다. 숫자가 없으면 기본 5개를 만든다.

## 필수 기준

작업 전 반드시 아래 문서를 읽고 따른다.

1. `docs/product-plan.md`
2. `docs/harness-architecture.md`
3. `docs/operations.md`
4. `.agents/skills/korean-pinpoint-puzzle/SKILL.md`
5. `.agents/skills/korean-pinpoint-puzzle/references/puzzle-rules.md`
6. `.agents/skills/korean-pinpoint-puzzle/references/harness-workflow.md`

이 스킬은 문제 품질 기준을 자체 정의하지 않는다. 모든 기준은 위 문서에서 가져온다.

## 실행 절차

1. 사용자 메시지에서 생성 개수를 파싱한다.
   - 예: `$make-puzzles 10` -> 10개
   - 숫자가 없으면 5개
   - 1 미만이면 1개, 20 초과면 20개로 제한한다.
2. 기준 문서를 읽고 난이도 4 이상 후보를 만든다.
3. 후보 JSON을 `tmp/make-puzzles-candidates.json`에 작성한다.
4. 먼저 저장 없이 dry-run을 실행한다.

```bash
npm run puzzles:harness -- --input tmp/make-puzzles-candidates.json --dry-run
```

5. 실패하면 후보를 수정하고 dry-run을 다시 실행한다.
6. dry-run이 통과하면 fixture 회귀 테스트를 실행한다.

```bash
npm run puzzles:test
```

7. 최종 보고에는 후보 목록, dry-run 결과, 리포트 위치, 저장 여부를 포함한다.

## 저장 정책

기본 동작은 dry-run까지다. 운영 후보 저장은 사용자가 `저장까지`, `저장해줘`, `운영 데이터에 넣어줘`처럼 명시했을 때만 실행한다.

```bash
npm run puzzles:harness -- --input tmp/make-puzzles-candidates.json
```

예약, DB 동기화, 공개는 별도 요청이 있을 때만 수행한다. 승인 단계는 쓰지 않는다. 앱에 실제로 노출하려면 JSON 예약만으로는 부족하고 Supabase 동기화가 필요하다.

예약 후 DB까지 반영해야 하는 요청이면 다음 흐름을 사용한다.

```bash
npm run puzzles:schedule -- --id <id> --sync-db
```

이미 예약된 JSON을 DB에 반영해야 하면 다음 명령을 사용한다.

```bash
npm run db:sync-puzzles
```

공개 시각 처리는 DB 기준 명령을 사용한다.

```bash
npm run db:publish-daily
```

## 출력 원칙

- 후보는 정답, 별칭, 카테고리, 난이도, 단서 5개, rationale을 포함한다.
- 하네스 실패 이슈가 있으면 숨기지 말고 원인과 수정 결과를 보고한다.
- 통과한 후보라도 의미 품질은 운영자 최종 리뷰 대상임을 명시한다.
- 임시 파일은 다음 수정/저장을 위해 유지할 수 있다. 사용자가 정리를 요청하면 삭제한다.
