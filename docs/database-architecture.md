# 데이터베이스 아키텍처

## 목적

데이터베이스는 한국어 Pinpoint의 제품 계약이다. 백엔드 API, 관리자 도구, 랭킹 화면은 이 문서와 `schema/database-contract.json`을 기준으로 구현한다.

DB 설계는 단순 저장소가 아니라 다음 정책을 강제해야 한다.

- Google 로그인 사용자와 공개 닉네임을 분리한다.
- 문제 원본과 일일 공개 이벤트를 분리한다.
- 일일 공개 문제와 사용자별 풀이 기록을 분리한다.
- 풀이 원장과 랭킹 노출 데이터를 분리한다.
- 같은 문제의 최초 성공 기록만 랭킹에 반영한다.
- 이메일은 랭킹, 그룹, 공유 화면에 직접 노출하지 않는다.
- flagged attempt는 운영자 검토 전까지 제한적으로 노출한다.

## 권장 스택

MVP는 PostgreSQL을 기준으로 한다. Supabase를 쓰는 경우 Auth는 `auth.users`를 사용하고, 서비스 데이터는 `public` 스키마에 둔다.

이 프로젝트는 관계형 제약이 제품 품질에 직접 연결된다. 사용자별 풀이 분리, `publication_id + user_id` 랭킹 유니크 제약, 익명 세션별 attempt 분리, 날짜별 공개 유니크 제약, 그룹 멤버십 중복 방지, RLS 정책 같은 규칙을 애플리케이션 코드에만 맡기지 않는다.

## 주요 엔티티

```text
auth.users
  -> profiles

puzzles
  -> puzzle_publications

puzzle_publications
  -> attempts
  -> leaderboard_entries
  -> daily_winner_messages

groups
  -> group_members
  -> group_leaderboard_entries
```

## 테이블 역할

### profiles

앱 공개 프로필이다. Google OAuth의 이메일은 인증 식별에만 사용하고, 앱 공개 표시는 `nickname`을 사용한다.

주요 컬럼:

- `id`: 인증 사용자 ID
- `nickname`: 랭킹/공유 표시명
- `nickname_normalized`: 검색/검증용 정규화 닉네임
- `avatar_url`: 선택 프로필 이미지
- `created_at`, `updated_at`

### puzzles

문제 원본이다. 현재 `schema/puzzle.schema.json`의 핵심 필드를 DB로 옮긴다. 예약/공개 상태는 문제 원본이 아니라 `puzzle_publications`에서 관리한다.

주요 컬럼:

- `id`
- `locale`
- `answer`
- `aliases`
- `category`
- `difficulty`
- `clues`
- `rationale`
- `status`
- `quality_score`
- `issue_flags`
- `review_reason`
- `reviewed_at`
- `created_at`, `updated_at`

상태:

```text
generated -> rejected
```

공개가 끝났다고 문제 원본을 `published`로 바꾸지 않는다. 공개 상태는 `puzzle_publications.status`가 가진다.

### puzzle_publications

특정 문제를 특정 운영일에 공개하는 이벤트다. 하루 한 문제 정책은 `publish_date_kst` 유니크 제약으로 강제한다. 여기서 하루는 KST 17:00부터 다음날 KST 17:00 직전까지이며, `publish_date_kst`는 그 운영일이 시작된 KST 날짜다.

`puzzle_publications`는 문제 공개 이벤트일 뿐, 풀이 독점권이 아니다. 하나의 공개 문제는 모든 로그인 사용자와 익명 세션이 각자의 `attempts` row로 풀 수 있어야 한다.

상태:

```text
scheduled -> published
          -> canceled
```

운영 동기화:

