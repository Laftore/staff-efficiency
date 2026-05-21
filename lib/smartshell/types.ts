export interface SmartshellShift {
  id: string;
  openedAt: string;
  closedAt: string | null;
  revenueTariff: number;
  revenueGoods: number;
  type: "DAY" | "NIGHT" | "EXTRA";
  employee?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

export interface SmartshellProduct {
  id: string;
  name: string;
  sku: string | null;
  category?: string | null;
  previousStock?: number | null;
  delivered?: number | null;
  displayed?: number | null;
}

export interface SmartshellSalesItem {
  id: string;
  name: string;
  sku: string | null;
  category?: string | null;
  sold?: number | null;
  revenueGoods?: number | null;
}

export interface SmartshellSyncStatus {
  operation: "branchSync" | "inventorySync" | "salesSync";
  branchId?: string;
  shiftId?: string;
  success: boolean;
  count: number;
  salesCount?: number;
  errors: string[];
  lastSyncedAt?: Date;
}

export interface SmartshellSyncResult {
  count: number;
  salesCount?: number;
}
