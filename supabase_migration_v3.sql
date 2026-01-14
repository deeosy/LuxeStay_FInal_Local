
-- Create indexing_queue table
CREATE TABLE IF NOT EXISTS indexing_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  priority INTEGER DEFAULT 1, -- 1=Normal, 2=High
  submitted BOOLEAN DEFAULT FALSE,
  last_submitted TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE indexing_queue ENABLE ROW LEVEL SECURITY;

-- Allow Service Role (Netlify functions) to do everything
CREATE POLICY "Service Role Full Access" ON indexing_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public (anon) to insert (for auto-submit on page load)
-- We might want to restrict this, but for now allow it as per "Whenever... Add to queue" from client
CREATE POLICY "Anon Insert" ON indexing_queue
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to read (optional, maybe not needed)
CREATE POLICY "Anon Read" ON indexing_queue
  FOR SELECT
  TO anon
  USING (true);
