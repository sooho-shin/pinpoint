# Peer Review Improvements

이 문서는 5분 단위 피어리뷰에서 발견한 개선점을 누적 관리한다. 코드 수정은 별도 지시가 있을 때만 한다.

## 운영 방식

- 주기: 5분 단위로 재검토한다.
- 방식: 새로 발견한 개선점, 기존 개선점의 우선순위 변경, 이전 발견과의 비교를 기록한다.
- 범위: 제품 기획, 운영, 보안/개인정보, 데이터 무결성, UI/접근성, 광고/SEO, 배포 안정성.
- 상태:
  - `open`: 아직 수정하지 않은 개선 후보
  - `recheck`: 추가 확인이 필요한 항목
  - `accepted`: 수정 대상으로 확정된 항목
  - `done`: 수정 완료 후 검증된 항목
  - `dropped`: 의도적으로 하지 않기로 한 항목

## 현재 요약

마지막 업데이트: 2026-05-30 21:10:00 KST

| ID | 우선순위 | 상태 | 영역 | 요약 |
| --- | --- | --- | --- | --- |
| PR-011 | Critical | done | Security/Game Integrity | Supabase anon select로 published puzzle의 전체 `clues`가 노출될 수 있다. |
| PR-001 | High | done | Auth/UX | 인앱 브라우저에서 `브라우저로 열기` 버튼이 외부 브라우저를 보장하지 못한다. |
| PR-002 | High | done | Ads/Operations | AdSense 전역 스크립트는 Auto ads 설정에 따라 게임 화면에도 광고가 삽입될 수 있다. |
| PR-003 | Medium | done | Ranking | 오늘 랭킹 51위 이하 사용자는 `myRank`를 확인할 수 없다. |
| PR-004 | Medium | done | Gameplay/Fairness | 홈 진입 즉시 attempt가 생성되어 풀이 타이머가 시작된다. |
| PR-005 | Medium | done | Community/Moderation | 오늘 문제 한마디에 정답/힌트성 스포일러를 막는 서버 필터가 없다. |
| PR-006 | Medium | done | Accessibility | 게임 방법 팝업에 dialog/menu 의미, Escape 닫기, 외부 클릭 닫기 처리가 없다. |
| PR-007 | Medium | done | Auth/Error UX | OAuth 콜백에서 `error` 파라미터만 온 경우 로그인 오류로 보여주지 않고 `next`로 돌려보낸다. |
| PR-008 | Medium | done | Deploy/Auth | OAuth redirect origin이 Vercel preview URL로 잡힐 수 있는 fallback 순서가 남아 있다. |
| PR-012 | Medium | done | Security/Abuse | Supabase anon 권한으로 attempts row를 직접 insert/update할 수 있다. |
| PR-014 | Medium | done | Ads/Content | AdSense 검수 관점에서 게시자 콘텐츠 페이지가 아직 얇다. |
| PR-015 | Medium | done | Privacy/Operations | 문의 이메일이 없으면 개인정보 삭제 요청이 공개 GitHub Issues로 유도될 수 있다. |
| PR-016 | Medium | done | Ads/Privacy | Google Analytics/AdSense 사용 대비 쿠키 동의/CMP 운영 계획이 코드에 없다. |
| PR-018 | Medium | done | UI/Mobile | 일부 278px 고정 폭 버튼 그룹이 좁은 모바일 웹뷰에서 overflow될 수 있다. |
| PR-009 | Low | done | SEO/Privacy | `/ranking?group=...` 초대 링크가 검색엔진에 노출될 수 있다. |
| PR-010 | Low | done | Profile UX | 닉네임 저장 실패가 중복/권한/네트워크 등 원인별로 구분되지 않는다. |
| PR-013 | Low | done | Result UX | 깨진 `sessionStorage` 결과 값이 Result 화면 렌더링을 깨뜨릴 수 있다. |
| PR-017 | Low | done | Docs | README의 AdSense 설명이 현재 구현과 어긋난다. |
| PR-019 | Low | done | UI/Text | 단서 문구에 긴 무공백 문자열이 들어오면 행 밖으로 밀릴 수 있다. |
| PR-020 | Low | done | UI/Text | 랭킹 상단 1등 메시지 배너는 긴 메시지 줄바꿈 처리가 약하다. |
| PR-021 | Medium | done | Operations | `db:sync-puzzles`가 이미 published인 publication을 로컬 JSON으로 덮을 수 있다. |
| PR-022 | Medium | done | Puzzle Harness | 새 alias가 기존 정답/alias와 겹치는 교차 중복을 잡지 못한다. |
| PR-023 | Medium | done | Observability | cron/API route가 실패 원인을 로그에 남기지 않는다. |
| PR-024 | Medium | done | Result UX | 결과 화면의 랭킹 CTA가 로그인/닉네임/검토 상태를 구분하지 못한다. |
| PR-025 | Medium | done | Security/Abuse | 비로그인 공유 버튼이 호출하는 그룹 생성 API에 남용 방어가 없다. |

## 발견 항목

