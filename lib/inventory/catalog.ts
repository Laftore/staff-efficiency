/**
 * Placeholder-каталог товаров (структура как в Smartshell).
 * Доставлено / выставлено / остаток — из «импорта»; админ меняет только «факт».
 */
export interface InventoryCatalogItem {
  productName: string;
  sku: string;
  category: string;
  previousStock: number;
  delivered: number;
  displayed: number;
}

export const SMARTSHELL_PLACEHOLDER_CATALOG: InventoryCatalogItem[] = [
  {
    productName: "Coca-Cola 0.5",
    sku: "SS-DR-001",
    category: "Напитки",
    previousStock: 18,
    delivered: 24,
    displayed: 36,
  },
  {
    productName: "Sprite 0.5",
    sku: "SS-DR-002",
    category: "Напитки",
    previousStock: 12,
    delivered: 12,
    displayed: 24,
  },
  {
    productName: "Red Bull",
    sku: "SS-DR-003",
    category: "Напитки",
    previousStock: 20,
    delivered: 12,
    displayed: 28,
  },
  {
    productName: "Lay's Classic",
    sku: "SS-SN-010",
    category: "Снеки",
    previousStock: 8,
    delivered: 10,
    displayed: 16,
  },
  {
    productName: "Lay's Paprika",
    sku: "SS-SN-011",
    category: "Снеки",
    previousStock: 6,
    delivered: 8,
    displayed: 12,
  },
  {
    productName: "Snickers",
    sku: "SS-SN-020",
    category: "Снеки",
    previousStock: 15,
    delivered: 0,
    displayed: 15,
  },
  {
    productName: "Вода 0.5",
    sku: "SS-DR-010",
    category: "Напитки",
    previousStock: 30,
    delivered: 24,
    displayed: 48,
  },
  {
    productName: "Hot Dog",
    sku: "SS-FD-001",
    category: "Еда",
    previousStock: 0,
    delivered: 20,
    displayed: 18,
  },
  {
    productName: "Наггетсы",
    sku: "SS-FD-002",
    category: "Еда",
    previousStock: 4,
    delivered: 10,
    displayed: 12,
  },
  {
    productName: "Жвачка Orbit",
    sku: "SS-SN-030",
    category: "Снеки",
    previousStock: 22,
    delivered: 0,
    displayed: 20,
  },
  {
    productName: "Адреналин Rush",
    sku: "SS-DR-004",
    category: "Напитки",
    previousStock: 10,
    delivered: 6,
    displayed: 14,
  },
  {
    productName: "Чипсы Pringles",
    sku: "SS-SN-040",
    category: "Снеки",
    previousStock: 5,
    delivered: 4,
    displayed: 8,
  },
];
