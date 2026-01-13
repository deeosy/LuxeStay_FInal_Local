ALTER TABLE affiliate_clicks 
ADD COLUMN IF NOT EXISTS offer_price numeric,
ADD COLUMN IF NOT EXISTS offer_provider text,
ADD COLUMN IF NOT EXISTS offer_commission numeric;
