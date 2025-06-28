/*
  # Create goals table

  1. New Tables
    - `goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `session_id` (uuid, foreign key to coaching_sessions)
      - `description` (text, not null)
      - `xp_value` (integer, default 10)
      - `difficulty` (text, default 'medium')
      - `motivation` (integer, default 5)
      - `completed` (boolean, default false)
      - `completed_at` (timestamptz, nullable)
      - `completion_reasoning` (text, nullable)
      - `deadline` (timestamptz, nullable)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `goals` table
    - Add policies for authenticated users to manage their own goals
*/

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  description text NOT NULL,
  xp_value integer DEFAULT 10,
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  motivation integer DEFAULT 5 CHECK (motivation >= 1 AND motivation <= 10),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completion_reasoning text,
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_session_id ON goals(session_id);
CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(completed);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);