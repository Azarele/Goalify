/*
  # Add leaderboard statistics and ensure data persistence

  1. New Tables
    - `user_stats` - Comprehensive user statistics for leaderboard
      - `user_id` (uuid, foreign key to auth.users)
      - `total_goals_created` (integer, default 0)
      - `total_goals_completed` (integer, default 0)
      - `total_xp_earned` (integer, default 0)
      - `highest_streak` (integer, default 0)
      - `total_sessions` (integer, default 0)
      - `first_goal_date` (timestamptz, nullable)
      - `last_goal_completed_date` (timestamptz, nullable)
      - `average_goal_completion_time` (interval, nullable)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Functions
    - Trigger functions to automatically update stats
    - Function to calculate leaderboard rankings

  3. Security
    - Enable RLS on user_stats table
    - Add policies for authenticated users
*/

-- Create user_stats table for comprehensive statistics
CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_goals_created integer DEFAULT 0,
  total_goals_completed integer DEFAULT 0,
  total_xp_earned integer DEFAULT 0,
  highest_streak integer DEFAULT 0,
  total_sessions integer DEFAULT 0,
  first_goal_date timestamptz,
  last_goal_completed_date timestamptz,
  average_goal_completion_time interval,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_stats
CREATE POLICY "Users can view all user stats for leaderboard"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (true); -- Allow reading all stats for leaderboard

