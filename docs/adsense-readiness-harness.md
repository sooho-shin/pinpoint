# AdSense readiness 하네스

이 하네스는 AdSense 재검토 전에 공개 페이지가 “광고 게재가 준비되지 않은 사이트”, “가치가 별로 없는 콘텐츠”로 다시 판정될 가능성을 낮추기 위한 비차단 soft gate다. 배포를 막지 않고, 재검토 가능 여부를 `review-ready`, `warning`, `review-not-ready`로 분류한다.

Google 심사는 최종적으로 Google이 판단하므로 이 리포트는 승인 보장이 아니다. 목적은 재검토 요청 전에 반복되는 구조적 문제를 기계적으로 발견하는 것이다.

## 실행

```bash
npm run adsense:check
```

기본 대상은 `NEXT_PUBLIC_SITE_URL`이 있으면 그 값을 쓰고, 없으면 `https://pinpoint-seven.vercel.app`을 검사한다.

커스텀 게임 공개 페이지까지 검사하려면 실제 활성 공유 slug를 넘긴다.

```bash
npm run adsense:check -- --custom-game-slug 실제공유슬러그
```

리포트는 기본적으로 아래에 생성된다.

- `reports/adsense-readiness-report.json`
- `reports/adsense-readiness-report.md`

CI에서 soft gate를 실패 상태로 받고 싶을 때만 `--ci`를 붙인다. 기본 실행은 배포 차단용이 아니다.

```bash
npm run adsense:check -- --ci
```

## 검사 범위

기준은 `config/adsense-readiness.json`에 둔다.

- 필수 공개 페이지: `/`, `/about`, `/how-to-play`, `/archive`, `/privacy`, `/terms`, `/custom/{slug}`
- sitemap에 포함된 공개 페이지
- 제외 페이지: `/api/*`, `/auth/*`, `/signin`, `/nickname`, `/custom/manage/*`
- 필수 API smoke check: `GET /api/today`

커스텀 게임 관리 token 페이지는 소유자용 비공개 흐름이므로 검사 대상에서 제외한다. 반대로 `/custom/{slug}` 공개 플레이 페이지는 사용자가 공유받아 접근하는 공개 콘텐츠이므로 검사 대상에 포함한다.

## 판정 기준

주요 hard condition은 다음이다.

- 필수 페이지가 200 HTML로 렌더링되지 않음
- 필수 페이지의 title, description, canonical이 없음
- 필수 페이지가 `noindex`임
- 필수 페이지 visible text가 기준보다 적음
- unique content ratio가 `0.50` 미만임
- 내부 링크 404/5xx가 있음
- 필수 API가 5xx 또는 네트워크 오류를 냄
- placeholder, 준비 중, 빈 링크/삭제 상태 같은 review-not-ready 문구가 보임

점수 기준은 다음이다.

- `85` 이상: `review-ready`
- `70` 이상 `85` 미만: `warning`
- `70` 미만 또는 hard condition 존재: `review-not-ready`

## 기존 하네스와의 관계

이 검사는 앱/DB 계약 검증을 대체하지 않는다. 주요 변경 전에는 기존 검증도 계속 실행한다.

```bash
npm run app:check
npm run app:implementation:check
npm run db:check
npm run typecheck
```
