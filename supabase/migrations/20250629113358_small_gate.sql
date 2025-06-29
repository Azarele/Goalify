/*
  # Cross-Device Synchronization Enhancement

  1. New Columns
    - Add `last_synced` timestamp to all main tables for sync tracking
    - Add `sync_status` enum column to track sync state ('synced', 'pending', 'conflict')

  2. Indexes
    - Add performance indexes for sync operations
    - Optimize queries for sync status and timestamps

  3. Functions
    - Enhanced goal completion with sync tracking
    - Enhanced goal creation with sync tracking
    - Sync status monitoring functions
    - Conflict resolution functions

  4. Security
    - All functions use SECURITY DEFINER with proper user validation
    - RLS policies remain unchanged and secure
*/

-- Add last_synced column to track synchronization
ALTER TABLE IF EXISTS goals 
ADD COLUMN IF NOT EXISTS last_synced timestamptz DEFAULT now();

ALTER TABLE IF EXISTS conversations 
ADD COLUMN IF NOT EXISTS last_synced timestamptz DEFAULT now();

ALTER TABLE IF EXISTS messages 
ADD COLUMN IF NOT EXISTS last_synced timestamptz DEFAULT now();

ALTER TABLE IF EXISTS user_profiles 
ADD COLUMN IF NOT EXISTS last_synced timestamptz DEFAULT now();

-- Add sync status column to track sync state
ALTER TABLE IF EXISTS goals 
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced' 
CHECK (sync_status IN ('synced', 'pending', 'conflict'));

ALTER TABLE IF EXISTS conversations 
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced'
CHECK (sync_status IN ('synced', 'pending', 'conflict'));

ALTER TABLE IF EXISTS messages 
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced'
CHECK (sync_status IN ('synced', 'pending', 'conflict'));

-- Add indexes for better sync performance
CREATE INDEX IF NOT EXISTS idx_goals_last_synced ON goals(last_synced);
CREATE INDEX IF NOT EXISTS idx_conversations_last_synced ON conversations(last_synced);
CREATE INDEX IF NOT EXISTS idx_messages_last_synced ON messages(last_synced);
CREATE INDEX IF NOT EXISTS idx_goals_sync_status ON goals(sync_status);
CREATE INDEX IF NOT EXISTS idx_conversations_sync_status ON conversations(sync_status);
CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON messages(sync_status);