### PR-001: 인앱 브라우저 외부 열기 UX가 과신될 수 있음

- 우선순위: High
- 상태: done
- 근거: `src/components/molecules/SignInBrowserGate.tsx:75`
- 내용: Threads, Instagram, 카카오톡 인앱 브라우저에서 `target="_blank"`는 같은 인앱 브라우저의 새 탭으로 열릴 수 있으며 Safari/Chrome 외부 전환을 보장하지 않는다.
- 영향: 사용자는 버튼을 눌렀는데도 Google OAuth `disallowed_useragent` 화면을 다시 볼 수 있다.
- 개선 후보: 버튼 문구를 더 보수적으로 바꾸고, 주소 복사/외부 브라우저에서 붙여넣기 안내를 기본 경로로 강조한다.
- 이전 발견과 비교: 신규 발견.

### PR-002: AdSense Auto ads 운영 리스크

- 우선순위: High
- 상태: done
- 근거: `src/app/layout.tsx:58`, `src/app/layout.tsx:79`
- 내용: AdSense publisher 스크립트가 전역 `<head>`에 들어가 있다. 사이트 확인에는 필요하지만, AdSense 콘솔에서 Auto ads가 켜지면 `/`, `/ranking`, `/signin` 같은 상호작용 중심 화면에도 광고가 자동 삽입될 수 있다.
- 영향: 게임 입력/제출 주변 광고 노출, 모바일 레이아웃 밀림, AdSense 정책상 “가치 낮은/상호작용 방해” 판단 위험이 있다.
- 개선 후보: 운영 문서에 Auto ads 비활성 체크를 명시하거나, 승인 전후 스크립트/광고 슬롯 전략을 env 플래그로 분리한다.
- 이전 발견과 비교: 신규 발견.

### PR-003: 내 랭킹이 Top 50 밖이면 사라짐

- 우선순위: Medium
- 상태: done
- 근거: `src/lib/puzzle/api.ts:725`, `src/lib/puzzle/api.ts:746`
- 내용: 오늘 랭킹은 `limit(50)` 결과 안에서만 `myRank`를 계산한다.
- 영향: 사용자가 51위 이하이면 자신의 기록이 랭킹에 등록되어도 화면에서 확인하기 어렵다.
- 개선 후보: Top 50 조회와 별도로 로그인 사용자의 leaderboard row를 단독 조회하고, 정확한 rank 계산 쿼리를 추가한다.
- 이전 발견과 비교: 신규 발견.

### PR-004: 페이지 진입만으로 풀이 시간이 시작됨

- 우선순위: Medium
- 상태: done
- 근거: `src/components/organisms/PuzzleBoard.tsx:34`
- 내용: 홈 화면 mount 시 바로 `/api/attempts/start`를 호출한다.
- 영향: 사용자가 문제를 읽기 전, 규칙을 확인하는 중, 또는 공유 링크로 잠깐 열어둔 동안에도 랭킹 elapsed time이 증가한다.
- 개선 후보: 첫 입력, 첫 제출, 첫 `다음 단서` 액션 시 attempt를 생성하거나, “시작” 액션을 명확히 둔다.
- 이전 발견과 비교: 신규 발견.

### PR-005: 완료자 한마디의 스포일러/부적절 표현 필터 부족

- 우선순위: Medium
- 상태: done
- 근거: `src/lib/puzzle/api.ts:1145`
- 내용: 한마디는 완료자만 읽고 쓸 수 있지만, 서버는 정답 문자열, aliases, 단서 직접 언급, 금칙어를 검사하지 않는다.
- 영향: 완료자 전용이라도 커뮤니티 품질과 운영 부담이 커질 수 있다.
- 개선 후보: 정답/aliases 포함 여부, 현재 문제 단서 포함 여부, 기본 금칙어를 서버에서 검사하고 운영자 숨김/신고 흐름을 추가한다.
- 이전 발견과 비교: 신규 발견.

### PR-006: 게임 방법 팝업 접근성 동작 부족

- 우선순위: Medium
- 상태: done
- 근거: `src/components/organisms/GameGuideTooltip.tsx:7`
- 내용: 도움말 팝업은 버튼으로 열고 닫히지만, 팝업 영역에 `role`, `aria-controls`, Escape 닫기, 외부 클릭 닫기, 포커스 이동 처리가 없다.
- 영향: 키보드/스크린리더 사용자는 팝업이 열린 상태와 내용을 명확히 파악하기 어렵고, 모바일에서도 팝업을 닫는 동작이 버튼 재클릭에만 묶인다.
- 개선 후보: 작은 popover 패턴으로 `id`, `aria-controls`, Escape 닫기, 외부 클릭 닫기를 추가한다.
- 이전 발견과 비교: PR-004가 게임 시작 UX라면, 이 항목은 접근성/상호작용 품질 이슈로 별도 관리한다.

### PR-007: OAuth error callback이 조용히 무시될 수 있음

