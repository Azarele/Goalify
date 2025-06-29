/*
  # Fix Database Functions and Complete Setup

  1. Drop and recreate functions with correct signatures
  2. Ensure all tables and columns exist
  3. Set up proper RLS policies
  4. Create performance indexes
  5. Initialize user stats and triggers
*/

-- =====================================================
-- 1. DROP EXISTING FUNCTIONS TO AVOID CONFLICTS
-- =====================================================

DROP FUNCTION IF EXISTS get_user_rank(uuid);
DROP FUNCTION IF EXISTS get_global_leaderboard(text, integer);
DROP FUNCTION IF EXISTS create_user_goal(text, integer, text, integer, timestamptz, uuid);
DROP FUNCTION IF EXISTS complete_goal_with_xp(uuid, text, integer);
DROP FUNCTION IF EXISTS get_user_goals(uuid, boolean, integer);
DROP FUNCTION IF EXISTS soft_delete_conversation(uuid);

-- =====================================================
-- 2. ENSURE ALL REQUIRED COLUMNS EXIST
-- =====================================================

-- Add missing columns to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_synced') THEN
    ALTER TABLE user_profiles ADD COLUMN last_synced TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add missing columns to conversations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'ai_label') THEN
    ALTER TABLE conversations ADD COLUMN ai_label TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'category') THEN
    ALTER TABLE conversations ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'soft_deleted') THEN
    ALTER TABLE conversations ADD COLUMN soft_deleted BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_synced') THEN
    ALTER TABLE conversations ADD COLUMN last_synced TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'sync_status') THEN
    ALTER TABLE conversations ADD COLUMN sync_status TEXT DEFAULT 'synced';
  END IF;
END $$;

-- Add missing columns to goals
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'last_synced') THEN
    ALTER TABLE goals ADD COLUMN last_synced TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'sync_status') THEN
    ALTER TABLE goals ADD COLUMN sync_status TEXT DEFAULT 'synced';
  END IF;
END $$;

-- Add missing columns to messages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'last_synced') THEN
    ALTER TABLE messages ADD COLUMN last_synced TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sync_status') THEN
    ALTER TABLE messages ADD COLUMN sync_status TEXT DEFAULT 'synced';
  END IF;
END $$;

-- =====================================================
-- 3. ADD CHECK CONSTRAINTS
-- =====================================================

DO $$
BEGIN
  -- Category constraint for conversations
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'conversations_category_check') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_category_check 
    CHECK (category = ANY (ARRAY['career'::text, 'health'::text, 'relationships'::text, 'productivity'::text, 'personal'::text, 'goals'::text, 'general'::text]));
  END IF;
  
  -- Sync status constraints
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'conversations_sync_status_check') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_sync_status_check 
    CHECK (sync_status = ANY (ARRAY['synced'::text, 'pending'::text, 'conflict'::text]));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'goals_sync_status_check') THEN
    ALTER TABLE goals ADD CONSTRAINT goals_sync_status_check 
    CHECK (sync_status = ANY (ARRAY['synced'::text, 'pending'::text, 'conflict'::text]));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'messages_sync_status_check') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_sync_status_check 
    CHECK (sync_status = ANY (ARRAY['synced'::text, 'pending'::text, 'conflict'::text]));
  END IF;
END $$;

-- =====================================================
-- 4. CREATE TRIGGER FUNCTIONS
-- =====================================================

-- Function to update user stats when goals are created
CREATE OR REPLACE FUNCTION update_user_stats_on_goal_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_goals_created)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_goals_created = user_stats.total_goals_created + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when goals are completed
CREATE OR REPLACE FUNCTION update_user_stats_on_goal_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if goal was just completed
  IF OLD.completed = FALSE AND NEW.completed = TRUE THEN
    INSERT INTO user_stats (user_id, total_goals_completed, total_xp_earned)
    VALUES (NEW.user_id, 1, NEW.xp_value)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_goals_completed = user_stats.total_goals_completed + 1,
      total_xp_earned = user_stats.total_xp_earned + NEW.xp_value,
      last_goal_completed_date = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when conversations are created
CREATE OR REPLACE FUNCTION update_user_stats_on_conversation_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_sessions)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_sessions = user_stats.total_sessions + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when streak changes
CREATE OR REPLACE FUNCTION update_user_stats_on_streak_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update highest streak if current streak is higher
  IF NEW.daily_streak > OLD.daily_streak THEN
    INSERT INTO user_stats (user_id, highest_streak)
    VALUES (NEW.user_id, NEW.daily_streak)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      highest_streak = GREATEST(user_stats.highest_streak, NEW.daily_streak),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE/UPDATE TRIGGERS
