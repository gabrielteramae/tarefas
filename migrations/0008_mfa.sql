create table if not exists user_mfa (
  user_id text primary key,
  secret text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists user_mfa_ok (
  session_token text primary key,
  user_id text not null,
  expires_at timestamptz not null
);
