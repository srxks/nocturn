-- Nocturn Complete Supabase PostgreSQL Schema & RLS Security Migration
-- Migration: 20260905000000_create_nocturn_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. USER PROFILES / PROFILES TABLES
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own user_profile" ON public.user_profiles;
CREATE POLICY "Users can view their own user_profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own user_profile" ON public.user_profiles;
CREATE POLICY "Users can update their own user_profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own user_profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own user_profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own user_profile" ON public.user_profiles;
CREATE POLICY "Users can delete their own user_profile"
  ON public.user_profiles FOR DELETE
  USING (auth.uid() = id OR auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id OR auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 2. USER SETTINGS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  accent_color TEXT DEFAULT '#00E676',
  glow_color TEXT DEFAULT '#00E676',
  background_color TEXT DEFAULT '#090A0F',
  card_color TEXT DEFAULT '#12141D',
  font_family TEXT DEFAULT 'Inter, sans-serif',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 3. THEMES TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  glow_color TEXT NOT NULL,
  background_color TEXT NOT NULL,
  card_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  muted_text_color TEXT NOT NULL,
  border_color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own themes" ON public.themes;
CREATE POLICY "Users can manage their own themes"
  ON public.themes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 4. TASK LISTS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own task lists" ON public.task_lists;
CREATE POLICY "Users can manage their own task lists"
  ON public.task_lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 5. TASKS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.task_lists(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  due_date TEXT,
  reminder_at TIMESTAMPTZ,
  recurrence_type TEXT DEFAULT 'none',
  recurrence_interval INT DEFAULT 1,
  recurrence_end_date TEXT,
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 6. SUBTASKS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own subtasks" ON public.subtasks;
CREATE POLICY "Users can manage their own subtasks"
  ON public.subtasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 7. TIMER SETTINGS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB,
  focus_duration INT DEFAULT 25,
  short_break_duration INT DEFAULT 5,
  long_break_duration INT DEFAULT 15,
  cycles INT DEFAULT 4,
  auto_start_breaks BOOLEAN DEFAULT FALSE,
  auto_start_focus BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.timer_settings ADD COLUMN IF NOT EXISTS auto_start_focus BOOLEAN DEFAULT FALSE;
ALTER TABLE public.timer_settings ADD COLUMN IF NOT EXISTS settings JSONB;

ALTER TABLE public.timer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own timer settings" ON public.timer_settings;
CREATE POLICY "Users can manage their own timer settings"
  ON public.timer_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 8. FOCUS SESSIONS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 1500,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage their own focus sessions"
  ON public.focus_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 9. VOCAB WORDS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vocab_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example_sentence TEXT,
  date_added TEXT,
  correct_count INT DEFAULT 0 CHECK (correct_count >= 0 AND correct_count <= 5),
  last_quizzed_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own vocab words" ON public.vocab_words;
CREATE POLICY "Users can manage their own vocab words"
  ON public.vocab_words FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 10. VOCAB DAILY SETS TABLE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vocab_daily_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_date TEXT NOT NULL,
  words JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vocab_daily_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own vocab daily sets" ON public.vocab_daily_sets;
CREATE POLICY "Users can manage their own vocab daily sets"
  ON public.vocab_daily_sets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 11. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.profiles
  INSERT INTO public.profiles (id, user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

  -- Insert into public.user_profiles
  INSERT INTO public.user_profiles (id, user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- 12. INDEXES FOR HIGH-PERFORMANCE QUERIES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_themes_user_id ON public.themes(user_id);
CREATE INDEX IF NOT EXISTS idx_task_lists_user_id ON public.task_lists(user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON public.tasks(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_list_id ON public.tasks(user_id, list_id);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_user_id ON public.subtasks(user_id);

CREATE INDEX IF NOT EXISTS idx_timer_settings_user_id ON public.timer_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON public.focus_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_vocab_words_user_id ON public.vocab_words(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_words_user_quizzed ON public.vocab_words(user_id, last_quizzed_date);
CREATE INDEX IF NOT EXISTS idx_vocab_daily_sets_user_date ON public.vocab_daily_sets(user_id, generation_date);
