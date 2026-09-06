CREATE TABLE IF NOT EXISTS study_entries (
  member_id text NOT NULL CHECK (member_id IN ('member-1','member-2')),
  day integer NOT NULL CHECK (day BETWEEN 0 AND 55),
  kind text NOT NULL CHECK (kind IN ('python','sql')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 150),
  problem_id bigint NOT NULL CHECK (problem_id > 0),
  minutes integer NOT NULL CHECK (minutes BETWEEN 0 AND 600),
  result text NOT NULL CHECK (result IN ('self','hint','solution','unsolved')),
  reason text NOT NULL DEFAULT '',
  idea text NOT NULL DEFAULT '',
  caution text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id,day,kind)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS study_settings (
  member_id text PRIMARY KEY CHECK (member_id IN ('member-1','member-2')),
  start_date date NOT NULL DEFAULT '2026-09-07' CHECK (EXTRACT(ISODOW FROM start_date) = 1),
  reminder_time text NOT NULL DEFAULT '20:00' CHECK (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS study_login_limits (
  bucket text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS study_login_limits_expiration ON study_login_limits (expires_at);
