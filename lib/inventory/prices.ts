/** Справочник цен для демо-каталога (руб. за единицу). */
export const PRODUCT_UNIT_PRICES: Record<string, number> = {
  "SS-DR-001": 120,
  "SS-DR-002": 120,
  "SS-DR-003": 180,
  "SS-SN-010": 95,
  "SS-SN-011": 95,
  "SS-SN-020": 85,
  "SS-DR-010": 60,
  "SS-FD-001": 150,
  "SS-FD-002": 180,
  "SS-SN-030": 55,
  "SS-DR-004": 160,
  "SS-SN-040": 130,
};

const DEFAULT_UNIT_PRICE = 95;

export function getProductUnitPrice(sku?: string | null): number {
  if (!sku) return DEFAULT_UNIT_PRICE;
  return PRODUCT_UNIT_PRICES[sku] ?? DEFAULT_UNIT_PRICE;
}