- 우선순위: Medium
- 상태: done
- 근거: `src/app/auth/callback/route.ts:10`
- 내용: OAuth 제공자가 `code` 없이 `error` 또는 `error_description`으로 돌아오는 경우 현재 로직은 로그인 화면 오류가 아니라 `next` 경로로 redirect한다.
- 영향: 사용자가 Google 로그인 취소/실패 후 왜 로그인되지 않았는지 알기 어렵다.
- 개선 후보: `error` query가 있으면 `/signin?error=oauth&next=...`로 보내고, 가능한 범위에서 사용자 친화적인 오류를 표시한다.
- 이전 발견과 비교: PR-001은 인앱 브라우저 차단 예방이고, PR-007은 OAuth 실패 후 오류 표시 문제다.

### PR-008: OAuth redirect origin fallback이 preview URL을 쓸 수 있음

- 우선순위: Medium
- 상태: done
- 근거: `src/lib/site-url.ts:32`
- 내용: production 환경에서 `NEXT_PUBLIC_SITE_URL`이 없으면 `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` 순서로 origin을 결정한다. 설정이 누락된 preview/branch 배포에서는 OAuth redirect URI가 preview 도메인으로 생성될 수 있다.
- 영향: Google/Supabase redirect allowlist와 맞지 않아 로그인 실패가 재발할 수 있다.
- 개선 후보: 운영 OAuth redirect는 canonical production origin을 우선 고정하고, preview OAuth를 지원할지 여부를 명시적으로 분리한다.
- 이전 발견과 비교: 과거 localhost redirect 문제의 같은 계열이다. 현재 기본값은 개선됐지만 env 누락 시 preview fallback 리스크가 남아 있다.

### PR-009: 그룹 초대 링크 검색 노출 가능성

- 우선순위: Low
- 상태: done
- 근거: `src/app/ranking/page.tsx:4`
- 내용: `/ranking`은 index 가능한 메타데이터를 갖고 있고, `?group=` 쿼리별 noindex 처리가 없다.
- 영향: 공유된 그룹 초대 URL이 크롤러에 수집될 수 있다. 그룹 화면 자체는 로그인/닉네임을 요구하지만 초대 코드가 검색 결과나 외부 캐시에 남을 수 있다.
- 개선 후보: `group` query가 있는 경우 noindex 메타를 적용하거나, 그룹 초대 링크를 robots 정책 또는 middleware/header로 검색 제외한다.
- 이전 발견과 비교: 신규 발견. PR-003은 랭킹 데이터 표시 문제이고, PR-009는 초대 링크 노출 문제다.

### PR-010: 닉네임 저장 실패 원인 구분 부족

- 우선순위: Low
- 상태: done
- 근거: `src/app/nickname/actions.ts:27`
- 내용: `profiles.upsert` 실패 시 모든 오류를 `error=save`로 처리한다.
- 영향: RLS/세션 만료/DB 오류/중복 정책 변경 같은 원인이 모두 같은 메시지로 보인다.
- 개선 후보: 세션 없음, 권한 오류, 제약 위반, 네트워크/DB 오류를 최소한 로그와 사용자 메시지에서 구분한다.
- 이전 발견과 비교: 신규 발견. 현재 MVP에는 중복 닉네임 금지가 없으므로 우선순위는 낮다.

### PR-011: Supabase direct select로 잠긴 단서가 노출될 수 있음

- 우선순위: Critical
- 상태: done
- 근거: `supabase/migrations/20260510190000_initial_pinpoint_schema.sql:300`, `supabase/migrations/20260510190000_initial_pinpoint_schema.sql:411`, `schema/database-contract.json:61`, `docs/app-architecture.md:51`
- 내용: RLS는 published puzzle을 public select 가능하게 하고, grant는 `clues` 컬럼을 anon/authenticated에 허용한다. 공개 API는 잠긴 단서를 숨기지만, Supabase REST/JS를 직접 호출하면 오늘 published puzzle의 5개 단서를 모두 읽을 수 있는 구조다.
- 영향: “terminal result 전 아직 공개되지 않은 clue 비노출” 계약을 DB 권한 레벨에서 위반할 수 있다. 정답은 노출되지 않더라도 게임 난이도와 랭킹 공정성에 직접 영향을 준다.
- 개선 후보: public `puzzles` select에서 `clues`를 제거하고, 아카이브/서버 API는 service role 또는 제한 view를 통해 필요한 시점에만 단서를 반환한다. 계약의 `puzzles.clues.public`도 재검토한다.
- 이전 발견과 비교: PR-005는 사용자가 쓴 한마디의 스포일러 위험이고, PR-011은 DB 권한으로 앱 API를 우회하는 핵심 무결성 이슈다. PR-011을 현재 최상위 우선순위로 둔다.

### PR-012: anon 직접 attempts insert/update 허용 범위가 넓음

