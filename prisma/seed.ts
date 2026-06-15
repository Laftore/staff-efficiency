import { PrismaClient, ShiftType } from "@prisma/client";
import { SMARTSHELL_PLACEHOLDER_CATALOG } from "../lib/inventory/catalog";
import { buildInventoryPersistData } from "../lib/inventory/persist";
import {
  calculateShiftBonus,
  getStoredBonusValue,
} from "../lib/kpi/bonus";

const prisma = new PrismaClient();

const BRANCHES = [
  { id: "branch_central", name: "Центральный", address: "ул. Центральная, 1" },
  { id: "branch_north", name: "Северный", address: "пр. Северный, 12" },
  { id: "branch_south", name: "Южный", address: "ул. Южная, 7" },
] as const;

const EMPLOYEES = [
  { id: "emp_central_1", name: "Алексей Морозов", branchId: "branch_central" },
  { id: "emp_central_2", name: "Дарья Козлова", branchId: "branch_central" },
  { id: "emp_central_3", name: "Игорь Волков", branchId: "branch_central" },
  { id: "emp_north_1", name: "Марина Соколова", branchId: "branch_north" },
  { id: "emp_north_2", name: "Павел Орлов", branchId: "branch_north" },
  { id: "emp_north_3", name: "Елена Романова", branchId: "branch_north" },
  { id: "emp_south_1", name: "Никита Белов", branchId: "branch_south" },
  { id: "emp_south_2", name: "Ольга Зайцева", branchId: "branch_south" },
  { id: "emp_south_3", name: "Кирилл Новиков", branchId: "branch_south" },
] as const;

/** Сценарии выручки для разнообразных графиков KPI */
const REVENUE_SCENARIOS: Array<{
  type: ShiftType;
  tariff: number;
  goods: number;
  adjustment?: number;
  manualReset?: boolean;
}> = [
  { type: "DAY", tariff: 12_400, goods: 3_200 },
  { type: "DAY", tariff: 14_800, goods: 2_100 },
  { type: "DAY", tariff: 16_200, goods: 4_500 },
  { type: "DAY", tariff: 18_500, goods: 3_800 },
  { type: "DAY", tariff: 11_200, goods: 1_900, adjustment: -200 },
  { type: "NIGHT", tariff: 3_800, goods: 1_400 },
  { type: "NIGHT", tariff: 5_200, goods: 900 },
  { type: "NIGHT", tariff: 4_600, goods: 1_100 },
  { type: "EXTRA", tariff: 2_900, goods: 600 },
  { type: "EXTRA", tariff: 5_800, goods: 1_200 },
  { type: "DAY", tariff: 9_500, goods: 1_200, adjustment: -350, manualReset: true },
  { type: "NIGHT", tariff: 2_100, goods: 400, adjustment: -150 },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function pickScenario(index: number) {
  return REVENUE_SCENARIOS[index % REVENUE_SCENARIOS.length];
}

function pickEmployee(branchId: string, dayIndex: number) {
  const branchEmployees = EMPLOYEES.filter((e) => e.branchId === branchId);
  return branchEmployees[dayIndex % branchEmployees.length];
}

async function seedBranches() {
  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      create: {
        ...branch,
        smartshellLastSyncAt: daysAgo(1),
      },
      update: {
        name: branch.name,
        address: branch.address,
        smartshellLastSyncAt: daysAgo(1),
      },
    });
  }
  console.log(`Seeded ${BRANCHES.length} branches.`);
}

async function seedFeatureFlags() {
  const flags = [
    {
      id: "flag-vk-notifications",
      key: "VK_NOTIFICATIONS_ENABLED",
      enabled: false,
      description: "Глобальное включение VK Bot уведомлений",
    },
    {
      id: "flag-bonus-confirmation",
      key: "BONUS_RESET_CONFIRMATION",
      enabled: false,
      description: "Требовать дополнительное подтверждение при сбросе бонуса",
    },
    {
      id: "flag-audit-log",
      key: "AUDIT_LOG_ENABLED",
      enabled: true,
      description: "Включение записи Audit Log",
    },
    {
      id: "flag-enhanced-inventory",
      key: "ENHANCED_INVENTORY_UI",
      enabled: false,
      description: "Улучшенный UI инвентаризации",
    },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { id: flag.id },
      create: { ...flag, branchId: null },
      update: { enabled: flag.enabled },
    });
  }
  console.log("Seeded default feature flags.");
}

async function seedEmployees() {
  for (const employee of EMPLOYEES) {
    await prisma.employee.upsert({
      where: { id: employee.id },
      create: employee,
      update: { name: employee.name, branchId: employee.branchId },
    });
  }
  console.log(`Seeded ${EMPLOYEES.length} employees.`);
}