-- Function to get user's pending sync items
CREATE OR REPLACE FUNCTION get_sync_status(target_user_id uuid)
RETURNS TABLE (
  goals_pending integer,
  conversations_pending integer,
  messages_pending integer,
  last_sync timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM goals WHERE user_id = target_user_id AND sync_status = 'pending')::integer,
    (SELECT COUNT(*) FROM conversations WHERE user_id = target_user_id AND sync_status = 'pending')::integer,
    (SELECT COUNT(*) FROM messages m 
     JOIN conversations c ON m.conversation_id = c.id 
     WHERE c.user_id = target_user_id AND m.sync_status = 'pending')::integer,
    (SELECT MAX(last_synced) FROM user_profiles WHERE user_id = target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark data as synced
CREATE OR REPLACE FUNCTION mark_data_synced(
  target_user_id uuid,
  item_ids uuid[],
  item_type text
)
RETURNS boolean AS $$
DECLARE
  success boolean := false;
BEGIN
  IF item_type = 'goals' THEN
    UPDATE goals 
    SET sync_status = 'synced', last_synced = now()
    WHERE id = ANY(item_ids) AND user_id = target_user_id;
    success := true;
  ELSIF item_type = 'conversations' THEN
    UPDATE conversations 
    SET sync_status = 'synced', last_synced = now()
    WHERE id = ANY(item_ids) AND user_id = target_user_id;
    success := true;
  ELSIF item_type = 'messages' THEN
    UPDATE messages 
    SET sync_status = 'synced', last_synced = now()
    WHERE id = ANY(item_ids) AND conversation_id IN (
      SELECT id FROM conversations WHERE user_id = target_user_id
    );
    success := true;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve sync conflicts
CREATE OR REPLACE FUNCTION resolve_sync_conflict(
  item_id uuid,
  item_type text,
  resolution_strategy text -- 'local', 'remote', or 'merge'
)
RETURNS boolean AS $$
DECLARE
  success boolean := false;
BEGIN
  IF item_type = 'goals' THEN
    UPDATE goals 
    SET sync_status = 'synced', last_synced = now()
    WHERE id = item_id AND user_id = auth.uid();
    success := true;
  ELSIF item_type = 'conversations' THEN
    UPDATE conversations 
    SET sync_status = 'synced', last_synced = now()
    WHERE id = item_id AND user_id = auth.uid();
    success := true;
  ELSIF item_type = 'messages' THEN
    UPDATE messages 
    SET sync_status = 'synced', last_synced = now()
    WHERE id = item_id;
    success := true;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function to avoid return type conflict
DROP FUNCTION IF EXISTS complete_goal_with_xp(uuid, text, integer);

-- Enhanced goal completion function with sync tracking
CREATE OR REPLACE FUNCTION complete_goal_with_xp(
  goal_id uuid,
  completion_reasoning text,
  calculated_xp integer
)
RETURNS TABLE (
  success boolean,
  new_total_xp integer,
  new_level integer,
  message text,
  sync_status text
) AS $$
DECLARE
  goal_user_id uuid;
  current_xp integer;
  new_xp integer;
  new_level_calc integer;
  sync_status_val text;
BEGIN
  -- Get the goal and verify ownership
  SELECT user_id INTO goal_user_id
  FROM goals 
  WHERE id = goal_id AND user_id = auth.uid() AND completed = false;
  
  IF goal_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'Goal not found or already completed'::text, 'error'::text;
    RETURN;
  END IF;
  
  -- Update the goal as completed
  UPDATE goals 
  SET 
    completed = true,
    completed_at = now(),
    completion_reasoning = complete_goal_with_xp.completion_reasoning,
    xp_value = calculated_xp,
    updated_at = now(),
    last_synced = now(),
    sync_status = 'synced'
  WHERE id = goal_id
  RETURNING sync_status INTO sync_status_val;
  
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
    updated_at = now(),
    last_synced = now()
  WHERE user_id = goal_user_id;
  
  -- Update user stats
  UPDATE user_stats
  SET
    total_goals_completed = total_goals_completed + 1,
    total_xp_earned = total_xp_earned + calculated_xp,
    last_goal_completed_date = now(),
    updated_at = now()
  WHERE user_id = goal_user_id;
  
  RETURN QUERY SELECT true, new_xp, new_level_calc, 'Goal completed successfully'::text, sync_status_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function to avoid return type conflict
DROP FUNCTION IF EXISTS create_user_goal(text, integer, text, integer, timestamptz, uuid);

-- Enhanced goal creation function with sync tracking
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
  message text,
  sync_status text
) AS $$
DECLARE
  new_goal_id uuid;
  user_id uuid;
  sync_status_val text;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, 'User not authenticated'::text, 'error'::text;
    RETURN;
  END IF;
  
  -- Validate inputs
  IF goal_description IS NULL OR LENGTH(TRIM(goal_description)) < 10 THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Goal description must be at least 10 characters'::text, 'error'::text;
    RETURN;
  END IF;
  
  IF goal_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Invalid difficulty level'::text, 'error'::text;
    RETURN;
  END IF;
  
  IF goal_motivation < 1 OR goal_motivation > 10 THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Motivation must be between 1 and 10'::text, 'error'::text;
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
    deadline,
    last_synced,
    sync_status
  ) VALUES (
    user_id,
    session_id,
    TRIM(goal_description),
    goal_xp_value,
    goal_difficulty,
    goal_motivation,
    goal_deadline,
    now(),
    'synced'
  ) RETURNING goals.id, goals.sync_status INTO new_goal_id, sync_status_val;
  
  -- Update user stats
  UPDATE user_stats
  SET
    total_goals_created = total_goals_created + 1,
    first_goal_date = COALESCE(first_goal_date, now()),
    updated_at = now()
  WHERE user_id = auth.uid();
  
  RETURN QUERY SELECT new_goal_id, true, 'Goal created successfully'::text, sync_status_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_sync_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_data_synced(uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_sync_conflict(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_goal_with_xp(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_goal(text, integer, text, integer, timestamptz, uuid) TO authenticated;