import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createShift, updateShift, resetShiftBonus } from './shift.service';
import type { SessionUser } from '@/types';
import { AuthorizationError } from '@/lib/auth/authorization';

// Mocks
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

vi.mock('@/lib/kpi/bonus', () => ({
  calculateShiftBonus: vi.fn(() => ({
    needsReset: false,
  })),
  getStoredBonusValue: vi.fn(() => 100),
}));

vi.mock('@/lib/audit/audit.service', () => ({
  logAction: vi.fn(),
  AuditAction: {
    SHIFT_CREATED: 'SHIFT_CREATED',
    SHIFT_UPDATED: 'SHIFT_UPDATED',
    SHIFT_BONUS_RESET: 'SHIFT_BONUS_RESET',
  },
}));

vi.mock('@/lib/auth/authorization', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    requireUser: vi.fn(),
    assertBranchAccess: vi.fn((user: SessionUser, branchId: string) => {
      if (user.role !== 'OWNER' && user.branchId !== branchId) {
        throw new AuthorizationError('Нет доступа к этому филиалу');
      }
    }),
  };
});

vi.mock('@/lib/auth/roles', () => ({
  canResetBonus: vi.fn((role: string) => role === 'OWNER' || role === 'SENIOR_ADMIN'),
}));

vi.mock('@/lib/feature-flags/feature-flags.service', () => ({
  isFeatureEnabled: vi.fn(() => Promise.resolve(false)),
}));

import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit/audit.service';
import { requireUser, assertBranchAccess } from '@/lib/auth/authorization';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags.service';

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

