import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRANCHES = [
  { id: "branch_central", name: "Центральный", address: "ул. Центральная, 1" },
  { id: "branch_north", name: "Северный", address: "пр. Северный, 12" },
  { id: "branch_south", name: "Южный", address: "ул. Южная, 7" },
] as const;

async function main() {
  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      create: branch,
      update: { name: branch.name, address: branch.address },
    });
  }

  console.log(`Seeded ${BRANCHES.length} branches.`);

  // Seed default Feature Flags (global)
  await prisma.featureFlag.upsert({
    where: { id: "flag-vk-notifications" },
    create: {
      id: "flag-vk-notifications",
      key: "VK_NOTIFICATIONS_ENABLED",
      enabled: true,
      description: "Глобальное включение VK Bot уведомлений",
      branchId: null,
    },
    update: { enabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { id: "flag-bonus-confirmation" },
    create: {
      id: "flag-bonus-confirmation",
      key: "BONUS_RESET_CONFIRMATION",
      enabled: false,
      description: "Требовать дополнительное подтверждение при сбросе бонуса",
      branchId: null,
    },
    update: { enabled: false },
  });

  await prisma.featureFlag.upsert({
    where: { id: "flag-audit-log" },
    create: {
      id: "flag-audit-log",
      key: "AUDIT_LOG_ENABLED",
      enabled: true,
      description: "Включение записи Audit Log (логирование действий пользователей). Отключение — kill-switch для производительности/приватности",
      branchId: null,
    },
    update: { enabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { id: "flag-enhanced-inventory" },
    create: {
      id: "flag-enhanced-inventory",
      key: "ENHANCED_INVENTORY_UI",
      enabled: false,
      description: "Прогрессивное включение улучшенного UI инвентаризации (таблицы, аналитика и т.д.)",
      branchId: null,
    },
    update: { enabled: false },
  });

  console.log("Seeded default feature flags.");
  console.log(
    "Create users in Supabase Auth, then set profiles.role / profiles.branch_id (OWNER → branch_id = null).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