-- =====================================================

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_stats_on_goal_create ON goals;
DROP TRIGGER IF EXISTS trigger_update_stats_on_goal_complete ON goals;
DROP TRIGGER IF EXISTS trigger_update_stats_on_conversation_create ON conversations;
DROP TRIGGER IF EXISTS trigger_update_stats_on_streak_change ON user_profiles;

-- Create new triggers
CREATE TRIGGER trigger_update_stats_on_goal_create
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_goal_create();

CREATE TRIGGER trigger_update_stats_on_goal_complete
  AFTER UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_goal_complete();

CREATE TRIGGER trigger_update_stats_on_conversation_create
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_conversation_create();

CREATE TRIGGER trigger_update_stats_on_streak_change
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_streak_change();

-- =====================================================
-- 6. CREATE DATABASE FUNCTIONS WITH CORRECT SIGNATURES
-- =====================================================

-- Fixed global leaderboard function
CREATE OR REPLACE FUNCTION get_global_leaderboard(
  sort_by TEXT DEFAULT 'xp',
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  level INTEGER,
  total_xp INTEGER,
  goals_completed INTEGER,
  goals_created INTEGER,
  daily_streak INTEGER,
  highest_streak INTEGER,
  total_sessions INTEGER,
  completion_rate NUMERIC,
  rank_by_xp INTEGER,
  rank_by_goals INTEGER,
  rank_by_streak INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT 
      up.user_id,
      COALESCE(up.name, 'Anonymous User') as name,
      COALESCE(up.level, 1) as level,
      COALESCE(up.total_xp, 0) as total_xp,
      COALESCE(up.daily_streak, 0) as daily_streak,
      COALESCE(us.total_goals_completed, 0) as goals_completed,
      COALESCE(us.total_goals_created, 0) as goals_created,
      COALESCE(us.highest_streak, up.daily_streak, 0) as highest_streak,
      COALESCE(us.total_sessions, 0) as total_sessions,
      CASE 
        WHEN COALESCE(us.total_goals_created, 0) > 0 
        THEN ROUND((COALESCE(us.total_goals_completed, 0)::NUMERIC / us.total_goals_created::NUMERIC) * 100, 0)
        ELSE 0 
      END as completion_rate
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.user_id = us.user_id
    WHERE up.total_xp > 0 OR COALESCE(us.total_goals_completed, 0) > 0 OR COALESCE(us.total_sessions, 0) > 0
  ),
  ranked_data AS (
    SELECT 
      *,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC, goals_completed DESC, highest_streak DESC) as rank_by_xp,
      ROW_NUMBER() OVER (ORDER BY goals_completed DESC, total_xp DESC, highest_streak DESC) as rank_by_goals,
      ROW_NUMBER() OVER (ORDER BY highest_streak DESC, total_xp DESC, goals_completed DESC) as rank_by_streak
    FROM user_data
  )
  SELECT 
    rd.user_id,
    rd.name,
    rd.level,
    rd.total_xp,
    rd.goals_completed,
    rd.goals_created,
    rd.daily_streak,
    rd.highest_streak,
    rd.total_sessions,
    rd.completion_rate,
    rd.rank_by_xp::INTEGER,
    rd.rank_by_goals::INTEGER,
    rd.rank_by_streak::INTEGER
  FROM ranked_data rd
  ORDER BY 
    CASE 
      WHEN sort_by = 'goals' THEN rd.rank_by_goals
      WHEN sort_by = 'streak' THEN rd.rank_by_streak
      ELSE rd.rank_by_xp
    END
  LIMIT limit_count;
END;
$$;

