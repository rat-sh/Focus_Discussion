-- Feature: focus sessions, plans, segments, and daily statistics
-- Depends-on: 02_profiles

CREATE TABLE IF NOT EXISTS focus_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Focus session',
  started_at      timestamptz NOT NULL DEFAULT now(),
  planned_min     integer NOT NULL CHECK (planned_min BETWEEN 5 AND 480),
  elapsed_sec     integer NOT NULL DEFAULT 0 CHECK (elapsed_sec >= 0),
  rest_budget_pct integer NOT NULL DEFAULT 10 CHECK (rest_budget_pct BETWEEN 0 AND 100),
  tracked         boolean NOT NULL DEFAULT true,
  camera_mode     text NOT NULL DEFAULT 'visible' CHECK (camera_mode IN ('visible', 'hidden')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT focus_sessions_title_length CHECK (length(title) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user
  ON focus_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS focus_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('material', 'practice', 'ai')),
  label       text NOT NULL,
  url         text NOT NULL DEFAULT '',
  host        text NOT NULL DEFAULT '',
  CONSTRAINT focus_links_unique_pos UNIQUE (session_id, position)
);

CREATE INDEX IF NOT EXISTS idx_focus_links_session ON focus_links (session_id);

CREATE TABLE IF NOT EXISTS focus_segments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  client_segment_id  text,
  seq                integer NOT NULL,
  state              text NOT NULL CHECK (state IN ('focused', 'phone', 'resting', 'lapse', 'idle')),
  start_sec          integer NOT NULL CHECK (start_sec >= 0),
  end_sec            integer NOT NULL CHECK (end_sec >= start_sec),
  CONSTRAINT focus_segments_unique_seq UNIQUE (session_id, seq)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_segments_client_id
  ON focus_segments (session_id, client_segment_id)
  WHERE client_segment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_focus_segments_session ON focus_segments (session_id);

CREATE TABLE IF NOT EXISTS daily_focus (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day          date NOT NULL,
  focused_sec  integer NOT NULL DEFAULT 0 CHECK (focused_sec >= 0),
  resting_sec  integer NOT NULL DEFAULT 0 CHECK (resting_sec >= 0),
  phone_sec    integer NOT NULL DEFAULT 0 CHECK (phone_sec >= 0),
  lapse_sec    integer NOT NULL DEFAULT 0 CHECK (lapse_sec >= 0),
  idle_sec     integer NOT NULL DEFAULT 0 CHECK (idle_sec >= 0),
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS focus_plans (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Focus session',
  duration_min     integer NOT NULL DEFAULT 50 CHECK (duration_min BETWEEN 5 AND 480),
  rest_budget_pct  integer NOT NULL DEFAULT 10 CHECK (rest_budget_pct BETWEEN 0 AND 100),
  camera_mode      text NOT NULL DEFAULT 'visible' CHECK (camera_mode IN ('visible', 'hidden')),
  tracking         text NOT NULL DEFAULT 'camera' CHECK (tracking IN ('camera', 'none')),
  links            jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(links) = 'array'),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT focus_plans_title_length CHECK (length(title) <= 100)
);

CREATE OR REPLACE FUNCTION rollup_daily_focus(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  session_user_id uuid;
  session_day date;
BEGIN
  SELECT user_id, started_at::date
  INTO session_user_id, session_day
  FROM focus_sessions
  WHERE id = p_session_id AND user_id = auth.uid();

  IF session_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Session not found';
  END IF;

  INSERT INTO daily_focus (
    user_id, day, focused_sec, resting_sec, phone_sec, lapse_sec, idle_sec
  )
  SELECT
    session_user_id,
    session_day,
    coalesce(sum(fs.end_sec - fs.start_sec) FILTER (WHERE fs.state = 'focused'), 0),
    coalesce(sum(fs.end_sec - fs.start_sec) FILTER (WHERE fs.state = 'resting'), 0),
    coalesce(sum(fs.end_sec - fs.start_sec) FILTER (WHERE fs.state = 'phone'), 0),
    coalesce(sum(fs.end_sec - fs.start_sec) FILTER (WHERE fs.state = 'lapse'), 0),
    coalesce(sum(fs.end_sec - fs.start_sec) FILTER (WHERE fs.state = 'idle'), 0)
  FROM focus_sessions s
  LEFT JOIN focus_segments fs ON fs.session_id = s.id
  WHERE s.user_id = session_user_id AND s.started_at::date = session_day
  ON CONFLICT (user_id, day) DO UPDATE SET
    focused_sec = EXCLUDED.focused_sec,
    resting_sec = EXCLUDED.resting_sec,
    phone_sec = EXCLUDED.phone_sec,
    lapse_sec = EXCLUDED.lapse_sec,
    idle_sec = EXCLUDED.idle_sec;
END;
$$;

CREATE OR REPLACE FUNCTION weekly_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  streak integer := 0;
BEGIN
  SELECT streak_days INTO streak FROM profiles WHERE user_id = uid;
  RETURN jsonb_build_object(
    'days', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'day', to_char(d, 'Dy'),
        'focusedMin', coalesce(df.focused_sec, 0) / 60,
        'restMin', coalesce(df.resting_sec, 0) / 60,
        'phoneMin', coalesce(df.phone_sec, 0) / 60,
        'lapseMin', coalesce(df.lapse_sec, 0) / 60
      ) ORDER BY d), '[]'::jsonb)
      FROM generate_series(current_date - 6, current_date, interval '1 day') AS d
      LEFT JOIN daily_focus df ON df.user_id = uid AND df.day = d::date
    ),
    'goalMin', 300,
    'streakDays', coalesce(streak, 0),
    'scoreAvg', 0,
    'doubtsAnswered', 0
  );
END;
$$;

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS focus_own ON focus_sessions;
CREATE POLICY focus_own ON focus_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS focus_links_own ON focus_links;
CREATE POLICY focus_links_own ON focus_links
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM focus_sessions s
    WHERE s.id = focus_links.session_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM focus_sessions s
    WHERE s.id = focus_links.session_id AND s.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS focus_seg_own ON focus_segments;
CREATE POLICY focus_seg_own ON focus_segments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM focus_sessions s
    WHERE s.id = focus_segments.session_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM focus_sessions s
    WHERE s.id = focus_segments.session_id AND s.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS focus_plan_own ON focus_plans;
CREATE POLICY focus_plan_own ON focus_plans
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS daily_own ON daily_focus;
CREATE POLICY daily_own ON daily_focus
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON focus_sessions, focus_links, focus_segments, daily_focus, focus_plans
  TO authenticated;
