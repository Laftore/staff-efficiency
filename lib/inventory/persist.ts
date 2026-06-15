import { calculateInventoryLine } from "@/lib/inventory/calculate";
import { getProductUnitPrice } from "@/lib/inventory/prices";

export interface InventoryCatalogRow {
  productName: string;
  sku: string;
  category: string;
  previousStock: number;
  delivered: number;
  displayed: number;
}

export interface ExistingInventorySales {
  sold: number;
  revenueGoods: number;
}

export function buildInventoryPersistData(
  catalog: InventoryCatalogRow,
  fact: number,
  existing?: ExistingInventorySales | null,
) {
  const calc = calculateInventoryLine({
    productName: catalog.productName,
    previousStock: catalog.previousStock,
    delivered: catalog.delivered,
    displayed: catalog.displayed,
    fact,
  });

  const unitPrice =
    existing && existing.sold > 0 && existing.revenueGoods > 0
      ? existing.revenueGoods / existing.sold
      : getProductUnitPrice(catalog.sku);

  return {
    productName: catalog.productName,
    sku: catalog.sku,
    category: catalog.category,
    previousStock: catalog.previousStock,
    delivered: catalog.delivered,
    displayed: catalog.displayed,
    fact,
    sold: calc.sold,
    warehouse: calc.warehouse,
    revenueGoods: calc.sold * unitPrice,
  };
}