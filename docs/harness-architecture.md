# 하네스 아키텍처

## 목적

하네스는 한국어 Pinpoint 문제 후보를 운영 데이터에 넣기 전에 구조, 품질, 중복, 상태 흐름을 검증하는 장치다. 생성 자체는 에이전트가 수행하고, 하네스는 deterministic한 품질 게이트 역할을 한다.

## 설계 원칙

- 문제 생성과 검증을 분리한다.
- 데이터 계약은 `schema/puzzle.schema.json`에 둔다.
- 품질 정책 값은 `config/puzzle-policy.json`에 둔다.
- 검증기는 fixture로 회귀 테스트한다.
- 하네스 실행 결과는 `reports/`에 남긴다.
- 운영 데이터에 쓰기 전에 `--dry-run`으로 확인할 수 있어야 한다.
- 스킬은 `docs/`와 `references/`를 읽고 같은 기준으로 후보를 만든다.

## 주요 파일

- `docs/product-plan.md`: 제품 기획 기준
- `docs/harness-architecture.md`: 하네스 설계 기준
- `docs/operations.md`: 운영 절차
- `.agents/skills/korean-pinpoint-puzzle/SKILL.md`: 에이전트 작업 지침
- `.agents/skills/korean-pinpoint-puzzle/references/harness-workflow.md`: CLI 기준 문서
- `.agents/skills/korean-pinpoint-puzzle/references/puzzle-rules.md`: 문제 품질 규칙
- `schema/puzzle.schema.json`: 문제 데이터 스키마
- `config/puzzle-policy.json`: 최소 품질 점수와 쉬운 정답 차단 목록
- `fixtures/valid-candidates.json`: 통과해야 하는 샘플
- `fixtures/invalid-candidates.json`: 실패해야 하는 샘플
- `data/puzzle-candidates.ko.json`: 후보 저장소
- `data/daily-puzzles.ko.json`: 예약/공개 저장소
- `reports/puzzle-harness-report.json`: 최근 하네스 실행 리포트

`scripts/add-puzzle-candidates.js`는 하네스 내부 또는 디버깅용 저수준 명령이다. 운영 후보 저장 경로는 `scripts/run-puzzle-harness.js`로 통일한다.

## 파이프라인

```text
agent-authored candidate JSON
  -> validate
  -> score
  -> report
  -> save only if passed
  -> review
  -> schedule
  -> publish
```

`validate`, `score`, `report`는 하네스가 자동으로 묶어 실행한다. 실제 후보 저장은 모든 게이트를 통과한 뒤에만 수행한다. `review`, `schedule`, `publish`는 운영 판단 또는 스케줄러가 수행한다.

## 품질 게이트

현재 자동 검증 항목:

- 필수 필드 존재 여부
- 단서 5개 여부
- 중복 단서 여부
- 정답 문자열이 단서에 직접 포함되는지 여부
- 너무 쉬운 대표 정답 일부 차단
- 최소 품질 점수 미달 차단
- 기존 후보/공개 문제와 정답 중복 여부
- 별칭 중복 여부
- 난이도 4 미만 감점
- 별칭 부족 감점
- rationale 누락 감점

자동 검증은 완전한 의미 판단을 대신하지 않는다. 초반 단서의 모호성, 후반 단서의 확정성, 대체 정답 가능성은 운영자가 최종 확인한다.

## 확장 방향

- Figma 디자인 하네스를 추가해 디자인 시스템과 화면 구조도 검증한다.
- 관리자 페이지에서 review/schedule/publish를 처리한다.
- JSON 저장소를 DB로 교체한다.
- 사용자 풀이 로그로 문제 난이도를 보정한다.
- report를 CI artifact로 남긴다.
