-- История автоматических снимков Iris.
create table if not exists iris_admin_snapshots (
  id uuid primary key default gen_random_uuid(),
  group_code text not null check (group_code in ('BLACK', 'BLUE')),
  source_chat text not null,
  raw_text text not null,
  parsed_admins jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists iris_admin_snapshots_group_chat_idx
  on iris_admin_snapshots(group_code, source_chat, created_at desc);

-- Текущие назначения Iris. Telegram ID — основной ключ для автоматической
-- выдачи роли при входе в Mini App; username/display_name используются как
-- человекочитаемый fallback.
create table if not exists iris_admin_assignments (
  username text not null,
  display_name text not null default '',
  telegram_id bigint,
  group_code text not null check (group_code in ('BLACK', 'BLUE')),
  rank_code text not null,
  stars int not null check (stars between 1 and 5),
  source_chat text not null,
  seen_at timestamptz not null default now(),
  primary key (username, group_code)
);

alter table iris_admin_assignments add column if not exists telegram_id bigint;
create index if not exists iris_admin_assignments_group_idx
  on iris_admin_assignments(group_code, stars desc);
create index if not exists iris_admin_assignments_telegram_idx
  on iris_admin_assignments(telegram_id, stars desc);

-- Базовые роли, необходимые для production auth/RBAC.
insert into roles(code, name, stars_min) values
  ('USER', 'Стажер', 1),
  ('JUNIOR_STAFF', 'Ст.стажер', 2),
  ('SENIOR_STAFF', 'Админ', 3),
  ('SENIOR_ADMIN', 'Гл Админ', 4),
  ('SYS_ADMIN', 'Сис админ', 1),
  ('SUPER_ADMIN', 'Владелец', 5)
on conflict (code) do update
set name = excluded.name, stars_min = excluded.stars_min;
