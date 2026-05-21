-- Add Smartshell last sync timestamp to Branch and new inventory metadata columns for Smartshell catalog sync.
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS smartshell_last_sync_at timestamptz;

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS sold integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_goods double precision NOT NULL DEFAULT 0;
