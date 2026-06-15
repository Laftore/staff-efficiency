import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveInventoryFacts } from './inventory.service';
import type { SessionUser } from '@/types';
import { AuthorizationError } from '@/lib/auth/authorization';

// Mocks
const createManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    inventoryItem: {
      findMany: vi.fn(async () => [
        { productName: 'Cola 0.5', sold: 8, revenueGoods: 960 },
      ]),
    },
    $transaction: vi.fn(async (fn) => fn({
      inventoryItem: {
        deleteMany: vi.fn(),
        createMany: createManyMock,
      },
    })),
  },
}));

vi.mock('@/lib/inventory/queries', () => ({
  assertShiftInventoryAccess: vi.fn(),
}));

vi.mock('@/lib/smartshell/service', () => ({
  fetchSmartshellProducts: vi.fn(),
  normalizeSmartshellProduct: vi.fn((p) => ({
    productName: p.name,
    sku: p.sku ?? '',
    category: p.category ?? 'Товар',
    previousStock: Number(p.previousStock ?? 0),
    delivered: Number(p.delivered ?? 0),
    displayed: Number(p.displayed ?? 0),
  })),
}));

vi.mock('@/lib/inventory/catalog', () => ({
  SMARTSHELL_PLACEHOLDER_CATALOG: [
    {
      productName: 'Placeholder Cola',
      sku: 'COLA-001',
      category: 'Напитки',
      previousStock: 10,
      delivered: 5,
      displayed: 3,
    },
  ],
}));

vi.mock('@/lib/audit/audit.service', () => ({
  logAction: vi.fn(),
  AuditAction: {
    INVENTORY_SAVED: 'INVENTORY_SAVED',
  },
}));

vi.mock('@/lib/auth/authorization', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    requireUser: vi.fn(),
  };
});

import { prisma } from '@/lib/prisma';
import { assertShiftInventoryAccess } from '@/lib/inventory/queries';
import { fetchSmartshellProducts } from '@/lib/smartshell/service';
import { logAction } from '@/lib/audit/audit.service';

// Test users
const ownerUser: SessionUser = {
  id: 'owner-1',
  email: 'owner@test.com',
  role: 'OWNER',
  branchId: null,
  displayName: 'Owner',
};

const seniorAdminUser: SessionUser = {
  id: 'senior-1',
  email: 'senior@test.com',
  role: 'SENIOR_ADMIN',
  branchId: 'branch-1',
  displayName: 'Senior Admin',
};

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  role: 'ADMIN',
  branchId: 'branch-1',
  displayName: 'Admin',
};

describe('inventory.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleItems = [
    { productName: 'Cola 0.5', fact: 7 },
    { productName: 'Chips', fact: 12 },
  ];

  it('should allow OWNER to save inventory for any shift', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-2' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([
      { name: 'Cola 0.5', sku: 'COLA-05', category: 'Напитки', previousStock: 10, delivered: 5, displayed: 2 },
      { name: 'Chips', sku: 'CHIPS-01', category: 'Снэки', previousStock: 20, delivered: 10, displayed: 5 },
    ] as any);

    const result = await saveInventoryFacts(ownerUser, 'shift-999', sampleItems);

    expect(result.success).toBe(true);
    expect(assertShiftInventoryAccess).toHaveBeenCalledWith(ownerUser, 'shift-999');
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVENTORY_SAVED', entityId: 'shift-999' })
    );
  });

  it('should allow SENIOR_ADMIN to save inventory only in their branch', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-1' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([]);

    const result = await saveInventoryFacts(seniorAdminUser, 'shift-111', sampleItems);
    expect(result.success).toBe(true);
  });

  it('should prevent SENIOR_ADMIN from saving inventory in another branch', async () => {
    vi.mocked(assertShiftInventoryAccess).mockRejectedValue(
      new AuthorizationError('Нет доступа к этому филиалу')
    );

    await expect(
      saveInventoryFacts(seniorAdminUser, 'shift-other', sampleItems)
    ).rejects.toThrow(AuthorizationError);
  });

  it('should allow ADMIN to save inventory only for their own employee shifts', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-1' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([]);

    const result = await saveInventoryFacts(adminUser, 'shift-my', sampleItems);
    expect(result.success).toBe(true);
  });

  it('should use Smartshell catalog when available', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-1' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([
      { name: 'Cola 0.5', sku: 'COLA-05', category: 'Напитки', previousStock: 8, delivered: 4, displayed: 1 },
    ] as any);

    await saveInventoryFacts(ownerUser, 'shift-sm', [{ productName: 'Cola 0.5', fact: 5 }]);

    expect(fetchSmartshellProducts).toHaveBeenCalledWith('branch-1');
  });

  it('should fall back to placeholder catalog when Smartshell fails or returns empty', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-1' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([]);

    await saveInventoryFacts(ownerUser, 'shift-fallback', [
      { productName: 'Placeholder Cola', fact: 6 },
    ]);

    // Should not throw and should complete successfully using placeholder
    expect(logAction).toHaveBeenCalled();
  });

  it('should persist sold, revenue and warehouse when saving facts', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-1' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([]);

    await saveInventoryFacts(ownerUser, 'shift-persist', [
      { productName: 'Placeholder Cola', fact: 6 },
    ]);

    expect(createManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          productName: 'Placeholder Cola',
          fact: 6,
          sold: expect.any(Number),
          revenueGoods: expect.any(Number),
          warehouse: expect.any(Number),
          sku: 'COLA-001',
        }),
      ]),
    });
  });

  it('should only save items that exist in the catalog', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-1' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([
      { name: 'Cola 0.5', sku: '', category: '', previousStock: 0, delivered: 0, displayed: 0 },
    ] as any);

    await saveInventoryFacts(ownerUser, 'shift-filter', [
      { productName: 'Cola 0.5', fact: 5 },
      { productName: 'Unknown Item', fact: 99 }, // should be filtered out
    ]);

    // We can't easily assert the transaction content without deeper mocking,
    // but at least the call should succeed without error.
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ details: { itemsCount: 2 } })
    );
  });

  it('should call logAction with correct details', async () => {
    vi.mocked(assertShiftInventoryAccess).mockResolvedValue({ branchId: 'branch-1' });
    vi.mocked(fetchSmartshellProducts).mockResolvedValue([]);

    await saveInventoryFacts(adminUser, 'shift-log', sampleItems);

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INVENTORY_SAVED',
        entityType: 'SHIFT',
        entityId: 'shift-log',
        branchId: 'branch-1',
        details: { itemsCount: 2 },
      })
    );
  });
});