describe('shift.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== createShift ====================
  describe('createShift', () => {
    const baseInput = {
      branchId: 'branch-1',
      employeeId: 'emp-1',
      date: new Date('2026-05-27'),
      type: 'DAY' as const,
      revenueTariff: 15000,
      revenueGoods: 3000,
      bonusAdjustment: 0,
    };

    it('should allow OWNER to create a shift in any branch', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1' } as any);
      vi.mocked(prisma.shift.create).mockResolvedValue({ id: 'shift-123' } as any);

      const result = await createShift(ownerUser, baseInput);

      expect(result.success).toBe(true);
      expect(result.shiftId).toBe('shift-123');
      expect(prisma.shift.create).toHaveBeenCalled();
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SHIFT_CREATED', entityId: 'shift-123' })
      );
    });

    it('should allow SENIOR_ADMIN to create shift in their own branch', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1' } as any);
      vi.mocked(prisma.shift.create).mockResolvedValue({ id: 'shift-456' } as any);

      const result = await createShift(seniorAdminUser, baseInput);

      expect(result.success).toBe(true);
    });

    it('should prevent SENIOR_ADMIN from creating shift in another branch', async () => {
      const inputOtherBranch = { ...baseInput, branchId: 'branch-2' };

      await expect(createShift(seniorAdminUser, inputOtherBranch)).rejects.toThrow(AuthorizationError);
    });

    it('should prevent ADMIN from creating shift in another branch', async () => {
      const inputOtherBranch = { ...baseInput, branchId: 'branch-2' };
      await expect(createShift(adminUser, inputOtherBranch)).rejects.toThrow();
    });

    it('should call logAction with correct details on successful creation', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1' } as any);
      vi.mocked(prisma.shift.create).mockResolvedValue({ id: 'shift-789' } as any);

      await createShift(ownerUser, baseInput);

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SHIFT_CREATED',
          entityType: 'SHIFT',
          details: expect.objectContaining({
            employeeId: 'emp-1',
            type: 'DAY',
          }),
        })
      );
    });
  });

  // ==================== updateShift ====================
  describe('updateShift', () => {
    const updateInput = {
      id: 'shift-123',
      branchId: 'branch-1',
      employeeId: 'emp-1',
      date: new Date('2026-05-28'),
      type: 'NIGHT' as const,
      revenueTariff: 4000,
      revenueGoods: 1000,
      bonusAdjustment: 50,
    };

    it('should allow OWNER to update any shift', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1' } as any);
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({ id: 'shift-123', branchId: 'branch-1', bonusManualReset: false } as any);
      vi.mocked(prisma.shift.update).mockResolvedValue({} as any);

      const result = await updateShift(ownerUser, updateInput);
      expect(result.success).toBe(true);
      expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'SHIFT_UPDATED' }));
    });

    it('should allow SENIOR_ADMIN to update shift in their branch', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1' } as any);
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({ id: 'shift-123', branchId: 'branch-1', bonusManualReset: false } as any);
      vi.mocked(prisma.shift.update).mockResolvedValue({} as any);

      const result = await updateShift(seniorAdminUser, updateInput);
      expect(result.success).toBe(true);
    });

    it('should prevent SENIOR_ADMIN from updating shift in another branch', async () => {
      const inputOther = { ...updateInput, branchId: 'branch-2' };
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({ id: 'shift-123', branchId: 'branch-2', bonusManualReset: false } as any);

      await expect(updateShift(seniorAdminUser, inputOther)).rejects.toThrow();
    });

    it('should allow ADMIN to update their own shift', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 'emp-1', branchId: 'branch-1', profileId: 'admin-1' } as any);
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({ id: 'shift-123', branchId: 'branch-1', bonusManualReset: false } as any);
      vi.mocked(prisma.shift.update).mockResolvedValue({} as any);

      const result = await updateShift(adminUser, updateInput);
      expect(result.success).toBe(true);
    });
  });

  // ==================== resetShiftBonus ====================
  describe('resetShiftBonus', () => {
    it('should allow OWNER to reset bonus in any branch', async () => {
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({
        id: 'shift-123',
        branchId: 'branch-2',
        bonus: 200,
      } as any);
      vi.mocked(prisma.shift.update).mockResolvedValue({} as any);

      const result = await resetShiftBonus(ownerUser, 'shift-123');

      expect(result.success).toBe(true);
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SHIFT_BONUS_RESET' })
      );
    });

    it('should allow SENIOR_ADMIN to reset bonus only in their branch', async () => {
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({
        id: 'shift-123',
        branchId: 'branch-1',
        bonus: 150,
      } as any);
      vi.mocked(prisma.shift.update).mockResolvedValue({} as any);

      const result = await resetShiftBonus(seniorAdminUser, 'shift-123');
      expect(result.success).toBe(true);
    });

    it('should prevent SENIOR_ADMIN from resetting bonus in another branch', async () => {
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({
        id: 'shift-123',
        branchId: 'branch-2',
        bonus: 150,
      } as any);

      await expect(resetShiftBonus(seniorAdminUser, 'shift-123')).rejects.toThrow();
    });

    it('should prevent ADMIN from resetting any bonus', async () => {
      await expect(resetShiftBonus(adminUser, 'shift-123')).rejects.toThrow();
    });

    it('should throw if shift does not exist', async () => {
      vi.mocked(prisma.shift.findUnique).mockResolvedValue(null);

      await expect(resetShiftBonus(ownerUser, 'non-existent')).rejects.toThrow(AuthorizationError);
    });

    it('should return { requiresConfirmation: true } and skip DB update + audit log when BONUS_RESET_CONFIRMATION flag is enabled', async () => {
      vi.mocked(isFeatureEnabled).mockResolvedValueOnce(true);
      vi.mocked(prisma.shift.findUnique).mockResolvedValue({
        id: 'shift-123',
        branchId: 'branch-1',
        bonus: 300,
      } as any);

      const result = await resetShiftBonus(ownerUser, 'shift-123');

      expect(result).toEqual({ requiresConfirmation: true });
      expect(prisma.shift.update).not.toHaveBeenCalled();
      expect(logAction).not.toHaveBeenCalled();
    });
  });
});