- 우선순위: Medium
- 상태: done
- 근거: `supabase/migrations/20260510190000_initial_pinpoint_schema.sql:322`, `supabase/migrations/20260510190000_initial_pinpoint_schema.sql:414`
- 내용: anon/authenticated에 `attempts` select/insert/update grant가 있고, insert policy는 `user_id is null`이면 통과한다. 앱은 Route Handler와 httpOnly cookie를 통해 시도 상태를 관리하지만, public anon key로 임의 anonymous attempt row를 만들 수 있는 여지가 있다.
- 영향: 정답 노출은 아니지만 DB row 스팸, publication별 anonymous session 점유, 운영 분석 오염 가능성이 있다.
- 개선 후보: 익명 attempt 생성/갱신은 Route Handler service role 경로로만 허용하고, Supabase direct anon insert/update는 제거하거나 더 강한 RPC/검증 함수로 제한한다.
- 이전 발견과 비교: PR-011은 정보 노출이라 Critical, PR-012는 남용/오염 가능성이라 Medium으로 분리한다.

### PR-013: Result 화면 sessionStorage 파싱 방어 부족

- 우선순위: Low
- 상태: done
- 근거: `src/components/organisms/ResultPanel.tsx:21`
- 내용: `pinpoint:last-result` 값이 깨진 JSON이면 `JSON.parse`가 throw될 수 있다.
- 영향: 사용자가 직접 storage를 건드리거나 브라우저 확장/이전 버전 캐시로 값이 깨진 경우 결과 화면이 오류 상태가 될 수 있다.
- 개선 후보: try/catch로 파싱하고 실패 시 해당 key를 삭제한 뒤 “결과가 없습니다” 상태로 복구한다.
- 이전 발견과 비교: 신규 발견. 보안보다는 클라이언트 복원력 이슈라 Low로 둔다.

### PR-014: 게시자 콘텐츠 페이지가 아직 얇음

- 우선순위: Medium
- 상태: done
- 근거: `src/app/about/page.tsx:19`, `src/app/how-to-play/page.tsx:37`, `src/app/archive/page.tsx:78`
- 내용: `/about`은 짧은 소개 3개 섹션, `/how-to-play`는 규칙과 예시 중심, `/archive`는 초기 운영일이 적으면 빈 상태가 된다.
- 영향: AdSense 검수에서 “게시자 콘텐츠가 없거나 가치가 낮은 화면”으로 다시 판단될 수 있다. 특히 게임 UI 자체는 상호작용 중심이라 콘텐츠 페이지의 정보량이 중요하다.
- 개선 후보: 문제 제작 철학, 난이도 설계, 예시 풀이 과정, 랭킹/그룹 사용 시나리오, FAQ, 운영 정책 등을 정적 콘텐츠로 확장한다. 아카이브가 비어 있을 때도 예시/운영 설명을 더 제공한다.
- 이전 발견과 비교: PR-002는 광고 스크립트/Auto ads 운영 리스크이고, PR-014는 콘텐츠 충분성 리스크다.

### PR-015: 개인정보 문의 경로가 공개 채널에 치우칠 수 있음

- 우선순위: Medium
- 상태: done
- 근거: `src/app/contact/page.tsx:13`, `src/app/privacy/page.tsx:43`
- 내용: 문의 페이지는 `NEXT_PUBLIC_CONTACT_EMAIL`이 있을 때만 이메일을 보여주고, 없으면 GitHub Issues만 남는다. 개인정보처리방침은 계정/개인정보 삭제 요청을 문의 페이지 경로로 안내한다.
- 영향: 이메일 env가 운영에 없으면 개인정보 삭제 요청이 공개 GitHub Issues로 유도될 수 있다.
- 개선 후보: 운영 기본 연락 이메일을 반드시 설정하거나, env 누락 시에도 비공개 문의 수단을 안내한다. `.env.example`에도 `NEXT_PUBLIC_CONTACT_EMAIL`을 추가한다.
- 이전 발견과 비교: 신규 발견. PR-010은 닉네임 저장 오류 UX이고, PR-015는 운영 문의/개인정보 경로 문제다.

### PR-016: 쿠키 동의/CMP 운영 계획 부재

- 우선순위: Medium
- 상태: done
- 근거: `src/app/privacy/page.tsx:35`, `docs/product-plan.md:79`
- 내용: 개인정보처리방침은 Google Analytics와 AdSense의 쿠키/유사 기술 사용을 고지하지만, 실제 코드에는 쿠키 동의 배너나 CMP 연동이 없다.
- 영향: EEA/UK/Swiss 트래픽이나 AdSense 개인 맞춤 광고 운영 시 Google 동의 요구사항과 충돌할 수 있다. AdSense 콘솔에서도 CMP 메시지를 만들라는 경고가 나온 적이 있다.
- 개선 후보: 한국 대상 운영이라도 AdSense 승인 전후로 CMP 적용 여부를 결정하고, 최소한 운영 체크리스트에 Auto ads/CMP/개인 맞춤 광고 설정을 분리해 둔다.
- 이전 발견과 비교: PR-002와 같은 광고 운영 계열이지만, PR-002는 광고 자동 삽입이고 PR-016은 동의/개인정보 처리 이슈다.

### PR-017: README AdSense 설명이 현재 구현과 불일치

