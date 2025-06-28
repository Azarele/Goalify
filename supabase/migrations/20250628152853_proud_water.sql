/*
  # Create user profiles table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, nullable)
      - `total_xp` (integer, default 0)
      - `level` (integer, default 1)
      - `daily_streak` (integer, default 0)
      - `last_activity` (timestamptz, nullable)
      - `voice_enabled` (boolean, default false)
      - `voice_id` (text, default voice ID)
      - `memory_enabled` (boolean, default true)
      - `tone` (text, default 'casual')
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policies for authenticated users to manage their own profiles
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  daily_streak integer DEFAULT 0,
  last_activity timestamptz,
  voice_enabled boolean DEFAULT false,
  voice_id text DEFAULT '21m00Tcm4TlvDq8ikWAM',
  memory_enabled boolean DEFAULT true,
  tone text DEFAULT 'casual' CHECK (tone IN ('formal', 'casual')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);