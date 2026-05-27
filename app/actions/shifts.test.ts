import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveShift, resetShiftBonus } from './shifts';
import type { SessionUser } from '@/types';

// Mock dependencies before imports
vi.mock('@/lib/auth/session');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    shift: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    employee: {
      findFirst: vi.fn(),
    },
  },
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/lib/vk/notifications', () => ({
  notifyNewShiftCreated: vi.fn(() => Promise.resolve()),
  notifyBonusNeedsReset: vi.fn(() => Promise.resolve()),
  notifyBonusWasReset: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/env', () => ({
  isDatabaseConfigured: vi.fn(() => true),
}));

import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  notifyNewShiftCreated,
  notifyBonusNeedsReset,
  notifyBonusWasReset,
} from '@/lib/vk/notifications';

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

describe('saveShift - Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow OWNER to create shift in any branch', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(ownerUser);
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1' } as any);
    vi.mocked(prisma.shift.create).mockResolvedValue({ id: 'shift-123' } as any);

    const formData = new FormData();
    formData.set('branchId', 'branch-1');
    formData.set('employeeId', 'emp-1');
    formData.set('date', '2026-05-27');
    formData.set('type', 'DAY');
    formData.set('revenueTariff', '15000');
    formData.set('revenueGoods', '3000');

    const result = await saveShift(null, formData);

    expect(result.success).toBe(true);
    expect(prisma.shift.create).toHaveBeenCalled();
    expect(notifyNewShiftCreated).toHaveBeenCalledWith('shift-123');
  });

  it('should prevent ADMIN from creating shift in another branch', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(adminOtherBranch);

    const formData = new FormData();
    formData.set('branchId', 'branch-1'); // Different from admin's branch
    formData.set('employeeId', 'emp-1');
    formData.set('date', '2026-05-27');
    formData.set('type', 'DAY');
    formData.set('revenueTariff', '15000');
    formData.set('revenueGoods', '0');

    const result = await saveShift(null, formData);

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('Нет доступа к этому филиалу');
    expect(prisma.shift.create).not.toHaveBeenCalled();
  });

  it('should calculate bonus and set needsReset flag correctly on creation', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser);
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1' } as any);
    vi.mocked(prisma.shift.create).mockResolvedValue({ id: 'shift-456' } as any);

    const formData = new FormData();
    formData.set('branchId', 'branch-1');
    formData.set('employeeId', 'emp-1');
    formData.set('date', '2026-05-27');
    formData.set('type', 'DAY');
    formData.set('revenueTariff', '5000'); // Much lower than 15000 plan
    formData.set('revenueGoods', '0');

    const result = await saveShift(null, formData);

    expect(result.success).toBe(true);
    // The action should have called notifyBonusNeedsReset because revenue is low
    expect(notifyBonusNeedsReset).toHaveBeenCalledWith('shift-456');
  });
});

describe('resetShiftBonus - Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow SENIOR_ADMIN to reset bonus only in their branch', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser);
    vi.mocked(prisma.shift.findUnique).mockResolvedValue({
      id: 'shift-1',
      branchId: 'branch-1',
    } as any);
    vi.mocked(prisma.shift.update).mockResolvedValue({} as any);

    const result = await resetShiftBonus('shift-1');

    expect(result.success).toBe(true);
    expect(notifyBonusWasReset).toHaveBeenCalledWith('shift-1');
  });

  it('should prevent ADMIN from resetting bonus', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(adminUser);

    const result = await resetShiftBonus('shift-1');

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('Недостаточно прав для обнуления бонуса');
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('should prevent user from resetting bonus in another branch', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser); // branch-1
    vi.mocked(prisma.shift.findUnique).mockResolvedValue({
      id: 'shift-99',
      branchId: 'branch-2', // different branch
    } as any);

    const result = await resetShiftBonus('shift-99');

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('Нет доступа к этому филиалу');
  });
});
