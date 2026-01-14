
-- Create hotel_performance table if not exists
CREATE TABLE IF NOT EXISTS hotel_performance (
  hotel_id text PRIMARY KEY,
  city text,
  clicks integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  epc numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  is_hidden boolean DEFAULT false,
  epc_threshold numeric DEFAULT 0.5
);

-- Enable RLS
ALTER TABLE hotel_performance ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for frontend)
CREATE POLICY "Allow public read access" ON hotel_performance
  FOR SELECT USING (true);

-- Allow service role full access (for Netlify functions)
CREATE POLICY "Allow service role full access" ON hotel_performance
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to update (for Admin Dashboard)
-- In a real app, this should be restricted to admin users only.
CREATE POLICY "Allow authenticated update" ON hotel_performance
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Insert initial Global Settings if not exists
INSERT INTO hotel_performance (hotel_id, city, epc_threshold)
VALUES ('GLOBAL_SETTINGS', 'SETTINGS', 0.5)
ON CONFLICT (hotel_id) DO NOTHING;
