import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveShift, resetShiftBonus } from './shifts';
import type { SessionUser } from '@/types';

// Mock dependencies before imports
vi.mock('@/lib/auth/session');
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

// Mock the service layer (this is the key change after P1 service extraction)
vi.mock('@/lib/shifts/shift.service', () => ({
  createShift: vi.fn(),
  updateShift: vi.fn(),
  resetShiftBonus: vi.fn(),
}));

import { getSessionUser } from '@/lib/auth/session';
import {
  notifyNewShiftCreated,
  notifyBonusNeedsReset,
  notifyBonusWasReset,
} from '@/lib/vk/notifications';
import { createShift, updateShift, resetShiftBonus as resetBonusService } from '@/lib/shifts/shift.service';

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

  it('should allow OWNER to create shift and call service + notifications', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(ownerUser);
    vi.mocked(createShift).mockResolvedValue({
      success: true,
      shiftId: 'shift-123',
      needsReset: false,
    } as any);

    const formData = new FormData();
    formData.set('branchId', 'branch-1');
    formData.set('employeeId', 'emp-1');
    formData.set('date', '2026-05-27');
    formData.set('type', 'DAY');
    formData.set('revenueTariff', '15000');
    formData.set('revenueGoods', '3000');

    const result = await saveShift(null, formData);

    expect(result.success).toBe(true);
    expect(createShift).toHaveBeenCalledWith(
      ownerUser,
      expect.objectContaining({ branchId: 'branch-1' })
    );
    expect(notifyNewShiftCreated).toHaveBeenCalledWith('shift-123');
    expect(notifyBonusNeedsReset).not.toHaveBeenCalled();
  });

  it('should trigger notifyBonusNeedsReset when service returns needsReset=true', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser);
    vi.mocked(createShift).mockResolvedValue({
      success: true,
      shiftId: 'shift-456',
      needsReset: true,
    } as any);

    const formData = new FormData();
    formData.set('branchId', 'branch-1');
    formData.set('employeeId', 'emp-1');
    formData.set('date', '2026-05-27');
    formData.set('type', 'DAY');
    formData.set('revenueTariff', '5000');
    formData.set('revenueGoods', '0');

    const result = await saveShift(null, formData);

    expect(result.success).toBe(true);
    expect(notifyBonusNeedsReset).toHaveBeenCalledWith('shift-456');
  });

  it('should return validation error without calling service', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(ownerUser);

    const formData = new FormData(); // missing required fields
    formData.set('branchId', 'branch-1');

    const result = await saveShift(null, formData);

    expect(result.error).toBeDefined();
    expect(createShift).not.toHaveBeenCalled();
  });
});

describe('resetShiftBonus - Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call service and trigger notification on success', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser);
    vi.mocked(resetBonusService).mockResolvedValue({ success: true });

    const result = await resetShiftBonus('shift-1');

    expect(result.success).toBe(true);
    expect(resetBonusService).toHaveBeenCalledWith(seniorAdminUser, 'shift-1');
    expect(notifyBonusWasReset).toHaveBeenCalledWith('shift-1');
  });

  it('should return requiresConfirmation without notification or revalidate when service signals confirmation needed', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser);
    vi.mocked(resetBonusService).mockResolvedValue({ requiresConfirmation: true });

    const result = await resetShiftBonus('shift-1');

    expect(result.requiresConfirmation).toBe(true);
    expect(result.success).toBeUndefined();
    expect(notifyBonusWasReset).not.toHaveBeenCalled();
  });

  it('should return error from service without calling notification', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(adminUser);
    vi.mocked(resetBonusService).mockRejectedValue(new Error('Недостаточно прав для обнуления бонуса'));

    const result = await resetShiftBonus('shift-1');

    expect(result.error).toBeDefined();
    expect(notifyBonusWasReset).not.toHaveBeenCalled();
  });
});
