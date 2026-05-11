---
name: make-pinpoint-app
description: 사용자가 `$make-pinpoint-app`, 프론트/백엔드 구현, Next.js 앱 구현, Supabase API 구현을 요청하면 한국어 Pinpoint의 앱 계약과 하네스를 먼저 확인한 뒤 MVP 앱을 구현한다. Pinpoint frontend backend implementation harness.
---

# Make Pinpoint App

이 스킬은 한국어 Pinpoint의 실제 앱 구현을 위한 실행 스킬이다. 구현 전에 앱 계약, DB 계약, Figma 계약을 먼저 통과시킨다.

## 필수 기준

작업 전 반드시 아래 문서를 읽고 따른다.

1. `docs/app-architecture.md`
2. `docs/app-harness-architecture.md`
3. `schema/app-contract.json`
4. `docs/product-plan.md`
5. `docs/database-architecture.md`
6. `docs/design-plan.md`

이 스킬은 앱 스펙을 새로 만들지 않는다. 모든 구현 범위와 보안 기준은 위 문서와 계약에서 가져온다.

## 시작 검증

구현 전에 실행한다.

```bash
npm run db:check
npm run figma:layout:contract
npm run figma:composition:contract
npm run app:contract
```

실패하면 앱 구현을 시작하지 않는다. 필요한 경우 먼저 문서와 계약을 갱신한다.

## 구현 순서

1. Next.js App Router, TypeScript, Tailwind 기반을 만든다.
2. Supabase SSR client를 구성한다.
3. `schema/app-contract.json`의 page route를 만든다.
4. `schema/app-contract.json`의 API route handler를 만든다.
5. Today Puzzle 플레이 흐름을 구현한다.
6. Result와 공유 텍스트를 구현한다.
7. Google 로그인과 닉네임 설정을 구현한다.
8. Daily Ranking과 winner message를 구현한다.
9. `npm run app:check`를 실행한다.
10. 구현 파일이 모두 생긴 뒤 `npm run app:implementation:check`를 실행한다.

## 금지 사항

- 브라우저 Supabase client로 `puzzles` 테이블을 직접 조회하지 않는다.
- terminal result 전 정답, aliases, rationale, 잠긴 단서를 반환하지 않는다.
- client component에서 `SUPABASE_SERVICE_ROLE_KEY`를 참조하지 않는다.
- 랭킹 API에서 email, submitted answer, hash 식별자를 반환하지 않는다.
- 그룹 랭킹과 관리자 UI를 MVP 1차에 끼워 넣지 않는다.

## 보고 원칙

최종 보고에는 다음을 포함한다.

- 구현한 route와 주요 컴포넌트
- 실행한 검증 명령과 결과
- 남은 환경 설정
- 의도적으로 제외한 2차 범위
