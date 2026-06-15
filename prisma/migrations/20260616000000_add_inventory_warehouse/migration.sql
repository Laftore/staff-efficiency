-- Add warehouse column to inventory_items (остаток не на полке)
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "warehouse" INTEGER NOT NULL DEFAULT 0;