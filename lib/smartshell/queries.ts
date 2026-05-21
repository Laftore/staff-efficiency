/** Placeholder: fetch open/closed shifts and revenue from Smartshell. */
export const SHIFTS_QUERY = /* GraphQL */ `
  query Shifts($branchId: ID!, $from: DateTime!, $to: DateTime!) {
    shifts(branchId: $branchId, from: $from, to: $to) {
      id
      openedAt
      closedAt
      revenueTariff
      revenueGoods
    }
  }
`;

/** Placeholder: product catalog for inventory. */
export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($branchId: ID!) {
    products(branchId: $branchId) {
      id
      name
      sku
    }
  }
`;
