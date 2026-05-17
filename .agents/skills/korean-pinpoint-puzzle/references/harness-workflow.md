# Pinpoint 하네스 워크플로우

이 문서는 한국어 Pinpoint 문제 하네스의 기준 문서다. 스킬, 스크립트, 데이터 파일을 수정할 때는 이 문서의 상태값과 파일 경로를 우선한다.

## 파일 경로

- 후보 문제 저장소: `data/puzzle-candidates.ko.json`
- 예약/공개 문제 저장소: `data/daily-puzzles.ko.json`
- 문제 데이터 스키마: `schema/puzzle.schema.json`
- 품질 정책 config: `config/puzzle-policy.json`
- fixture: `fixtures/valid-candidates.json`, `fixtures/invalid-candidates.json`
- 하네스 리포트: `reports/puzzle-harness-report.json`
- 공통 저장소/검증 로직: `scripts/lib/puzzle-store.js`
- 전체 하네스 CLI: `scripts/run-puzzle-harness.js`
- 후보 추가 CLI: `scripts/add-puzzle-candidates.js`
- 검증 CLI: `scripts/validate-puzzles.js`
- 스코어링 CLI: `scripts/score-puzzles.js`
- 리뷰 CLI: `scripts/review-puzzle.js`
- 예약 CLI: `scripts/schedule-daily-puzzle.js`
- 공개 CLI: `scripts/publish-daily-puzzle.js`
- DB 동기화 CLI: `scripts/db-sync-puzzles.js`
- DB 공개 CLI: `scripts/db-publish-daily.js`
- fixture 테스트 CLI: `scripts/test-puzzle-harness.js`

## 상태 흐름

문제는 아래 상태를 따른다.

```text
generated -> scheduled -> published
          -> rejected
```

- `generated`: AI가 생성하고 하네스 품질 기준을 통과한 후보. 예약/공개에 바로 사용할 수 있다.
- `scheduled`: 공개 시각이 배정된 상태.
- `published`: 실제 공개된 상태.
- `rejected`: 품질 문제로 반려된 상태.

현재 MVP에는 관리자 페이지가 없으므로 `rejected` 변경은 `npm run puzzles:review`로 처리한다. 승인 단계는 사용하지 않는다.

## 데이터 구조

각 문제는 다음 필드를 기본으로 가진다.

```json
{
  "id": "ko-20260509170000-ab123",
  "answer": "출입국",
  "aliases": ["출입국 심사", "입국심사", "출국심사"],
  "category": "사회/제도",
  "difficulty": 4,
  "clues": ["경계", "통과", "도장", "비자", "여권"],
  "rationale": "초반에는 이동과 경계로 열어두고, 후반에는 비자와 여권으로 출입국 절차에 수렴한다.",
  "status": "generated",
  "qualityScore": 92,
  "issueFlags": [],
  "scheduledAt": null,
  "publishedAt": null,
  "createdAt": "2026-05-09T08:00:00.000Z",
  "updatedAt": "2026-05-09T08:00:00.000Z"
}
```

## CLI 명령

전체 하네스 실행:

```bash
npm run puzzles:harness -- --input tmp/candidates.json
```

저장 없이 검증:

```bash
npm run puzzles:harness -- --input tmp/candidates.json --dry-run
```

전체 하네스는 에이전트가 직접 작성한 후보 JSON을 검증하고 스코어링한 뒤, 통과한 경우에만 저장한다. `--dry-run`을 쓰면 운영 데이터에 저장하지 않고 리포트만 만든다. 예약은 별도 요청이 있을 때만 수행한다.

입력 JSON은 배열 또는 `{ "puzzles": [...] }` 형식을 허용한다.

예약까지 자동으로 테스트하려면:

```bash
npm run puzzles:harness -- --input tmp/candidates.json --schedule
```

후보 추가 저수준 명령:

```bash
npm run puzzles:add -- --input tmp/candidates.json --dry-run
```

후보 생성 자체는 스크립트가 하지 않는다. 사용자가 요청할 때 에이전트가 스킬 규칙에 따라 후보를 작성한다. 일반 작업에서는 `puzzles:add`를 직접 쓰지 말고 `puzzles:harness`를 사용한다. `puzzles:add`는 하네스 내부 또는 디버깅용 저수준 명령이며, 직접 저장하려면 `--unsafe-write`가 필요하다.

검증:

```bash
npm run puzzles:validate
```

스코어링 결과 저장:

```bash
npm run puzzles:score -- --write
```

fixture 테스트:

```bash
npm run puzzles:test
```

후보 반려:

```bash
npm run puzzles:review -- --id ko-20260509170000-ab123 --status rejected --reason "정답이 너무 넓음"
```

문제 예약:

```bash
npm run puzzles:schedule
```

특정 문제를 특정 시각에 예약:

```bash
npm run puzzles:schedule -- --id ko-20260509170000-ab123 --at 2026-05-10T08:00:00.000Z
```

한국 시간 오후 5시는 UTC 기준 오전 8시다.

예약된 문제 공개:

```bash
npm run puzzles:publish
```

앱 DB에 예약 반영:

```bash
npm run db:sync-puzzles
```

앱 DB 기준 오늘 문제 공개:

```bash
npm run db:publish-daily
```

`puzzles:publish`는 JSON 운영 원장 상태를 바꾸는 명령이다. 현재 앱은 Supabase DB를 읽으므로, 실제 노출에는 `db:sync-puzzles`와 `db:publish-daily` 또는 cron route가 필요하다.

## 작업 원칙

- 스킬의 생성 규칙과 스크립트의 검증 규칙이 충돌하면 이 문서를 먼저 갱신한 뒤 양쪽을 맞춘다.
- 사용자가 전체 파이프라인 실행을 요청하면 에이전트가 후보 JSON을 작성한 뒤 `npm run puzzles:harness -- --input <파일> --dry-run`을 먼저 실행한다.
- 일반 후보 저장은 `puzzles:harness`만 사용한다. `puzzles:add`는 게이트를 우회할 수 있으므로 수동 운영 명령으로 쓰지 않는다.
- 새 상태값을 추가할 때는 이 문서, `scripts/lib/puzzle-store.js`, 관련 CLI를 함께 수정한다.
- 새 데이터 필드를 추가할 때는 이 문서의 데이터 구조 예시와 생성/검증/스코어링 로직을 함께 갱신한다.
- 검증 로직을 바꿀 때는 `fixtures/`와 `npm run puzzles:test` 결과를 함께 확인한다.
- 저장형 하네스는 실패 후보를 운영 데이터에 저장하면 안 된다.
- 예약은 최소 품질 점수를 만족하는 generated 후보를 허용한다.
- 게임 앱은 Supabase `puzzle_publications`의 `published` 문제를 읽는다. JSON은 후보 생성, 리뷰, 예약을 위한 운영 원장으로 유지한다.