-- Fixed user rank function
CREATE OR REPLACE FUNCTION get_user_rank(target_user_id UUID)
RETURNS TABLE (
  rank_by_xp INTEGER,
  rank_by_goals INTEGER,
  rank_by_streak INTEGER,
  total_users INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT 
      up.user_id,
      COALESCE(up.total_xp, 0) as total_xp,
      COALESCE(us.total_goals_completed, 0) as goals_completed,
      COALESCE(us.highest_streak, up.daily_streak, 0) as highest_streak
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.user_id = us.user_id
    WHERE up.total_xp > 0 OR COALESCE(us.total_goals_completed, 0) > 0 OR COALESCE(us.total_sessions, 0) > 0
  ),
  target_user_data AS (
    SELECT total_xp, goals_completed, highest_streak
    FROM user_data 
    WHERE user_id = target_user_id
  ),
  rankings AS (
    SELECT 
      COALESCE((SELECT COUNT(*) + 1 FROM user_data WHERE total_xp > (SELECT COALESCE(total_xp, 0) FROM target_user_data)), 999) as rank_by_xp,
      COALESCE((SELECT COUNT(*) + 1 FROM user_data WHERE goals_completed > (SELECT COALESCE(goals_completed, 0) FROM target_user_data)), 999) as rank_by_goals,
      COALESCE((SELECT COUNT(*) + 1 FROM user_data WHERE highest_streak > (SELECT COALESCE(highest_streak, 0) FROM target_user_data)), 999) as rank_by_streak,
      (SELECT COUNT(*) FROM user_data) as total_users
  )
  SELECT 
    rankings.rank_by_xp::INTEGER,
    rankings.rank_by_goals::INTEGER,
    rankings.rank_by_streak::INTEGER,
    rankings.total_users::INTEGER
  FROM rankings;
END;
$$;

