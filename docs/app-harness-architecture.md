# 앱 하네스 아키텍처

## 목적

앱 하네스는 프론트엔드와 백엔드 구현이 제품/DB/Figma 계약에서 벗어나지 않도록 막는 검증 계층이다. 퍼즐 하네스가 문제 품질을 검증하고 DB 하네스가 데이터 계약을 검증하듯, 앱 하네스는 route, API, 보안, 화면 범위를 검증한다.

## 기준 파일

- `docs/app-architecture.md`: 사람이 읽는 구현 기준
- `schema/app-contract.json`: 기계 검증 가능한 앱 계약
- `scripts/validate-app-contract.js`: 계약 및 구현 파일 검증기
- `docs/database-architecture.md`: DB 정책
- `schema/database-contract.json`: DB 기계 계약
- `design/components.json`: 컴포넌트 계약
- `design/screens.json`: 화면 계약

## 서버 모듈 경계

Route Handler는 계속 `src/lib/puzzle/api.ts`의 공개 함수를 import할 수 있다. 단, `api.ts`는 route-facing facade와 데일리 플레이 orchestration에 가깝게 유지하고, 기능별 책임은 아래 모듈에 둔다.

- `src/lib/puzzle/actor.ts`: Supabase Auth user와 httpOnly 익명 세션 cookie를 합친 actor 식별
- `src/lib/puzzle/publication.ts`: 활성 KST 공개일 publication과 puzzle 조회, cron 지연 보완 publish
- `src/lib/puzzle/attempts.ts`: attempt 원장 조회와 공통 select/status 상수
- `src/lib/puzzle/attempt-claim.ts`: 익명 attempt의 로그인 계정 승계와 승계 후 projection 동기화
- `src/lib/puzzle/leaderboard.ts`: daily leaderboard projection 생성, ranking participation, group projection sync
- `src/lib/puzzle/groups.ts`: 공유 그룹 생성, 참여, 그룹 랭킹 조회
- `src/lib/puzzle/streaks.ts`: `user_daily_results` 기록과 `user_streaks` 재계산
- `src/lib/puzzle/winner-message.ts`: 1등 확성기 조회와 작성 권한 확인
- `src/lib/puzzle/server-format.ts`: public response shape 변환과 스포일러 검사 보조
- `src/lib/puzzle/server-types.ts`: Supabase row type과 server-only domain type

새 API 기능을 추가할 때는 route handler가 곧바로 Supabase query를 반복하지 않게 위 경계 중 하나에 넣는다. 새 경계가 필요하면 문서와 계약을 먼저 갱신한다.

## 검증 단계

### 1. 계약 검증

구현 전에도 항상 통과해야 한다.

```bash
npm run app:contract
```

검증 항목:

- Next.js App Router 사용 선언
- Route Handler 기반 backend-for-frontend 사용 선언
- Supabase Auth/SSR 사용 선언
- Today Puzzle, Result, Ranking, Sign In, Nickname 화면 존재
- 필수 API endpoint 존재
- Figma Atomic Design layer와 코드 컴포넌트 파일 1:1 매핑 선언
- `design/tokens.json` 색상과 `src/app/globals.css` CSS 변수 일치 선언
- 잠긴 단서와 정답 비노출 정책 선언
- Today Puzzle, Result, Ranking과 주요 플레이 API의 익명 플레이 허용 정책 선언
- 가입 시작 시 닉네임 입력 필수 정책 선언
- 일일 공개 문제는 하나지만 attempt는 로그인 사용자와 익명 세션별로 분리된다는 정책 선언
- 랭킹 정렬 기준 선언
- 공개 API forbidden field 선언
- 필수 환경 변수 선언

### 2. 앱 구현 검증

앱 파일이 생긴 뒤 실행한다.

```bash
npm run app:check
```

`src/app`이 없으면 구현 검증은 건너뛰고 계약만 검증한다. 구현을 반드시 요구하려면 다음 명령을 쓴다.

```bash
npm run app:implementation:check
```

검증 항목:

- 계약에 선언된 page route 파일 존재
- 계약에 선언된 API route 파일 존재
- Figma atoms/molecules/organisms/templates 코드 파일 존재
- route page가 template 컴포넌트를 통해 화면을 구성하는지 검사
- `globals.css`가 Figma color token을 CSS 변수로 포함하는지 검사
- forbidden direct Supabase puzzle read 패턴 검사
- `SUPABASE_SERVICE_ROLE_KEY`가 client component에서 사용되지 않는지 검사
- API route가 forbidden response fields를 직접 반환하지 않는지 검사

### 3. 통합 전 검증

프론트/백엔드 구현 PR 또는 주요 변경 전에는 아래를 모두 실행한다.

```bash
npm run db:check
npm run figma:layout:contract
npm run figma:composition:contract
npm run app:check
```

퍼즐 데이터나 운영 흐름을 함께 만졌다면 추가로 실행한다.

```bash
npm run puzzles:test
```

## 실패 정책

계약 검증이 실패하면 구현을 진행하지 않는다. 필요한 변경은 다음 파일을 함께 갱신한다.

1. `docs/app-architecture.md`
2. `schema/app-contract.json`
3. `scripts/validate-app-contract.js`
4. 관련 DB/Figma/운영 문서

구현 검증이 실패하면 앱 코드가 계약을 어긴 것이다. 계약이 틀렸다고 판단되는 경우에도 먼저 문서와 계약을 갱신한 뒤 구현을 맞춘다.

## 보안 검증 중점

가장 중요한 실패 조건은 다음이다.

- 정답 또는 aliases가 terminal result 전 응답에 포함됨
- 잠긴 단서가 `/api/today` 또는 reveal 전 응답에 포함됨
- 익명 플레이 화면/API가 `auth: optional` 계약을 갖지 않음
- 랭킹 1등 또는 다른 사용자의 terminal attempt가 현재 사용자의 풀이 가능 여부를 잠그는 모델
- 브라우저 Supabase client가 `puzzles` 테이블을 직접 조회함
- service role key가 client component 또는 public env로 새어 나감
- 랭킹 API가 제출 답안, 이메일, device/ip/user-agent hash를 반환함

이 항목은 기능 완성도보다 우선한다. 퍼즐 게임의 공정성과 개인정보 정책에 직접 연결되기 때문이다.

## 확장 방향

- Playwright 기반 모바일/데스크톱 화면 검증
- API fixture 테스트
- Supabase local database seed 검증
- 관리자 화면 계약 추가
- Code Connect 매핑 검증
