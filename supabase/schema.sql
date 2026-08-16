create extension if not exists pgcrypto;
create table if not exists roles (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, stars_min int not null default 1, created_at timestamptz default now());
create table if not exists permissions (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null);
create table if not exists role_permissions (role_id uuid references roles(id) on delete cascade, permission_id uuid references permissions(id) on delete cascade, primary key(role_id, permission_id));
create table if not exists users (id uuid primary key default gen_random_uuid(), telegram_id bigint unique not null, username text, first_name text not null default '', last_name text, avatar_url text, stars int not null default 1 check(stars between 1 and 5), role_id uuid references roles(id), created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists navigation_categories (id uuid primary key default gen_random_uuid(), title text not null, icon text, sort_order int not null default 0, is_visible boolean not null default true);
create table if not exists navigation_items (id uuid primary key default gen_random_uuid(), category_id uuid references navigation_categories(id) on delete cascade, title text not null, body text not null default '', image_url text, sort_order int not null default 0, is_visible boolean not null default true);
create table if not exists tasks (id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', status text not null default 'NEW', priority text not null default 'MEDIUM', assignee_id uuid references users(id), created_by uuid references users(id), due_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists task_images (id uuid primary key default gen_random_uuid(), task_id uuid references tasks(id) on delete cascade, url text not null, mime_type text not null, size_bytes int not null);
create table if not exists checks (id uuid primary key default gen_random_uuid(), user_id uuid references users(id), title text not null, checked_at timestamptz default now());
create table if not exists check_results (id uuid primary key default gen_random_uuid(), check_id uuid references checks(id) on delete cascade, score int not null, comment text);
create table if not exists afk_records (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade, reason text not null, starts_at timestamptz not null default now(), ends_at timestamptz, active boolean not null default true, created_by uuid references users(id));
create table if not exists audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid references users(id), action text not null, entity text not null, entity_id text, payload jsonb, created_at timestamptz default now());

-- Расширение системы проверок / AFK / уведомлений.
alter table users add column if not exists admin_since timestamptz;
alter table users add column if not exists prefix text;
alter table users add column if not exists prefix_color text;
alter table users add column if not exists status text;
alter table checks add column if not exists reviewer_id uuid references users(id);
alter table checks add column if not exists messages int not null default 0;
alter table checks add column if not exists messages_max int not null default 1;
alter table checks add column if not exists replies int not null default 0;
alter table checks add column if not exists replies_max int not null default 1;
alter table checks add column if not exists max_score int not null default 1;
alter table checks add column if not exists items jsonb not null default '[]'::jsonb;
alter table checks add column if not exists repeat_notes jsonb not null default '[]'::jsonb;
alter table afk_records add column if not exists status text not null default 'PENDING';
alter table afk_records add column if not exists reviewed_by uuid references users(id);
alter table afk_records add column if not exists reviewed_at timestamptz;
alter table afk_records add column if not exists review_comment text;
create table if not exists notifications (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade, type text not null, title text not null, body text not null, read boolean not null default false, entity_id text, created_at timestamptz not null default now());
create index if not exists notifications_user_idx on notifications(user_id, read, created_at desc);

-- Системная роль
insert into roles(code,name,stars_min) values
  ('USER','Стажер',1),
  ('JUNIOR_STAFF','Ст.стажер',2),
  ('SENIOR_STAFF','Админ',3),
  ('SENIOR_ADMIN','Гл Админ',4),
  ('SYS_ADMIN','Сис админ',1),
  ('SUPER_ADMIN','Владелец',5)
on conflict (code) do update set name=excluded.name, stars_min=excluded.stars_min;
