import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveInventoryFacts } from './inventory';
import type { SessionUser } from '@/types';

// Mock dependencies
vi.mock('@/lib/auth/session');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    shift: {
      findUnique: vi.fn(),
    },
    inventoryItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/lib/env', () => ({
  isDatabaseConfigured: vi.fn(() => true),
}));
vi.mock('@/lib/smartshell/service', () => ({
  fetchSmartshellProducts: vi.fn(() => Promise.resolve([])),
  normalizeSmartshellProduct: vi.fn((p: any) => p),
}));

import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

const adminOtherBranch: SessionUser = {
  id: 'admin-2',
  email: 'admin2@test.com',
  role: 'ADMIN',
  branchId: 'branch-2',
  displayName: 'Admin Other',
};

describe('saveInventoryFacts - Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validItems = [
    { productName: 'Coca-Cola 0.5', fact: 12 },
    { productName: "Lay's Classic", fact: 8 },
  ];

  it('should successfully save inventory facts for a valid shift', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser);

    // Мокаем доступ к смене
    vi.mocked(prisma.shift.findUnique).mockResolvedValue({
      id: 'shift-123',
      branchId: 'branch-1',
      employee: { profileId: 'admin-1' },
    } as any);

    // Мокаем $transaction
    const mockTx = {
      inventoryItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    const result = await saveInventoryFacts('shift-123', validItems);

    expect(result.success).toBe(true);
    expect(prisma.shift.findUnique).toHaveBeenCalledWith({
      where: { id: 'shift-123' },
      select: { branchId: true, employee: { select: { profileId: true } } },
    });
    expect(mockTx.inventoryItem.deleteMany).toHaveBeenCalledWith({
      where: { shiftId: 'shift-123' },
    });
    expect(mockTx.inventoryItem.createMany).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/inventory');
  });

  it('should allow OWNER to save inventory for any branch', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(ownerUser);

    vi.mocked(prisma.shift.findUnique).mockResolvedValue({
      id: 'shift-999',
      branchId: 'branch-2', // другой филиал
      employee: { profileId: 'some-admin' },
    } as any);

    const mockTx = {
      inventoryItem: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(mockTx));

    const result = await saveInventoryFacts('shift-999', validItems);

    expect(result.success).toBe(true);
  });

  it('should prevent ADMIN from saving inventory for a shift in another branch', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(adminOtherBranch);

    // Смена принадлежит branch-1, а пользователь из branch-2
    vi.mocked(prisma.shift.findUnique).mockResolvedValue({
      id: 'shift-123',
      branchId: 'branch-1',
      employee: { profileId: 'someone' },
    } as any);

    const result = await saveInventoryFacts('shift-123', validItems);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('Нет доступа к этому филиалу');
  });

  it('should prevent ADMIN from saving inventory for a shift of another employee (even in same branch)', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(adminUser); // admin-1

    // Смена принадлежит другому сотруднику
    vi.mocked(prisma.shift.findUnique).mockResolvedValue({
      id: 'shift-123',
      branchId: 'branch-1',
      employee: { profileId: 'other-admin' }, // не admin-1
    } as any);

    const result = await saveInventoryFacts('shift-123', validItems);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('Нет доступа к инвентаризации этой смены');
  });

  it('should return validation error for invalid data', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(adminUser);

    const invalidItems = [{ productName: '', fact: -5 }]; // неверные данные

    const result = await saveInventoryFacts('shift-123', invalidItems);

    expect(result.success).toBeUndefined();
    expect(result.error).toBeDefined();
    // Zod теперь возвращает конкретное сообщение
    expect(result.error).toMatch(/Too small|greater than or equal to 0/);
  });

  it('should return error when database is not configured', async () => {
    // Временно переопределяем мок
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      isDatabaseConfigured: vi.fn(() => false),
    }));

    // Переимпортируем функцию после мока
    const { saveInventoryFacts: freshSaveInventoryFacts } = await import('./inventory');

    const result = await freshSaveInventoryFacts('shift-123', validItems);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('База данных не настроена');
  });
});
