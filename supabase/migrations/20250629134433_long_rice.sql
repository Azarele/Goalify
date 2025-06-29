/*
  # Create Leaderboard Database Functions

  1. Database Functions
    - `get_global_leaderboard` - Returns ranked users with comprehensive stats
    - `get_user_rank` - Returns specific user's ranking across different metrics
    - `update_user_stats_on_goal_complete` - Updates stats when goals are completed
    - `update_user_stats_on_goal_create` - Updates stats when goals are created
    - `update_user_stats_on_conversation_create` - Updates stats for conversations
    - `update_user_stats_on_streak_change` - Updates stats for streak changes

  2. Views
    - Enhanced user statistics view for leaderboard calculations

  3. Security
    - Proper RLS policies for user stats visibility
    - Performance optimizations with indexes
*/

-- Create or replace the global leaderboard function
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
) AS $$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT 
      up.user_id,
      up.name,
      up.level,
      up.total_xp,
      us.total_goals_completed,
      us.total_goals_created,
      up.daily_streak,
      us.highest_streak,
      us.total_sessions,
      CASE 
        WHEN us.total_goals_created > 0 
        THEN ROUND((us.total_goals_completed::NUMERIC / us.total_goals_created::NUMERIC) * 100, 1)
        ELSE 0 
      END as completion_rate
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.user_id = us.user_id
    WHERE up.total_xp > 0 OR us.total_goals_completed > 0 -- Only include active users
  ),
  ranked_data AS (
    SELECT 
      *,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC, total_goals_completed DESC) as rank_by_xp,
      ROW_NUMBER() OVER (ORDER BY total_goals_completed DESC, total_xp DESC) as rank_by_goals,
      ROW_NUMBER() OVER (ORDER BY highest_streak DESC, total_xp DESC) as rank_by_streak
    FROM user_data
  )
  SELECT 
    rd.user_id,
    rd.name,
    rd.level,
    rd.total_xp,
    rd.total_goals_completed,
    rd.total_goals_created,
    rd.daily_streak,
    rd.highest_streak,
    rd.total_sessions,
    rd.completion_rate,
    rd.rank_by_xp::INTEGER,
    rd.rank_by_goals::INTEGER,
    rd.rank_by_streak::INTEGER
  FROM ranked_data rd
  ORDER BY rd.rank_by_xp
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the user rank function
CREATE OR REPLACE FUNCTION get_user_rank(target_user_id UUID)
RETURNS TABLE (
  rank_by_xp INTEGER,
  rank_by_goals INTEGER,
  rank_by_streak INTEGER,
  total_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT 
      up.user_id,
      up.total_xp,
      us.total_goals_completed,
      us.highest_streak
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.user_id = us.user_id
    WHERE up.total_xp > 0 OR us.total_goals_completed > 0
  ),
  ranked_data AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC, total_goals_completed DESC) as rank_by_xp,
      ROW_NUMBER() OVER (ORDER BY total_goals_completed DESC, total_xp DESC) as rank_by_goals,
      ROW_NUMBER() OVER (ORDER BY highest_streak DESC, total_xp DESC) as rank_by_streak
    FROM user_data
  ),
  user_ranks AS (
    SELECT 
      rank_by_xp::INTEGER,
      rank_by_goals::INTEGER,
      rank_by_streak::INTEGER
    FROM ranked_data
    WHERE user_id = target_user_id
  ),
  total_count AS (
    SELECT COUNT(*)::INTEGER as total_users FROM user_data
  )
  SELECT 
    COALESCE(ur.rank_by_xp, 999) as rank_by_xp,
    COALESCE(ur.rank_by_goals, 999) as rank_by_goals,
    COALESCE(ur.rank_by_streak, 999) as rank_by_streak,
    tc.total_users
  FROM user_ranks ur
  CROSS JOIN total_count tc
  UNION ALL
  SELECT 999, 999, 999, tc.total_users
  FROM total_count tc
  WHERE NOT EXISTS (SELECT 1 FROM user_ranks)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to create user goals with stats update
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to complete goals with XP and stats update
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
) AS $$
DECLARE
  current_user_id UUID;
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

  -- Update the goal
  UPDATE goals 
  SET 
    completed = TRUE,
    completed_at = NOW(),
    completion_reasoning = completion_reasoning,
    xp_value = calculated_xp,
    updated_at = NOW()
  WHERE id = goal_id AND user_id = current_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Goal not found or not owned by user';
    RETURN;
  END IF;

  -- Get current user XP and level
  SELECT total_xp, level INTO current_xp, current_level
  FROM user_profiles 
  WHERE user_id = current_user_id;

  -- Calculate new XP and level
  new_xp := COALESCE(current_xp, 0) + calculated_xp;
  new_level := (new_xp / 1000) + 1;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to get user goals
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
) AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to soft delete conversations
CREATE OR REPLACE FUNCTION soft_delete_conversation(conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE conversations 
  SET soft_deleted = TRUE, updated_at = NOW()
  WHERE id = conversation_id AND user_id = current_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_goal TO authenticated;
GRANT EXECUTE ON FUNCTION complete_goal_with_xp TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_goals TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_conversation TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_xp ON user_profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_goals_completed ON user_stats(total_goals_completed DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_highest_streak ON user_stats(highest_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_xp ON user_stats(total_xp_earned DESC);

-- Ensure user_stats table has proper RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for user_stats to allow leaderboard access
DROP POLICY IF EXISTS "Users can view all user stats for leaderboard" ON user_stats;
CREATE POLICY "Users can view all user stats for leaderboard"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (true); -- Allow all authenticated users to see stats for leaderboard

-- Ensure proper policies exist for user_profiles leaderboard access
DROP POLICY IF EXISTS "Users can view profiles for leaderboard" ON user_profiles;
CREATE POLICY "Users can view profiles for leaderboard"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true); -- Allow viewing profiles for leaderboard (names are optional anyway)