- 우선순위: Low
- 상태: done
- 근거: `README.md:153`
- 내용: README는 `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`를 `/ads.txt` 응답에 사용하고 “승인 전에는 전역 Auto ads 스크립트를 넣지 않는다”고 설명한다. 현재 구현은 사이트 확인용 publisher 스크립트를 전역 `<head>`에 넣는다.
- 영향: 나중에 운영자가 README만 보고 설정하면 현재 코드와 정책의 차이를 오해할 수 있다.
- 개선 후보: README도 `docs/product-plan.md`, `docs/app-architecture.md`와 같은 문구로 맞춘다.
- 이전 발견과 비교: 신규 발견. 코드 동작 문제가 아니라 문서 일관성 문제라 Low로 둔다.

### PR-018: 278px 고정 폭 액션 그룹의 좁은 모바일 overflow 위험

- 우선순위: Medium
- 상태: done
- 근거: `src/components/molecules/LeaderboardTabs.tsx:5`, `src/components/molecules/ShareActionGroup.tsx:5`, `src/app/globals.css:137`
- 내용: 랭킹 탭과 결과 공유 액션 그룹이 `w-[278px]`로 고정되어 있다. 현재 390px 기준 디자인에서는 맞지만, 320px대 인앱 브라우저/접근성 확대/웹뷰 safe area 조합에서는 `.app-shell` padding과 `surface p-6` 내부 폭을 감안할 때 278px이 부모보다 넓어질 수 있다.
- 영향: 사용자가 이전에 겪은 “정답입력/제출/다음단서 버튼이 오른쪽으로 삐져나옴”과 같은 종류의 모바일 레이아웃 회귀가 다른 화면에서 재발할 수 있다.
- 개선 후보: 디자인 기준 폭은 `max-w-[278px]`로 유지하고 실제 폭은 `w-full`을 쓰도록 바꾼다. 탭/공유 버튼 모두 부모 폭을 넘지 않는 계약을 컴포넌트 수준에서 통일한다.
- 이전 발견과 비교: PR-003은 랭킹 데이터 범위 문제이고, PR-018은 랭킹/결과 화면의 모바일 layout resilience 문제다.

### PR-019: 단서 텍스트의 긴 무공백 문자열 방어 부족

- 우선순위: Low
- 상태: done
- 근거: `src/components/molecules/ClueRow.tsx:8`
- 내용: 단서 텍스트 컨테이너는 `min-w-0 flex-1`이지만 `break-words`나 `overflow-wrap:anywhere`가 없다. 일반 한국어 문장은 괜찮지만, 영어 약어/URL형 문자열/무공백 긴 고유명사가 들어오면 줄바꿈 없이 행 밖으로 밀릴 수 있다.
- 영향: 문제 데이터 품질이 조금만 흔들려도 모바일 단서 목록이 깨질 수 있다.
- 개선 후보: 단서 생성 하네스에서 긴 무공백 문자열을 제한하고, UI에는 `break-words` 계열 클래스를 추가한다.
- 이전 발견과 비교: PR-011은 DB 권한으로 잠긴 단서가 노출되는 핵심 보안 이슈이고, PR-019는 공개된 단서가 화면을 깨뜨릴 수 있는 낮은 우선순위 UI 이슈다.

### PR-020: 랭킹 상단 1등 메시지 배너의 긴 메시지 줄바꿈 약함

- 우선순위: Low
- 상태: done
- 근거: `src/components/organisms/LeaderboardPanel.tsx:267`
- 내용: 랭킹 상단의 winner message 배너는 닉네임과 메시지를 inline `span`으로 붙이고, 메시지 쪽에 `break-words` 처리가 없다. 메인 화면 `DailyWinnerBanner`는 `break-words`를 쓰는 반면 랭킹 화면은 같은 방어가 없다.
- 영향: 100자 제한 안에서도 무공백 문자열이나 긴 영어 메시지는 랭킹 surface를 가로로 밀 수 있다.
- 개선 후보: 메시지 span에 `break-words`/`overflow-wrap:anywhere`를 적용하거나 닉네임과 메시지를 block/flex column 구조로 분리한다.
- 이전 발견과 비교: PR-005는 메시지 내용 moderation이고, PR-020은 허용된 메시지가 모바일 레이아웃을 깨뜨리는 표시 문제다.

### PR-024: Result 화면 랭킹 CTA가 참여 상태를 세분화하지 못함

- 우선순위: Medium
- 상태: done
- 근거: `src/components/organisms/ResultPanel.tsx:134`, `src/components/organisms/LeaderboardPanel.tsx:74`, `src/lib/puzzle/api.ts:771`
- 내용: 랭킹 페이지는 `participation` 상태로 `requires_sign_in`, `requires_nickname`, `failed`, `ranked`, `succeeded_not_visible`를 구분하지만, 결과 화면은 `solved && !result.isRanked`이면 항상 “Google 로그인과 닉네임 설정” CTA를 보여준다.
- 영향: 로그인했지만 닉네임이 없거나, 너무 빠른 기록으로 `flagged` 처리된 사용자도 결과 화면에서는 다시 로그인해야 하는 것처럼 보일 수 있다. 최근 랭킹 페이지에서 고친 “로그인 상태 오인” UX가 Result 화면에 남아 있는 형태다.
- 개선 후보: `SubmitResult`에도 랭킹 참여 실패 사유를 내려주거나, Result 화면에서 `/api/leaderboard/daily`의 `participation`과 같은 상태 모델을 재사용한다. 최소한 `rankStatus === "flagged"`와 로그인/닉네임 필요 상태는 서로 다른 문구로 분기한다.
- 이전 발견과 비교: PR-013은 깨진 `sessionStorage` 복원력 이슈였고, PR-024는 정상 결과 데이터 안에서 랭킹 참여 상태를 잘못 설명하는 UX 이슈다. 2026-05-26 랭킹 페이지 CTA 수정으로 일부 해결됐지만 결과 화면에는 남아 있다.

