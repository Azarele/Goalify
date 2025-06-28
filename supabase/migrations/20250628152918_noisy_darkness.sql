/*
  # Create achievements table

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text, not null)
      - `description` (text, not null)
      - `icon` (text, not null)
      - `xp_reward` (integer, default 0)
      - `unlocked_at` (timestamptz, default now)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `achievements` table
    - Add policies for authenticated users to view their own achievements
*/

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  xp_reward integer DEFAULT 0,
  unlocked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON achievements(unlocked_at);