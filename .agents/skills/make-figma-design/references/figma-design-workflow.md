# Figma 디자인 워크플로우

## 디자인 우선 흐름

이 프로젝트는 Figma 디자인을 먼저 확정하고 나중에 코드를 작성한다.

```text
Figma 디자인 시스템
→ Figma 화면
→ 검증
→ 앱 코드
→ Code Connect
```

## Figma MCP 사용

- 새 파일이 필요하면 `create_new_file`을 사용한다.
- Figma에 객체를 만들거나 수정할 때는 `use_figma`를 사용한다.
- 결과 이미지를 확인할 때는 `get_screenshot`을 사용한다.
- 구조 확인이 필요하면 `get_metadata`를 사용한다.

## 검증

최소 검증 항목:

- 필요한 페이지가 모두 있는가
- Foundations가 있는가
- Atomic 컴포넌트 계층이 있는가
- Today Puzzle 화면이 있는가
- Result 화면이 있는가
- Admin Review 화면이 있는가
- 모바일 화면에서 텍스트가 넘치지 않는가
- 동일 역할 UI가 같은 컴포넌트 스타일을 따르는가

## Code Connect

초기 디자인 생성 단계에서는 Code Connect를 실행하지 않는다. Code Connect는 코드 컴포넌트가 생기고 Figma 컴포넌트가 정리된 뒤 수행한다.
