export interface SmartshellShift {
  id: string;
  openedAt: string;
  closedAt: string | null;
  revenueTariff: number;
  revenueGoods: number;
}

export interface SmartshellProduct {
  id: string;
  name: string;
  sku: string | null;
}