CREATE POLICY "Users can insert their own stats"
  ON user_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON user_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_stats_total_xp ON user_stats(total_xp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_goals_completed ON user_stats(total_goals_completed DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_highest_streak ON user_stats(highest_streak DESC);

-- Function to update user stats when goals are created
CREATE OR REPLACE FUNCTION update_user_stats_on_goal_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user stats
  INSERT INTO user_stats (user_id, total_goals_created, first_goal_date, updated_at)
  VALUES (NEW.user_id, 1, NEW.created_at, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_goals_created = user_stats.total_goals_created + 1,
    first_goal_date = COALESCE(user_stats.first_goal_date, NEW.created_at),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when goals are completed
CREATE OR REPLACE FUNCTION update_user_stats_on_goal_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if goal was just completed
  IF OLD.completed = false AND NEW.completed = true THEN
    -- Update user stats
    INSERT INTO user_stats (user_id, total_goals_completed, total_xp_earned, last_goal_completed_date, updated_at)
    VALUES (NEW.user_id, 1, NEW.xp_value, NEW.completed_at, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_goals_completed = user_stats.total_goals_completed + 1,
      total_xp_earned = user_stats.total_xp_earned + NEW.xp_value,
      last_goal_completed_date = NEW.completed_at,
      updated_at = now();
    
    -- Update user profile XP and level
    UPDATE user_profiles 
    SET 
      total_xp = COALESCE(total_xp, 0) + NEW.xp_value,
      level = GREATEST(1, FLOOR((COALESCE(total_xp, 0) + NEW.xp_value) / 1000.0) + 1),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when conversations are created
CREATE OR REPLACE FUNCTION update_user_stats_on_conversation_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session count
  INSERT INTO user_stats (user_id, total_sessions, updated_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_sessions = user_stats.total_sessions + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak stats
CREATE OR REPLACE FUNCTION update_user_stats_on_streak_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update highest streak if current streak is higher
  IF NEW.daily_streak > COALESCE(OLD.daily_streak, 0) THEN
    INSERT INTO user_stats (user_id, highest_streak, updated_at)
    VALUES (NEW.user_id, NEW.daily_streak, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      highest_streak = GREATEST(user_stats.highest_streak, NEW.daily_streak),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_stats_on_goal_create ON goals;
CREATE TRIGGER trigger_update_stats_on_goal_create
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_goal_create();

DROP TRIGGER IF EXISTS trigger_update_stats_on_goal_complete ON goals;
CREATE TRIGGER trigger_update_stats_on_goal_complete
  AFTER UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_goal_complete();

DROP TRIGGER IF EXISTS trigger_update_stats_on_conversation_create ON conversations;
CREATE TRIGGER trigger_update_stats_on_conversation_create
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_conversation_create();

DROP TRIGGER IF EXISTS trigger_update_stats_on_streak_change ON user_profiles;
CREATE TRIGGER trigger_update_stats_on_streak_change
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_streak_change();

-- Function to get leaderboard data
CREATE OR REPLACE FUNCTION get_global_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  name text,
  level integer,
  total_xp integer,
  goals_completed integer,
  goals_created integer,
  daily_streak integer,
  highest_streak integer,
  total_sessions integer,
  completion_rate numeric,
  rank_by_xp bigint,
  rank_by_goals bigint,
  rank_by_streak bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.name,
    COALESCE(up.level, 1) as level,
    COALESCE(up.total_xp, 0) as total_xp,
    COALESCE(us.total_goals_completed, 0) as goals_completed,
    COALESCE(us.total_goals_created, 0) as goals_created,
    COALESCE(up.daily_streak, 0) as daily_streak,
    COALESCE(us.highest_streak, 0) as highest_streak,
    COALESCE(us.total_sessions, 0) as total_sessions,
    CASE 
      WHEN COALESCE(us.total_goals_created, 0) > 0 
      THEN ROUND((COALESCE(us.total_goals_completed, 0)::numeric / us.total_goals_created::numeric) * 100, 1)
      ELSE 0
    END as completion_rate,
    ROW_NUMBER() OVER (ORDER BY COALESCE(up.total_xp, 0) DESC, COALESCE(us.total_goals_completed, 0) DESC) as rank_by_xp,
    ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_goals_completed, 0) DESC, COALESCE(up.total_xp, 0) DESC) as rank_by_goals,
    ROW_NUMBER() OVER (ORDER BY COALESCE(us.highest_streak, 0) DESC, COALESCE(up.total_xp, 0) DESC) as rank_by_streak
  FROM user_profiles up
  LEFT JOIN user_stats us ON up.user_id = us.user_id
  WHERE up.total_xp > 0 OR us.total_goals_completed > 0 OR us.total_sessions > 0
  ORDER BY COALESCE(up.total_xp, 0) DESC, COALESCE(us.total_goals_completed, 0) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's rank
CREATE OR REPLACE FUNCTION get_user_rank(target_user_id uuid)
RETURNS TABLE (
  rank_by_xp bigint,
  rank_by_goals bigint,
  rank_by_streak bigint,
  total_users bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      up.user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(up.total_xp, 0) DESC, COALESCE(us.total_goals_completed, 0) DESC) as xp_rank,
      ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_goals_completed, 0) DESC, COALESCE(up.total_xp, 0) DESC) as goals_rank,
      ROW_NUMBER() OVER (ORDER BY COALESCE(us.highest_streak, 0) DESC, COALESCE(up.total_xp, 0) DESC) as streak_rank
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.user_id = us.user_id
    WHERE up.total_xp > 0 OR us.total_goals_completed > 0 OR us.total_sessions > 0
  ),
  user_counts AS (
    SELECT COUNT(*) as total_count
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.user_id = us.user_id
    WHERE up.total_xp > 0 OR us.total_goals_completed > 0 OR us.total_sessions > 0
  )
  SELECT 
    COALESCE(ru.xp_rank, uc.total_count + 1) as rank_by_xp,
    COALESCE(ru.goals_rank, uc.total_count + 1) as rank_by_goals,
    COALESCE(ru.streak_rank, uc.total_count + 1) as rank_by_streak,
    uc.total_count as total_users
  FROM user_counts uc
  LEFT JOIN ranked_users ru ON ru.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize stats for existing users
INSERT INTO user_stats (user_id, total_goals_created, total_goals_completed, total_xp_earned, total_sessions, updated_at)
SELECT 
  up.user_id,
  COALESCE(goal_counts.created_count, 0),
  COALESCE(goal_counts.completed_count, 0),
  COALESCE(up.total_xp, 0),
  COALESCE(session_counts.session_count, 0),
  now()
FROM user_profiles up
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as created_count,
    COUNT(*) FILTER (WHERE completed = true) as completed_count
  FROM goals
  GROUP BY user_id
) goal_counts ON up.user_id = goal_counts.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as session_count
  FROM conversations
  GROUP BY user_id
) session_counts ON up.user_id = session_counts.user_id
ON CONFLICT (user_id) DO NOTHING;