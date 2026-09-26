alter table user_mfa add column if not exists backups text not null default '';
