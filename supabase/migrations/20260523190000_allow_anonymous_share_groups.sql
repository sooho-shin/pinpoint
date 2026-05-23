-- Main share links can create a group before the sharer signs in.

alter table public.groups
  alter column owner_user_id drop not null;
