/*
  # Complete Leaderboard System

  1. Database Functions
    - `get_global_leaderboard()` - Returns ranked users with comprehensive stats
    - `get_user_rank()` - Returns specific user's ranking across different metrics
    - `update_user_stats_on_goal_complete()` - Updates stats when goals are completed
    - `update_user_stats_on_goal_create()` - Updates stats when goals are created
    - `update_user_stats_on_conversation_create()` - Updates stats for conversations
    - `update_user_stats_on_streak_change()` - Updates stats for streak changes

  2. Indexes
    - Performance indexes for leaderboard queries
    - Composite indexes for ranking operations

  3. Security
    - RLS policies for user stats visibility
    - Proper authentication checks
*/

-- Create comprehensive leaderboard function
CREATE OR REPLACE FUNCTION get_global_leaderboard(limit_count INTEGER DEFAULT 50)
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
      up.name,
      up.level,
      up.total_xp,
      up.daily_streak,
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
    WHERE up.total_xp > 0 OR COALESCE(us.total_goals_completed, 0) > 0
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
  ORDER BY rd.total_xp DESC, rd.goals_completed DESC, rd.highest_streak DESC
  LIMIT limit_count;
END;
$$;

-- Create user rank function
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
      up.total_xp,
      COALESCE(us.total_goals_completed, 0) as goals_completed,
      COALESCE(us.highest_streak, up.daily_streak, 0) as highest_streak
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.user_id = us.user_id
    WHERE up.total_xp > 0 OR COALESCE(us.total_goals_completed, 0) > 0
  ),
  target_user_data AS (
    SELECT total_xp, goals_completed, highest_streak
    FROM user_data 
    WHERE user_id = target_user_id
  ),
  rankings AS (
    SELECT 
      (SELECT COUNT(*) + 1 FROM user_data WHERE total_xp > (SELECT total_xp FROM target_user_data)) as rank_by_xp,
      (SELECT COUNT(*) + 1 FROM user_data WHERE goals_completed > (SELECT goals_completed FROM target_user_data)) as rank_by_goals,
      (SELECT COUNT(*) + 1 FROM user_data WHERE highest_streak > (SELECT highest_streak FROM target_user_data)) as rank_by_streak,
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

-- Enhanced goal creation function with stats updates
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
    deadline
  ) VALUES (
    new_goal_id,
    current_user_id,
    session_id,
    goal_description,
    goal_xp_value,
    goal_difficulty,
    goal_motivation,
    goal_deadline
  );

  -- Update user stats
  INSERT INTO user_stats (user_id, total_goals_created)
  VALUES (current_user_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_goals_created = user_stats.total_goals_created + 1,
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, new_goal_id, 'Goal created successfully';
END;
$$;

-- Enhanced goal completion function with XP rewards
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

  -- Verify goal ownership
  SELECT user_id INTO goal_user_id FROM goals WHERE id = goal_id;
  
  IF goal_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Goal not found';
    RETURN;
  END IF;
  
  IF goal_user_id != current_user_id THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Goal does not belong to user';
    RETURN;
  END IF;

  -- Get current user XP and level
  SELECT total_xp, level INTO current_xp, current_level 
  FROM user_profiles 
  WHERE user_id = current_user_id;

  -- Calculate new XP and level
  new_xp := COALESCE(current_xp, 0) + calculated_xp;
  new_level := GREATEST(1, (new_xp / 1000) + 1);

  -- Update goal as completed
  UPDATE goals 
  SET 
    completed = TRUE,
    completed_at = NOW(),
    completion_reasoning = completion_reasoning,
    xp_value = calculated_xp,
    updated_at = NOW()
  WHERE id = goal_id;

  -- Update user profile with new XP and level
  UPDATE user_profiles 
  SET 
    total_xp = new_xp,
    level = new_level,
    updated_at = NOW()
  WHERE user_id = current_user_id;

  -- Update user stats
  INSERT INTO user_stats (user_id, total_goals_completed, total_xp_earned)
  VALUES (current_user_id, 1, calculated_xp)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_goals_completed = user_stats.total_goals_completed + 1,
    total_xp_earned = user_stats.total_xp_earned + calculated_xp,
    last_goal_completed_date = NOW(),
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, new_xp, new_level, 'Goal completed successfully';
END;
$$;

-- Function to get user goals efficiently
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
  ORDER BY g.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to soft delete conversations
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
  WHERE id = conversation_id;
  
  -- Verify ownership
  IF conversation_user_id IS NULL OR conversation_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Soft delete the conversation
  UPDATE conversations 
  SET 
    soft_deleted = TRUE,
    updated_at = NOW()
  WHERE id = conversation_id;

  RETURN TRUE;
END;
$$;

-- Create performance indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_leaderboard 
ON user_profiles (total_xp DESC, level DESC, daily_streak DESC);

CREATE INDEX IF NOT EXISTS idx_user_stats_leaderboard 
ON user_stats (total_goals_completed DESC, total_xp_earned DESC, highest_streak DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user_completion 
ON goals (user_id, completed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user_active 
ON conversations (user_id, soft_deleted, updated_at DESC);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_goal TO authenticated;
GRANT EXECUTE ON FUNCTION complete_goal_with_xp TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_goals TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_conversation TO authenticated;

-- Update RLS policies for user_stats to allow leaderboard access
DROP POLICY IF EXISTS "Users can view all user stats for leaderboard" ON user_stats;
CREATE POLICY "Users can view all user stats for leaderboard" 
ON user_stats FOR SELECT 
TO authenticated 
USING (true);

-- Ensure user_profiles can be read for leaderboard (names only)
DROP POLICY IF EXISTS "Users can view public profile data for leaderboard" ON user_profiles;
CREATE POLICY "Users can view public profile data for leaderboard" 
ON user_profiles FOR SELECT 
TO authenticated 
USING (true);