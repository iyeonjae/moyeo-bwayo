/*
  # Yakssok (모여봐요) - Group Scheduling Service

  1. New Tables
    - `rooms` - Store scheduling rooms/groups
      - `id` (uuid, primary key)
      - `title` (text) - Room title (e.g., "MT 날짜 잡기")
      - `start_date` (date) - Start date for scheduling range
      - `end_date` (date) - End date for scheduling range
      - `share_code` (text, unique) - Shareable code for accessing room
      - `created_at` (timestamptz)
    
    - `responses` - Store user responses for each room
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key) - Reference to room
      - `user_name` (text) - Name of person responding
      - `created_at` (timestamptz)
    
    - `available_dates` - Store which dates each user can attend
      - `id` (uuid, primary key)
      - `response_id` (uuid, foreign key) - Reference to response
      - `available_date` (date) - Date user marked as available
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access to room data via share_code
    - Public write access for responses and available_dates
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  share_code text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS available_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  available_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms are readable by everyone"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert responses"
  ON responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Responses are readable by everyone"
  ON responses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert available dates"
  ON available_dates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Available dates are readable by everyone"
  ON available_dates FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_responses_room_id ON responses(room_id);
CREATE INDEX IF NOT EXISTS idx_available_dates_response_id ON available_dates(response_id);
