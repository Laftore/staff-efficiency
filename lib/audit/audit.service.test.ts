import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAction, AuditAction } from './audit.service';
import type { SessionUser } from '@/types';

// Mocks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/feature-flags/feature-flags.service', () => ({
  isFeatureEnabled: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags.service';

const mockUser: SessionUser = {
  id: 'user-1',
  email: 'owner@test.com',
  role: 'OWNER',
  branchId: null,
  displayName: 'Owner',
};

describe('logAction — AUDIT_LOG_ENABLED feature flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes audit log when AUDIT_LOG_ENABLED=true (default behaviour)', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    await logAction({
      user: mockUser,
      action: AuditAction.SHIFT_CREATED,
      entityType: 'SHIFT',
      entityId: 'shift-123',
      branchId: 'branch-1',
      details: { foo: 'bar' },
    });

    expect(isFeatureEnabled).toHaveBeenCalledWith('AUDIT_LOG_ENABLED', 'branch-1');
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('silently skips write when AUDIT_LOG_ENABLED=false (kill-switch)', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    await logAction({
      user: mockUser,
      action: AuditAction.ROLE_CHANGED,
      entityType: 'PROFILE',
      entityId: 'profile-xyz',
    });

    expect(isFeatureEnabled).toHaveBeenCalledWith('AUDIT_LOG_ENABLED', null);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('respects per-branch override for the flag', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValueOnce(false);

    await logAction({
      user: { ...mockUser, branchId: 'branch-9' },
      action: AuditAction.INVENTORY_SAVED,
      entityType: 'SHIFT',
      entityId: 'shift-999',
      branchId: 'branch-9',
    });

    expect(isFeatureEnabled).toHaveBeenCalledWith('AUDIT_LOG_ENABLED', 'branch-9');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
