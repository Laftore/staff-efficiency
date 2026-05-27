import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveInventoryFacts } from './inventory';
import type { SessionUser } from '@/types';

// Mocks
vi.mock('@/lib/auth/session');
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/lib/env', () => ({
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/inventory/inventory.service', () => ({
  saveInventoryFacts: vi.fn(),
}));

vi.mock('@/lib/feature-flags/feature-flags.service', () => ({
  isFeatureEnabled: vi.fn(() => Promise.resolve(true)),
}));

import { getSessionUser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { saveInventoryFacts as saveInventoryFactsService } from '@/lib/inventory/inventory.service';

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

describe('saveInventoryFacts - Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validItems = [
    { productName: 'Coca-Cola 0.5', fact: 12 },
    { productName: "Lay's Classic", fact: 8 },
  ];

  it('should call service and revalidate on success', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(seniorAdminUser);
    vi.mocked(saveInventoryFactsService).mockResolvedValue({ success: true });

    const result = await saveInventoryFacts('shift-123', validItems);

    expect(result.success).toBe(true);
    expect(saveInventoryFactsService).toHaveBeenCalledWith(seniorAdminUser, 'shift-123', validItems);
    expect(revalidatePath).toHaveBeenCalledWith('/inventory');
  });

  it('should return validation error without calling service', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(ownerUser);

    const result = await saveInventoryFacts('shift-123', []);

    expect(result.error).toBeDefined();
    expect(saveInventoryFactsService).not.toHaveBeenCalled();
  });

  it('should allow OWNER to save inventory for shifts in any branch', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(ownerUser);
    vi.mocked(saveInventoryFactsService).mockResolvedValue({ success: true });

    const result = await saveInventoryFacts('shift-999', validItems);

    expect(result.success).toBe(true);
  });

});