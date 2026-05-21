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