### PR-025: 비로그인 공유 그룹 생성 API 남용 방어 부족

- 우선순위: Medium
- 상태: done
- 근거: `src/components/molecules/ShareButton.tsx:12`, `src/app/api/groups/route.ts:5`, `src/lib/puzzle/api.ts:871`, `supabase/migrations/20260523190000_allow_anonymous_share_groups.sql:3`
- 내용: 메인 공유 버튼은 비로그인 상태에서도 `POST /api/groups`로 새 그룹을 만들 수 있고, DB도 `owner_user_id` nullable을 허용한다. 현재 API에는 같은 익명 세션의 기존 그룹 재사용, per-session 제한, rate limit, captcha, idempotency key 같은 남용 방어가 없다.
- 영향: 자동화된 요청이나 반복 클릭으로 오늘 publication에 owner 없는 `groups` row가 대량 생성될 수 있다. 직접 개인정보 노출은 아니지만 DB 팽창, 초대 코드 namespace 오염, 운영 분석 왜곡이 생긴다.
- 개선 후보: anonymous session cookie 기준으로 오늘 생성한 그룹을 재사용하고, 동일 세션/동일 IP 단위의 생성 제한을 둔다. 필요하면 그룹 생성은 signed-in 사용자 기본 경로로 두고 비로그인 공유는 임시 URL 또는 클라이언트 공유 텍스트로 분리한다.
- 이전 발견과 비교: PR-012는 direct Supabase 권한으로 attempts를 조작할 수 있던 문제였고, PR-025는 공식 Route Handler가 열어둔 익명 생성 엔드포인트의 남용 가능성이다.

## 리뷰 로그

### 2026-05-23 17:41 KST

- 1차 리뷰 범위: 인증 인앱 브라우저, AdSense 전역 스크립트, 랭킹 조회, attempt 시작 시점, 문제 한마디 moderation.
- 새 발견: PR-001부터 PR-005까지 5건.
- 기존 발견과 비교: 첫 사이클이라 비교 대상 없음.
- 다음 사이클 예정 범위: 모바일 UI/접근성, 그룹 랭킹, 스케줄/공개 보완 로직, SEO/아카이브.

### 2026-05-23 17:47 KST

- 2차 리뷰 범위: 모바일 UI/접근성, OAuth 콜백, 배포 origin 결정, 그룹 랭킹 URL, 닉네임 저장 흐름.
- 새 발견: PR-006부터 PR-010까지 5건.
- 기존 발견과 비교:
  - PR-001과 PR-007은 모두 로그인 문제지만, PR-001은 사전 차단 UX, PR-007은 OAuth 실패 후 오류 처리라 분리했다.
  - PR-002는 운영 체크리스트와 강하게 연결되어 High 유지.
  - PR-003부터 PR-005는 제품 정책 결정이 필요한 Medium으로 유지.
- 이번 사이클에서 제외한 후보:
  - Vercel cron 지연: `docs/operations.md`와 `/api/today` 보완 로직이 일치하므로 신규 이슈로 올리지 않았다.
  - 그룹 랭킹 데이터 권한: 서버 API는 admin client를 쓰지만 공개 응답 필드가 제한되어 있어 즉시 이슈로 보지 않았다.
- 다음 사이클 예정 범위: Supabase migration/RLS와 서버 API의 실제 권한 경계, 랭킹/확성기 동시성, archive/SEO 콘텐츠 품질.

### 2026-05-23 17:53 KST

- 3차 리뷰 범위: Supabase migration/RLS, 공개 grant, 서버 API 권한 경계, 랭킹/확성기 동시성, Result 화면 복원력.
- 새 발견: PR-011부터 PR-013까지 3건.
- 기존 발견과 비교:
  - PR-011은 기존 PR-005보다 훨씬 직접적인 스포일러/게임 무결성 이슈라 Critical로 추가했다.
  - PR-012는 PR-011과 같은 Supabase direct access 계열이지만 정보 노출이 아니라 남용/오염 위험으로 분리했다.
  - PR-013은 사용자 저장소 손상 대응이라 낮은 우선순위로 추가했다.