-- Goal creation function
CREATE OR REPLACE FUNCTION create_user_goal(
  goal_description TEXT,
  goal_xp_value INTEGER DEFAULT 50,
  goal_difficulty TEXT DEFAULT 'medium',
  goal_motivation INTEGER DEFAULT 5,
  goal_deadline TIMESTAMPTZ DEFAULT NULL,
  session_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_goal_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'User not authenticated';
    RETURN;
  END IF;

  -- Validate inputs
  IF goal_description IS NULL OR LENGTH(TRIM(goal_description)) < 10 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Goal description must be at least 10 characters';
    RETURN;
  END IF;

  -- Generate new goal ID
  new_goal_id := gen_random_uuid();

  -- Insert the goal
  INSERT INTO goals (
    id,
    user_id,
    session_id,
    description,
    xp_value,
    difficulty,
    motivation,
    deadline,
    created_at,
    updated_at,
    last_synced,
    sync_status
  ) VALUES (
    new_goal_id,
    current_user_id,
    session_id,
    TRIM(goal_description),
    GREATEST(10, goal_xp_value),
    goal_difficulty,
    GREATEST(1, LEAST(10, goal_motivation)),
    goal_deadline,
    NOW(),
    NOW(),
    NOW(),
    'synced'
  );

  RETURN QUERY SELECT TRUE, new_goal_id, 'Goal created successfully';
END;
$$;

-- Goal completion function
CREATE OR REPLACE FUNCTION complete_goal_with_xp(
  goal_id UUID,
  completion_reasoning TEXT,
  calculated_xp INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  new_total_xp INTEGER,
  new_level INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  goal_user_id UUID;
  goal_completed BOOLEAN;
  current_xp INTEGER;
  current_level INTEGER;
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'User not authenticated';
    RETURN;
  END IF;

  -- Verify goal exists and get details
  SELECT user_id, completed INTO goal_user_id, goal_completed 
  FROM goals 
  WHERE id = goal_id;
  
  IF goal_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Goal not found';
    RETURN;
  END IF;
  
  IF goal_user_id != current_user_id THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Goal does not belong to user';
    RETURN;
  END IF;
  
  IF goal_completed = TRUE THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Goal already completed';
    RETURN;
  END IF;

  -- Validate completion reasoning
  IF completion_reasoning IS NULL OR LENGTH(TRIM(completion_reasoning)) < 20 THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Completion reasoning must be at least 20 characters';
    RETURN;
  END IF;

  -- Get current user XP and level
  SELECT COALESCE(total_xp, 0), COALESCE(level, 1) 
  INTO current_xp, current_level 
  FROM user_profiles 
  WHERE user_id = current_user_id;

  -- Calculate new XP and level
  new_xp := current_xp + GREATEST(1, calculated_xp);
  new_level := GREATEST(1, (new_xp / 1000) + 1);

  -- Update goal as completed
  UPDATE goals 
  SET 
    completed = TRUE,
    completed_at = NOW(),
    completion_reasoning = TRIM(completion_reasoning),
    xp_value = GREATEST(1, calculated_xp),
    updated_at = NOW(),
    last_synced = NOW(),
    sync_status = 'synced'
  WHERE id = goal_id;

  -- Update user profile with new XP and level
  UPDATE user_profiles 
  SET 
    total_xp = new_xp,
    level = new_level,
    updated_at = NOW(),
    last_synced = NOW()
  WHERE user_id = current_user_id;

  RETURN QUERY SELECT TRUE, new_xp, new_level, 'Goal completed successfully';
END;
$$;

-- Get user goals function
CREATE OR REPLACE FUNCTION get_user_goals(
  target_user_id UUID,
  include_completed BOOLEAN DEFAULT TRUE,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  xp_value INTEGER,
  difficulty TEXT,
  motivation INTEGER,
  completed BOOLEAN,
  completed_at TIMESTAMPTZ,
  completion_reasoning TEXT,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user can access these goals
  IF auth.uid() != target_user_id THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    g.id,
    g.description,
    g.xp_value,
    g.difficulty,
    g.motivation,
    g.completed,
    g.completed_at,
    g.completion_reasoning,
    g.deadline,
    g.created_at
  FROM goals g
  WHERE g.user_id = target_user_id
    AND (include_completed OR NOT g.completed)
  ORDER BY 
    g.completed ASC,
    g.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Soft delete conversation function
CREATE OR REPLACE FUNCTION soft_delete_conversation(conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_user_id UUID;
BEGIN
  -- Get conversation owner
  SELECT user_id INTO conversation_user_id 
  FROM conversations 
  WHERE id = conversation_id AND soft_deleted = FALSE;
  
  -- Verify ownership
  IF conversation_user_id IS NULL OR conversation_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Soft delete the conversation
  UPDATE conversations 
  SET 
    soft_deleted = TRUE,
    updated_at = NOW(),
    last_synced = NOW(),
    sync_status = 'synced'
  WHERE id = conversation_id;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 7. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Create indexes concurrently to avoid blocking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_leaderboard 
ON user_profiles (total_xp DESC, level DESC, daily_streak DESC) 
WHERE total_xp > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_leaderboard 
ON user_stats (total_goals_completed DESC, total_xp_earned DESC, highest_streak DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_user_completion 
ON goals (user_id, completed, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_active 
ON conversations (user_id, soft_deleted, updated_at DESC) 
WHERE soft_deleted = FALSE;

-- =====================================================
-- 8. ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view public profile data for leaderboard" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view all user stats for leaderboard" ON user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;

-- Create RLS policies
CREATE POLICY "Users can view public profile data for leaderboard" 
ON user_profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON user_profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all user stats for leaderboard" 
ON user_stats FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert their own stats" 
ON user_stats FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON user_stats FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_goal TO authenticated;
GRANT EXECUTE ON FUNCTION complete_goal_with_xp TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_goals TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_conversation TO authenticated;

-- =====================================================
-- 10. INITIALIZE USER STATS
-- =====================================================

-- Ensure all user_profiles have corresponding user_stats
INSERT INTO user_stats (user_id, total_goals_created, total_goals_completed, total_xp_earned, highest_streak, total_sessions)
SELECT 
  up.user_id,
  0,
  0,
  0,
  COALESCE(up.daily_streak, 0),
  0
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats us WHERE us.user_id = up.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Update user_stats with actual data
WITH goal_stats AS (
  SELECT 
    user_id,
    COUNT(*) as total_created,
    COUNT(*) FILTER (WHERE completed = TRUE) as total_completed,
    COALESCE(SUM(xp_value) FILTER (WHERE completed = TRUE), 0) as total_xp
  FROM goals
  GROUP BY user_id
),
conversation_stats AS (
  SELECT 
    user_id,
    COUNT(*) as total_sessions
  FROM conversations
  WHERE soft_deleted = FALSE
  GROUP BY user_id
)
UPDATE user_stats 
SET 
  total_goals_created = COALESCE(gs.total_created, 0),
  total_goals_completed = COALESCE(gs.total_completed, 0),
  total_xp_earned = COALESCE(gs.total_xp, 0),
  total_sessions = COALESCE(cs.total_sessions, 0),
  updated_at = NOW()
FROM goal_stats gs
FULL OUTER JOIN conversation_stats cs ON gs.user_id = cs.user_id
WHERE user_stats.user_id = COALESCE(gs.user_id, cs.user_id);

-- Update user_profiles with correct XP totals
UPDATE user_profiles 
SET 
  total_xp = COALESCE(us.total_xp_earned, 0),
  level = GREATEST(1, (COALESCE(us.total_xp_earned, 0) / 1000) + 1),
  updated_at = NOW()
FROM user_stats us
WHERE user_profiles.user_id = us.user_id;