import { describe, expect, it } from "vitest";
import { buildInventoryPersistData } from "./persist";

describe("buildInventoryPersistData", () => {
  const catalog = {
    productName: "Coca-Cola 0.5",
    sku: "SS-DR-001",
    category: "Напитки",
    previousStock: 18,
    delivered: 24,
    displayed: 36,
  };

  it("calculates sold, revenue and warehouse on save", () => {
    const row = buildInventoryPersistData(catalog, 30);

    expect(row.sold).toBeGreaterThan(0);
    expect(row.revenueGoods).toBeGreaterThan(0);
    expect(row.warehouse).toBeGreaterThanOrEqual(0);
    expect(row.sku).toBe("SS-DR-001");
  });

  it("preserves unit price from existing sales data", () => {
    const row = buildInventoryPersistData(catalog, 28, {
      sold: 10,
      revenueGoods: 1500,
    });

    expect(row.revenueGoods / row.sold).toBeCloseTo(150, 5);
  });
});