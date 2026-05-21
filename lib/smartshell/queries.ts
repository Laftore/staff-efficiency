/** Fetch open/closed shifts and revenue data from Smartshell. */
export const SHIFTS_QUERY = /* GraphQL */ `
  query Shifts($branchId: ID!, $from: DateTime!, $to: DateTime!) {
    shifts(branchId: $branchId, from: $from, to: $to) {
      id
      openedAt
      closedAt
      revenueTariff
      revenueGoods
      type
      employee {
        id
        name
      }
      branch {
        id
        name
      }
    }
  }
`;

/** Product catalog and stock information from Smartshell. */
export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($branchId: ID!) {
    products(branchId: $branchId) {
      id
      name
      sku
      category
      previousStock
      delivered
      displayed
    }
  }
`;

export const WORK_SHIFT_ITEMS_QUERY = /* GraphQL */ `
  query WorkShiftItems($workShiftId: ID!) {
    workShiftItems(workShiftId: $workShiftId) {
      id
      name
      sku
      category
      sold
      revenueGoods
    }
  }
`;
