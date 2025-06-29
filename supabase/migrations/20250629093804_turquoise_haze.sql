/*
  # Add conversation labeling and deletion support

  1. Changes
    - Add ai_label column to conversations table for AI-generated labels
    - Add category column for conversation categorization
    - Add soft_deleted column for conversation deletion
    - Update RLS policies to handle soft deletion
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Add support for soft deletion in policies
*/

-- Add new columns to conversations table
DO $$
BEGIN
  -- Add ai_label column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'ai_label'
  ) THEN
    ALTER TABLE conversations ADD COLUMN ai_label text;
  END IF;

  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'category'
  ) THEN
    ALTER TABLE conversations ADD COLUMN category text DEFAULT 'general' 
    CHECK (category IN ('career', 'health', 'relationships', 'productivity', 'personal', 'goals', 'general'));
  END IF;

  -- Add soft_deleted column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'soft_deleted'
  ) THEN
    ALTER TABLE conversations ADD COLUMN soft_deleted boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category);
CREATE INDEX IF NOT EXISTS idx_conversations_soft_deleted ON conversations(soft_deleted);
CREATE INDEX IF NOT EXISTS idx_conversations_ai_label ON conversations(ai_label);

-- Update RLS policies to handle soft deletion
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND soft_deleted = false);

-- Allow users to see their soft-deleted conversations for recovery purposes
CREATE POLICY "Users can view their own soft-deleted conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND soft_deleted = true);

-- Update other policies to work with soft deletion
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
CREATE POLICY "Users can update their own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to soft delete a conversation
CREATE OR REPLACE FUNCTION soft_delete_conversation(conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE conversations 
  SET 
    soft_deleted = true,
    updated_at = now()
  WHERE id = conversation_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted conversation
CREATE OR REPLACE FUNCTION restore_conversation(conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE conversations 
  SET 
    soft_deleted = false,
    updated_at = now()
  WHERE id = conversation_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete old soft-deleted conversations (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_deleted_conversations()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete conversations that have been soft-deleted for more than 30 days
  DELETE FROM conversations 
  WHERE soft_deleted = true 
    AND updated_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;