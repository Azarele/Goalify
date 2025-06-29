/*
  # Enhanced Goals System with Statistics and Functions

  1. Goals Table Improvements
    - Make session_id nullable for standalone goals
    - Add performance indexes
    - Ensure proper constraints

  2. New Functions
    - get_user_goal_stats: Comprehensive goal statistics
    - complete_goal_with_xp: Goal completion with XP calculation
    - get_user_goals: Filtered goal retrieval
    - create_user_goal: Safe goal creation

  3. Security
    - Updated RLS policies
    - Proper foreign key constraints
    - Function security
*/

-- Ensure goals table has proper structure
DO $$
BEGIN
  -- Make session_id nullable since goals can exist without specific sessions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'goals' AND column_name = 'session_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE goals ALTER COLUMN session_id DROP NOT NULL;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_completed ON goals(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_goals_user_created_at ON goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_deadline_not_completed ON goals(deadline) WHERE completed = false;

-- Function to get comprehensive goal statistics for a user
CREATE OR REPLACE FUNCTION get_user_goal_stats(target_user_id uuid)
RETURNS TABLE (
  total_goals integer,
  completed_goals integer,
  pending_goals integer,
  overdue_goals integer,
  total_xp_earned integer,
  completion_rate numeric,
  goals_by_difficulty jsonb,
  completion_by_difficulty jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_goals,
    COUNT(*) FILTER (WHERE completed = true)::integer as completed_goals,
    COUNT(*) FILTER (WHERE completed = false)::integer as pending_goals,
    COUNT(*) FILTER (WHERE completed = false AND deadline < now())::integer as overdue_goals,
    COALESCE(SUM(xp_value) FILTER (WHERE completed = true), 0)::integer as total_xp_earned,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE completed = true)::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0
    END as completion_rate,
    jsonb_build_object(
      'easy', COUNT(*) FILTER (WHERE difficulty = 'easy'),
      'medium', COUNT(*) FILTER (WHERE difficulty = 'medium'),
      'hard', COUNT(*) FILTER (WHERE difficulty = 'hard')
    ) as goals_by_difficulty,
    jsonb_build_object(
      'easy', COUNT(*) FILTER (WHERE difficulty = 'easy' AND completed = true),
      'medium', COUNT(*) FILTER (WHERE difficulty = 'medium' AND completed = true),
      'hard', COUNT(*) FILTER (WHERE difficulty = 'hard' AND completed = true)
    ) as completion_by_difficulty
  FROM goals
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a goal with XP calculation and user profile update
CREATE OR REPLACE FUNCTION complete_goal_with_xp(
  goal_id uuid,
  completion_reasoning text,
  calculated_xp integer
)
RETURNS TABLE (
  success boolean,
  new_total_xp integer,
  new_level integer,
  message text
) AS $$
DECLARE
  goal_user_id uuid;
  current_xp integer;
  new_xp integer;
  new_level_calc integer;
BEGIN
  -- Get the goal and verify ownership
  SELECT user_id INTO goal_user_id
  FROM goals 
  WHERE id = goal_id AND user_id = auth.uid() AND completed = false;
  
  IF goal_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'Goal not found or already completed'::text;
    RETURN;
  END IF;
  
  -- Update the goal as completed
  UPDATE goals 
  SET 
    completed = true,
    completed_at = now(),
    completion_reasoning = complete_goal_with_xp.completion_reasoning,
    xp_value = calculated_xp,
    updated_at = now()
  WHERE id = goal_id;
  
  -- Get current user XP
  SELECT COALESCE(total_xp, 0) INTO current_xp
  FROM user_profiles 
  WHERE user_id = goal_user_id;
  
  -- Calculate new XP and level
  new_xp := current_xp + calculated_xp;
  new_level_calc := GREATEST(1, FLOOR(new_xp / 1000.0) + 1);
  
  -- Update user profile
  UPDATE user_profiles 
  SET 
    total_xp = new_xp,
    level = new_level_calc,
    updated_at = now()
  WHERE user_id = goal_user_id;
  
  RETURN QUERY SELECT true, new_xp, new_level_calc, 'Goal completed successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get goals for a user with filtering options
CREATE OR REPLACE FUNCTION get_user_goals(
  target_user_id uuid,
  include_completed boolean DEFAULT true,
  limit_count integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  description text,
  xp_value integer,
  difficulty text,
  motivation integer,
  completed boolean,
  completed_at timestamptz,
  completion_reasoning text,
  deadline timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  is_overdue boolean
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
    g.created_at,
    g.updated_at,
    (g.deadline IS NOT NULL AND g.deadline < now() AND g.completed = false) as is_overdue
  FROM goals g
  WHERE g.user_id = target_user_id
    AND (include_completed OR g.completed = false)
  ORDER BY g.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a goal
CREATE OR REPLACE FUNCTION create_user_goal(
  goal_description text,
  goal_xp_value integer DEFAULT 50,
  goal_difficulty text DEFAULT 'medium',
  goal_motivation integer DEFAULT 5,
  goal_deadline timestamptz DEFAULT NULL,
  session_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  success boolean,
  message text
) AS $$
DECLARE
  new_goal_id uuid;
  user_id uuid;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, 'User not authenticated'::text;
    RETURN;
  END IF;
  
  -- Validate inputs
  IF goal_description IS NULL OR LENGTH(TRIM(goal_description)) < 10 THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Goal description must be at least 10 characters'::text;
    RETURN;
  END IF;
  
  IF goal_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Invalid difficulty level'::text;
    RETURN;
  END IF;
  
  IF goal_motivation < 1 OR goal_motivation > 10 THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Motivation must be between 1 and 10'::text;
    RETURN;
  END IF;
  
  -- Create the goal
  INSERT INTO goals (
    user_id,
    session_id,
    description,
    xp_value,
    difficulty,
    motivation,
    deadline
  ) VALUES (
    user_id,
    session_id,
    TRIM(goal_description),
    goal_xp_value,
    goal_difficulty,
    goal_motivation,
    goal_deadline
  ) RETURNING goals.id INTO new_goal_id;
  
  RETURN QUERY SELECT new_goal_id, true, 'Goal created successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to ensure proper access control
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
CREATE POLICY "Users can view their own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
CREATE POLICY "Users can insert their own goals"
  ON goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
CREATE POLICY "Users can update their own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
CREATE POLICY "Users can delete their own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'goals_user_id_fkey' AND table_name = 'goals'
  ) THEN
    ALTER TABLE goals ADD CONSTRAINT goals_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_goal_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_goal_with_xp(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_goals(uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_goal(text, integer, text, integer, timestamptz, uuid) TO authenticated;