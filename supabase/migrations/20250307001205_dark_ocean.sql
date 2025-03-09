/*
  # Create project comments table

  1. New Tables
    - `project_comments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `project_comments` table
    - Add policies for authenticated users to manage comments
*/

CREATE TABLE IF NOT EXISTS project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their projects"
  ON project_comments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_id
      UNION
      SELECT user_id FROM project_members WHERE project_id = project_comments.project_id
    )
  );

CREATE POLICY "Users can create comments on their projects"
  ON project_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_id
      UNION
      SELECT user_id FROM project_members WHERE project_id = project_comments.project_id
    )
  );