- 이번 사이클에서 제외한 후보:
  - 확성기 1등 동시성: 앱 코드와 DB trigger가 모두 현재 1등을 검증하므로 신규 이슈로 올리지 않았다.
  - 그룹 랭킹 RLS: 공개 API 응답 필드가 제한되어 있고 초대 코드 기반 서버 검증이 있어 PR-009 외 별도 보안 이슈로 올리지 않았다.
- 다음 사이클 예정 범위: archive/SEO 콘텐츠 품질, AdSense 검수 관점의 페이지 가치, 모바일 레이아웃 세부 수치, 공유 텍스트/OG 일관성.

### 2026-05-23 17:58 KST

- 4차 리뷰 범위: archive/SEO 콘텐츠 품질, AdSense 검수 관점의 페이지 가치, 개인정보/문의 경로, 광고/쿠키 정책 문서 일관성.
- 새 발견: PR-014부터 PR-017까지 4건.
- 기존 발견과 비교:
  - PR-014는 PR-002와 함께 AdSense 승인 리스크를 구성하지만, 원인은 광고 배치가 아니라 콘텐츠 충분성이다.
  - PR-015는 개인정보처리방침의 “문의 페이지” 안내와 실제 문의 수단 사이의 운영 간극이다.
  - PR-016은 PR-002보다 법/정책 성격이 강한 광고 동의 이슈다.
  - PR-017은 낮은 우선순위의 문서 불일치다.
- 이번 사이클에서 제외한 후보:
  - 공유 문구의 `pinpoint-seven.vercel.app` URL: 실제 운영 도메인이 아직 이 URL이라 이슈로 올리지 않았다.
  - `/archive`가 service role로 과거 정답을 읽는 구조: 현재 활성 문제를 제외하므로 의도된 동작으로 판단했다.
- 다음 사이클 예정 범위: 모바일 레이아웃 실제 수치, 컴포넌트 overflow, 긴 닉네임/댓글/그룹 링크 처리, 버튼 접근성.

### 2026-05-23 18:05 KST

- 5차 리뷰 범위: 모바일 레이아웃 실제 수치, 고정 폭 컴포넌트, 긴 단서/메시지 overflow, 랭킹/결과 화면 액션 그룹.
- 새 발견: PR-018부터 PR-020까지 3건.
- 기존 발견과 비교:
  - PR-018은 과거 모바일 버튼 overflow 회귀와 직접 연결되는 별도 UI 안정성 항목이다.
  - PR-019와 PR-020은 보안/정책 이슈가 아니라 데이터나 사용자 입력이 길어질 때 화면이 깨지는 낮은 우선순위 복원력 이슈다.
- 이번 사이클에서 제외한 후보:
  - `GroupInviteCard`의 초대 URL `truncate`: 전체 URL 확인성은 낮지만 복사 버튼이 핵심 동작이라 신규 이슈로 올리지 않았다.
  - 배지/시간 표시 폭: 현재 표시 문자열이 짧고 `shrink-0`로 의도된 고정 요소라 별도 이슈로 보지 않았다.
- 다음 사이클 예정 범위: 문제 생성/선정 하네스, 중복·유사 정답 방지, 공개 스케줄 보완 로직, 운영 스크립트의 실패 복구성.

### 2026-05-23 18:32 KST

- 수정 반영: PR-001부터 PR-023까지 코드/문서/계약에 반영하고 상태를 `done`으로 갱신했다.
- 추가 반영:
  - PR-021: `db:sync-puzzles`가 이미 `published`인 공개일 row를 다른 puzzle/status로 덮지 않도록 보호했다.
  - PR-022: 퍼즐 하네스가 기존 answer뿐 아니라 기존 aliases와 새 answer/aliases 교차 중복도 잡도록 보강했다.
  - PR-023: API/cron route에 공통 에러 로깅을 추가해 운영 장애 추적성을 높였다.
- 검증:
  - `npm run db:check`
  - `npm run puzzles:test`
  - `npm run typecheck`
  - `npm run app:contract`
  - `npm run app:check`
  - `npm run app:implementation:check`
  - `npm run figma:layout:contract`
  - `npm run figma:composition:contract`
  - `npm run build`

### 2026-05-30 20:56 KST - Review 6

#### Scope

- 현재 코드 기준으로 라우팅, 핵심 API, Supabase 권한 보강 마이그레이션, 랭킹/결과 UI, 공유 그룹 생성 흐름, 퍼즐 하네스를 다시 점검했다.
- 기존 `done` 항목 중 DB grant, 긴 텍스트 overflow, 게임 방법 팝업, 모바일 버튼 폭, 에러 로깅은 현재 코드에서 반영 상태를 재확인했다.

#### Compared With Previous Review Log

- 유지됨: PR-001부터 PR-023까지는 현재 코드와 검증 스크립트 기준으로 계속 `done` 상태다.
- 신규: PR-024, PR-025를 추가했다.
- 변경됨: 2026-05-26 랭킹 페이지 CTA 상태 분기는 `LeaderboardPanel`과 `getDailyLeaderboard`에 반영됐지만, 같은 상태 모델이 `ResultPanel`까지 확장되지는 않았다.

#### Findings

