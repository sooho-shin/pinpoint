# 데이터베이스 적용 절차

## 현재 상태

실제 테이블 생성 SQL은 다음 migration에 있다.

```text
supabase/migrations/20260510190000_initial_pinpoint_schema.sql
```

이 migration은 Supabase Postgres를 기준으로 한다. `profiles.id`가 `auth.users.id`를 참조하고, `auth.uid()`를 사용하는 RLS 정책이 포함되어 있으므로 일반 PostgreSQL에 그대로 적용하려면 별도 auth schema가 필요하다.

## 준비물

Supabase에 적용하려면 다음이 필요하다.

1. Supabase 프로젝트
2. Google OAuth Provider 설정
3. Supabase SQL Editor 접근 권한 또는 Supabase CLI
4. 운영 적용 시 DB 백업 또는 새 프로젝트

Google OAuth 설정에는 일반적으로 다음 값이 필요하다.

- Google Cloud OAuth Client ID
- Google Cloud OAuth Client Secret
- Supabase Auth callback URL

## 적용 전 검증

```bash
npm run db:check
```

이 명령은 DB 계약과 migration SQL이 일치하는지 확인한다.

## Supabase SQL Editor로 적용

1. Supabase Dashboard에 접속한다.
2. 대상 프로젝트를 연다.
3. SQL Editor를 연다.
4. `supabase/migrations/20260510190000_initial_pinpoint_schema.sql` 내용을 붙여넣는다.
5. 실행한다.
6. Table Editor에서 다음 테이블이 생성되었는지 확인한다.

```text
profiles
puzzles
puzzle_publications
attempts
leaderboard_entries
groups
group_members
group_leaderboard_entries
```

## Supabase CLI로 적용

로컬에 Supabase CLI가 설치되어 있고 프로젝트가 연결되어 있다면 다음 흐름을 사용한다.

```bash
supabase link --project-ref <project-ref>
supabase db push
```

이 repo에는 아직 Supabase CLI가 설치되어 있지 않다. 현재 환경에서는 `supabase` 명령이 발견되지 않았다.

## 적용 후 확인 쿼리

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'puzzles',
    'puzzle_publications',
    'attempts',
    'leaderboard_entries',
    'groups',
    'group_members',
    'group_leaderboard_entries'
  )
order by table_name;
```

RLS 확인:

```sql
select relname, relrowsecurity
from pg_class
where relname in (
  'profiles',
  'puzzles',
  'puzzle_publications',
  'attempts',
  'leaderboard_entries',
  'groups',
  'group_members',
  'group_leaderboard_entries'
)
order by relname;
```

## 주의

- `profiles`에는 이메일 컬럼을 만들지 않는다.
- 문제 공개 상태는 `puzzles`가 아니라 `puzzle_publications`에서 관리한다.
- 랭킹 API는 `leaderboard_entries` 기준으로 만든다.
- `attempts.submitted_answer`, `attempts.normalized_answer`, `device_hash`, `ip_hash`, `user_agent_hash`는 공개 API에 노출하지 않는다.
- 관리자 API는 Supabase service role 또는 별도 admin claim을 사용한다.