async function seedShiftsAndInventory() {
  let shiftCount = 0;
  let inventoryCount = 0;

  for (let day = 29; day >= 0; day--) {
    for (const branch of BRANCHES) {
      const scenario = pickScenario(day + BRANCHES.indexOf(branch));
      const employee = pickEmployee(branch.id, day);
      const shiftId = `shift_${branch.id}_${day}`;

      const bonusResult = calculateShiftBonus({
        revenueTariff: scenario.tariff,
        revenueGoods: scenario.goods,
        shiftType: scenario.type,
        bonusAdjustment: scenario.adjustment ?? 0,
        bonusManualReset: scenario.manualReset ?? false,
      });

      await prisma.shift.upsert({
        where: { id: shiftId },
        create: {
          id: shiftId,
          branchId: branch.id,
          employeeId: employee.id,
          date: daysAgo(day),
          type: scenario.type,
          revenueTariff: scenario.tariff,
          revenueGoods: scenario.goods,
          bonusAdjustment: scenario.adjustment ?? 0,
          bonus: getStoredBonusValue(bonusResult),
          bonusManualReset: scenario.manualReset ?? false,
        },
        update: {
          revenueTariff: scenario.tariff,
          revenueGoods: scenario.goods,
          bonusAdjustment: scenario.adjustment ?? 0,
          bonus: getStoredBonusValue(bonusResult),
          bonusManualReset: scenario.manualReset ?? false,
        },
      });
      shiftCount++;

      if (day <= 14) {
        for (let p = 0; p < SMARTSHELL_PLACEHOLDER_CATALOG.length; p++) {
          const product = SMARTSHELL_PLACEHOLDER_CATALOG[p];
          const sold = 3 + ((day + p) % 9);
          const fact = Math.max(
            0,
            product.displayed - sold + (p % 2),
          );
          const row = buildInventoryPersistData(product, fact);

          await prisma.inventoryItem.upsert({
            where: { id: `inv_${shiftId}_${p}` },
            create: {
              id: `inv_${shiftId}_${p}`,
              shiftId,
              ...row,
            },
            update: row,
          });
          inventoryCount++;
        }
      }
    }
  }

  console.log(`Seeded ${shiftCount} shifts and ${inventoryCount} inventory items.`);
}

async function seedAuditLogs() {
  const logs = [
    {
      id: "audit_1",
      actorId: "demo-owner",
      actorRole: "OWNER" as const,
      actorName: "Андрей Владимиров",
      action: "SHIFT_CREATED",
      entityType: "SHIFT",
      entityId: "shift_branch_central_0",
      branchId: "branch_central",
      details: { revenue: 18500, bonus: 850 },
      createdAt: daysAgo(0),
    },
    {
      id: "audit_2",
      actorId: "demo-senior-central",
      actorRole: "SENIOR_ADMIN" as const,
      actorName: "Светлана Петрова",
      action: "SHIFT_BONUS_RESET",
      entityType: "SHIFT",
      entityId: "shift_branch_central_11",
      branchId: "branch_central",
      details: { previousBonus: -150, newBonus: 0, reason: "Штраф за опоздание" },
      createdAt: daysAgo(2),
    },
    {
      id: "audit_3",
      actorId: "demo-owner",
      actorRole: "OWNER" as const,
      actorName: "Андрей Владимиров",
      action: "EMPLOYEE_CREATED",
      entityType: "EMPLOYEE",
      entityId: "emp_south_3",
      branchId: "branch_south",
      details: { name: "Кирилл Новиков" },
      createdAt: daysAgo(5),
    },
    {
      id: "audit_4",
      actorId: "demo-senior-north",
      actorRole: "SENIOR_ADMIN" as const,
      actorName: "Виктор Кузнецов",
      action: "INVENTORY_SAVED",
      entityType: "SHIFT",
      entityId: "shift_branch_north_3",
      branchId: "branch_north",
      details: { itemsCount: 8, discrepancy: 2 },
      createdAt: daysAgo(3),
    },
    {
      id: "audit_5",
      actorId: "demo-owner",
      actorRole: "OWNER" as const,
      actorName: "Андрей Владимиров",
      action: "ROLE_CHANGED",
      entityType: "PROFILE",
      entityId: "demo-senior-central",
      branchId: "branch_central",
      details: { from: "ADMIN", to: "SENIOR_ADMIN" },
      createdAt: daysAgo(10),
    },
    {
      id: "audit_6",
      actorId: "demo-admin-south",
      actorRole: "ADMIN" as const,
      actorName: "Никита Белов",
      action: "SHIFT_UPDATED",
      entityType: "SHIFT",
      entityId: "shift_branch_south_1",
      branchId: "branch_south",
      details: { field: "revenueGoods", from: 900, to: 1200 },
      createdAt: daysAgo(1),
    },
  ];

  for (const log of logs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      create: log,
      update: log,
    });
  }
  console.log(`Seeded ${logs.length} audit log entries.`);
}

async function main() {
  const mode = process.env.SEED_MODE ?? "full";
  console.log(`\n🌱 StaffEfficiency seed (mode: ${mode})\n`);

  await seedBranches();
  await seedFeatureFlags();

  if (mode === "minimal") {
    console.log(
      "\nMinimal seed complete. Run with SEED_MODE=full for demo shifts/inventory.\n",
    );
    return;
  }

  await seedEmployees();
  await seedShiftsAndInventory();
  await seedAuditLogs();

  console.log("\n✅ Demo data ready for screenshots and thesis presentation.");
  console.log("   Run: npm run demo:users — to create demo login accounts.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());