1. Result 화면 랭킹 CTA가 참여 상태를 세분화하지 못함
   - Evidence: `src/components/organisms/ResultPanel.tsx:134`, `src/components/organisms/LeaderboardPanel.tsx:74`, `src/lib/puzzle/api.ts:771`.
   - Current impact: 성공했지만 랭킹에 표시되지 않는 사용자가 로그인/닉네임 문제로 오해할 수 있다.
   - Recommended action: Result 화면도 daily leaderboard의 `participation` 상태 모델을 재사용하거나 `SubmitResult`에 랭킹 비노출 사유를 명시한다.

2. 비로그인 공유 그룹 생성 API 남용 방어 부족
   - Evidence: `src/components/molecules/ShareButton.tsx:12`, `src/app/api/groups/route.ts:5`, `src/lib/puzzle/api.ts:871`, `supabase/migrations/20260523190000_allow_anonymous_share_groups.sql:3`.
   - Current impact: 반복 요청으로 owner 없는 그룹 row가 대량 생성될 수 있다.
   - Recommended action: anonymous session 기준 재사용/idempotency와 생성 제한을 추가한다.

#### Verification

- `npm run typecheck`: 통과.
- `npm run app:implementation:check`: 통과.
- `npm run db:check`: 통과.
- `npm run puzzles:test`: 통과.
- `npm run build`: 통과.

#### Next Review Angle

- Result 화면과 랭킹 화면의 상태 모델 중복, 그룹 공유 생성 정책, anonymous session 기반 idempotency를 우선 재점검한다.

### 2026-05-30 21:00 KST - Review 7

#### Scope

- Review 6 이후 현재 코드 기준으로 Result/Ranking 상태 모델, 공유 그룹 생성 API, Supabase direct access 권한, 클라이언트 storage/clipboard 사용부, 주요 검증 스크립트를 다시 점검했다.
- `grep` 기반 패턴 검색으로 `sessionStorage`, `navigator.clipboard`, `window.location`, `target="_blank"`, service role key, answer/alias/clue 노출 가능 지점을 재확인했다.

#### Compared With Previous Review Log

- 유지됨: PR-024는 `ResultPanel`의 `solved && !result.isRanked` 조건이 그대로 남아 있어 여전히 `open`이다.
- 유지됨: PR-025는 `ShareButton -> POST /api/groups -> createRankingGroup` 경로에 익명 그룹 생성 재사용/idempotency/rate limit이 없어 여전히 `open`이다.
- 신규 없음: 이번 회차에서 PR-024/PR-025보다 우선순위가 높거나 별도 ID로 분리할 만큼 명확한 신규 문제는 확인하지 못했다.

#### Findings

1. PR-024 유지: Result 화면 랭킹 CTA가 참여 상태를 세분화하지 못함
   - Evidence: `src/components/organisms/ResultPanel.tsx:134`, `src/components/organisms/LeaderboardPanel.tsx:74`, `src/lib/puzzle/api.ts:771`.
   - Current impact: 랭킹 페이지는 상태 분기를 갖지만 결과 화면은 같은 상태 모델을 재사용하지 않아 성공 후 비노출 사유를 오해하게 만들 수 있다.
   - Recommended action: `SubmitResult` 또는 Result 화면 데이터 로딩에서 `participation` 상태를 일관되게 사용한다.

2. PR-025 유지: 비로그인 공유 그룹 생성 API 남용 방어 부족
   - Evidence: `src/components/molecules/ShareButton.tsx:12`, `src/app/api/groups/route.ts:5`, `src/lib/puzzle/api.ts:871`, `supabase/migrations/20260523190000_allow_anonymous_share_groups.sql:3`.
   - Current impact: 반복 요청이 owner 없는 그룹 row를 계속 만들 수 있다.
   - Recommended action: anonymous session 기준 기존 그룹 재사용, 생성 제한, idempotency key 중 최소 하나를 적용한다.

#### Verification

- `npm run typecheck`: 통과.
- `npm run app:implementation:check`: 통과.
- `npm run db:check`: 통과.
- `npm run puzzles:test`: 통과.
- `npm run build`: 통과.

#### Next Review Angle

- PR-024/PR-025 해결 여부를 먼저 비교하고, 이후 clipboard 실패 UX와 공유 그룹 만료/정리 정책을 낮은 우선순위로 재검토한다.

### 2026-05-30 21:10 KST

- 수정 반영: PR-024, PR-025를 코드에 반영하고 상태를 `done`으로 갱신했다.
- PR-024: `SubmitResult`에 `participation` 상태를 추가하고 Result 화면이 로그인 필요, 닉네임 필요, 검토 중 상태를 구분해 표시하도록 수정했다.
- PR-025: 같은 공개일에서 로그인 사용자의 기존 그룹을 재사용하고, 비로그인 공유 그룹은 httpOnly `pinpoint_share_group` 쿠키로 publication/invite code를 저장해 반복 생성 대신 재사용하도록 수정했다.
- 검증:
  - `npm run typecheck`
  - `npm run app:implementation:check`
  - `npm run db:check`
  - `npm run puzzles:test`
  - `npm run build`
