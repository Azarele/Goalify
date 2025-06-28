/*
  # Create coaching sessions table

  1. New Tables
    - `coaching_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text, not null)
      - `messages` (jsonb, default empty array)
      - `completed` (boolean, default false)
      - `summary` (text, nullable)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `coaching_sessions` table
    - Add policies for authenticated users to manage their own sessions
*/

-- Create coaching_sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  completed boolean DEFAULT false,
  summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sessions"
  ON coaching_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON coaching_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON coaching_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON coaching_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_created_at ON coaching_sessions(created_at);