- `data/daily-puzzles.ko.json`에 예약된 문제는 `puzzle_publications.status = scheduled`로 먼저 DB에 올라간다.
- `publish_date_kst`는 `scheduled_at`을 Asia/Seoul 기준 날짜로 변환해 저장한다.
- KST 17:00 스케줄러는 오늘 날짜의 `scheduled` row 중 `scheduled_at <= now()`인 row만 `published`로 전환한다.
- 오늘 row가 없으면 스케줄러는 미사용 `generated` 후보를 선택해 오늘 `published` row를 생성한다.
- 앱의 오늘 문제 조회는 JSON이 아니라 활성 공개일의 `puzzle_publications.publish_date_kst`와 `status = published` 조건을 기준으로 한다.
- 활성 공개일은 현재 KST 시간이 17:00 전이면 전날 날짜, 17:00 이후이면 오늘 날짜다. 따라서 KST 00:00 이후에도 17:00 전까지는 전날 공개 문제가 계속 노출된다.
- 서비스 role key는 서버 스크립트와 cron route에서만 사용하고 client component 또는 public env로 노출하지 않는다.

### attempts

풀이 기록 원장이다. 실패, 비공개, 로그인 사용자 세션, 익명 세션, flagged 상태를 포함한다. 랭킹 노출 여부와 별개로 운영 분석과 부정 방지에 사용한다. MVP 플레이 흐름은 익명 시작을 허용하므로 새 attempt는 `user_id` 또는 `anonymous_session_id` 중 하나를 반드시 가진다.

사용자별 풀이 정책:

- 같은 `publication_id`에 대해 여러 사용자가 각각 attempt를 만들 수 있다.
- 한 사용자의 terminal attempt는 같은 `publication_id`를 푸는 다른 사용자를 막지 않는다.
- 이어풀기 조회는 로그인 사용자는 `publication_id + user_id`, 비로그인 사용자는 `publication_id + anonymous_session_id` 기준으로 한다.
- 같은 브라우저에서 비로그인으로 만든 attempt는 로그인 후 동일 publication의 사용자 attempt로 승계할 수 있다.
- 승계 시 이미 `publication_id + user_id` attempt가 있으면 사용자 attempt를 우선하고 익명 attempt를 새 풀이로 쓰지 않는다.
- 승계된 성공 attempt는 프로필이 있으면 `leaderboard_entries` projection 생성 대상이 될 수 있다.
- `leaderboard_entries` 또는 `daily_winner_messages` 존재 여부로 attempt 생성을 막지 않는다.

### leaderboard_entries

랭킹 조회용 데이터다. 성공했고 랭킹 등록 조건을 만족한 기록만 생성한다. 화면 표시에는 현재 `profiles.nickname`을 기본 사용하되, 공유/감사를 위해 `nickname_snapshot`도 저장한다.

정렬 기준:

```text
1순위: used_clue_count asc
2순위: elapsed_ms asc
3순위: submitted_at asc
```

### daily_winner_messages

오늘의 1등 확성기 메시지 projection이다. 특정 `puzzle_publication`의 오늘의 랭킹 1등에게 하루 동안 메인 화면 최상단에 노출되는 100자 메시지 권한을 준다.

주요 정책:

- `publication_id`당 visible 메시지는 하나만 허용한다.
- 메시지는 `leaderboard_entries`를 참조해 1등 랭킹 기록과 연결한다.
- `message`는 1~100자다.
- `visible_from`부터 `visible_until` 전까지 공개한다. 기본적으로 `visible_until`은 다음 문제 공개 시각이다.
- 공개 API는 `nickname_snapshot`, `message`, `visible_until`만 노출한다.
- 운영자는 `message_status = hidden`으로 부적절한 메시지를 숨길 수 있다.
- 이메일, 제출 답안, 해시 식별자는 이 테이블과 공개 API에 포함하지 않는다.

### daily_puzzle_feedback

오늘 문제를 완료한 로그인 사용자가 랭킹 화면에서 남기는 평가와 한마디다. `daily_winner_messages`가 1등 전용 보상이라면, 이 테이블은 완료자끼리 문제 경험을 공유하는 소통 데이터다.

권장 컬럼:

- `id`
- `publication_id`: `puzzle_publications.id` 참조
- `user_id`: `profiles.id` 참조
- `attempt_id`: `attempts.id` 참조. 해당 사용자가 오늘 문제를 완료했는지 검증하는 기준으로 사용한다.
- `nickname_snapshot`: 작성 시점의 표시명
- `rating` 또는 `reaction`: 문제 평가 값. 예: `easy`, `good`, `hard`, `tricky`, `fun`
- `comment`: 1~140자 한마디
- `feedback_status`: `visible`, `hidden`
- `created_at`
- `updated_at`

주요 정책:

- `publication_id, user_id` 조합은 unique다. 같은 사용자는 같은 공개 문제에 하나의 평가만 남긴다.
- 작성은 로그인 + 닉네임 + 오늘 문제 완료 attempt가 있는 사용자에게만 허용한다.
- 조회도 오늘 문제를 완료한 사용자에게만 허용한다. 비완료자에게는 목록을 반환하지 않는다.
- 공개 API는 `nickname_snapshot`, `rating/reaction`, `comment`, `created_at`만 반환한다.
- `comment`는 1~140자로 제한한다.
- 운영자는 `feedback_status = hidden`으로 부적절하거나 스포일러가 포함된 평가를 숨길 수 있다.
- 이메일, 제출 답안, 정답, aliases, 해시 식별자는 이 테이블과 공개 API에 포함하지 않는다.
- dev reset은 오늘 publication의 평가 row를 함께 삭제한다.

### groups

공유 링크 또는 초대 코드로 만들어진 그룹 랭킹 컨테이너다. MVP에서는 특정 `puzzle_publication`에 종속된 일회성 그룹을 기본값으로 둔다. 그룹 생성자는 로그인 + 닉네임 설정을 완료해야 하며, `invite_code`는 `/ranking?group={invite_code}` 링크에 사용한다.

### group_members

그룹 참여자 목록이다. 같은 사용자가 같은 그룹에 중복 참여할 수 없다. 초대 링크로 들어온 로그인 + 닉네임 사용자는 이 테이블에 upsert된다.

### group_leaderboard_entries

그룹에 노출되는 랭킹 항목이다. 실제 점수와 정렬 필드는 `leaderboard_entries`를 참조한다. 멤버가 이미 오늘 visible 랭킹 기록을 갖고 있으면 그룹 참여 시 연결하고, 그룹 참여 후 문제를 성공하면 성공 시점에 속한 그룹들에 연결한다.

## 공개/비공개 정책

- `profiles.email` 같은 공개 이메일 컬럼은 만들지 않는다.
- API가 이메일을 필요로 하면 인증 제공자의 사용자 객체에서 서버 내부 용도로만 읽는다.
- 공개 랭킹 API는 `nickname`, `used_clue_count`, `elapsed_ms`, `submitted_at`, `rank_status`만 반환한다.
- 공개 확성기 API는 `nickname`, `message`, `visible_until`만 반환한다.
- 완료자 전용 평가 API는 `nickname`, `rating/reaction`, `comment`, `created_at`만 반환한다.
- `attempts.submitted_answer`는 기본적으로 본인과 운영자만 볼 수 있다.

## 부정 방지 정책

- 같은 사용자, 같은 공개 문제의 랭킹 기록은 하나만 허용한다.
- 비정상적으로 짧은 풀이 시간은 `flagged` 또는 `rank_status = flagged`로 둔다.
- 정답 공개 후 재도전 기록은 `attempts`에는 남기되 `leaderboard_entries`에는 넣지 않는다.
- `device_hash`, `ip_hash`, `user_agent_hash`는 원문이 아니라 해시로만 저장한다.

## 하네스 계약

`schema/database-contract.json`은 이 문서의 기계 검증 가능한 계약이다. 백엔드 API 또는 DB migration 작업 전에는 반드시 다음 명령을 실행한다.

```bash
npm run db:contract
```

계약이 실패하면 API 구현을 진행하지 않는다. 필요한 변경은 먼저 제품 기획과 DB 계약을 함께 갱신한다.
