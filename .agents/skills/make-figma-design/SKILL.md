---
name: make-figma-design
description: 사용자가 `$make-figma-design`처럼 요청하면 한국어 Pinpoint의 Figma 디자인을 design-first 방식으로 생성하거나 갱신한다. Atomic Design, Figma MCP, design system, screens, screenshot validation.
---

# Make Figma Design

이 스킬은 한국어 Pinpoint의 Figma 디자인을 생성하거나 갱신할 때 사용한다. 이 프로젝트는 디자인을 먼저 만들고 그 다음 코드를 작성한다.

## 필수 참조 문서

작업 전 반드시 아래 문서를 읽는다.

1. `docs/product-plan.md`
2. `docs/design-plan.md`
3. `docs/figma-architecture.md`
4. `docs/figma-operations.md`
5. `design/tokens.json`
6. `design/components.json`
7. `design/screens.json`
8. `references/atomic-design-rules.md`
9. `references/figma-design-workflow.md`

## 핵심 원칙

- Code Connect는 초기 디자인 생성 단계에서 사용하지 않는다.
- 먼저 Figma 디자인 시스템과 화면을 만든다.
- 앱 코드가 생긴 뒤에 Code Connect를 연결한다.
- Atomic Design 계층을 유지한다.
- 첫 화면은 랜딩 페이지가 아니라 실제 Today Puzzle 화면이다.
- 모바일 우선으로 만들고, Admin 화면은 데스크톱 우선으로 만든다.

## 실행 절차

1. Figma 파일 생성 또는 대상 Figma 파일 확인
2. 페이지 생성: `00 Foundations`, `01 Components`, `02 Screens`, `03 Admin`, `04 Prototype Notes`
3. Foundations 토큰 배치
4. Atomic 컴포넌트 생성
5. Today Puzzle, Solved Result, Failed Result, Admin Review 화면 생성
6. `get_screenshot`으로 주요 화면 확인
7. `get_metadata` 또는 `use_figma` 검사로 페이지/컴포넌트 누락 확인
8. 결과를 `reports/figma-design-report.json`에 기록

## 보고 형식

최종 보고에는 다음을 포함한다.

- Figma 파일 URL
- 생성/수정한 페이지
- 생성/수정한 컴포넌트
- 생성/수정한 화면
- 검증 결과
- Code Connect를 아직 실행하지 않은 이유 또는 실행 가능 조건
