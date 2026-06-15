/**
 * Создаёт демо-аккаунты в Supabase Auth + профили для презентации ВКР.
 *
 * Требует SUPABASE_SERVICE_ROLE_KEY в .env.local
 *
 * Запуск: npm run demo:users
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

const envLocal = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envLocal });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "❌ Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local",
  );
  console.error("   Запустите: npm run demo:setup (Supabase local) или укажите облачный Supabase.");
  process.exit(1);
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo2026!";

const DEMO_USERS = [
  {
    email: "owner@demo.local",
    password: DEMO_PASSWORD,
    displayName: "Андрей Владимиров",
    role: "OWNER" as const,
    branchId: null as string | null,
    employeeId: null as string | null,
  },
  {
    email: "senior.central@demo.local",
    password: DEMO_PASSWORD,
    displayName: "Светлана Петрова",
    role: "SENIOR_ADMIN" as const,
    branchId: "branch_central",
    employeeId: null,
  },
  {
    email: "admin.central@demo.local",
    password: DEMO_PASSWORD,
    displayName: "Алексей Морозов",
    role: "ADMIN" as const,
    branchId: "branch_central",
    employeeId: "emp_central_1",
  },
  {
    email: "senior.north@demo.local",
    password: DEMO_PASSWORD,
    displayName: "Виктор Кузнецов",
    role: "SENIOR_ADMIN" as const,
    branchId: "branch_north",
    employeeId: null,
  },
  {
    email: "admin.south@demo.local",
    password: DEMO_PASSWORD,
    displayName: "Никита Белов",
    role: "ADMIN" as const,
    branchId: "branch_south",
    employeeId: "emp_south_1",
  },
];

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string }> {
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password });
    return { id: existing.id, email: existing.email ?? email };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email.split("@")[0] },
  });

  if (error || !data.user) {
    throw new Error(`Не удалось создать ${email}: ${error?.message}`);
  }

  return { id: data.user.id, email: data.user.email ?? email };
}

async function main() {
  console.log("\n👤 Создание демо-пользователей...\n");

  for (const demo of DEMO_USERS) {
    const user = await ensureUser(demo.email, demo.password);

    const profile = {
      id: user.id,
      email: user.email,
      display_name: demo.displayName,
      role: demo.role,
      branch_id: demo.branchId,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(profile, { onConflict: "id" });

    if (profileError) {
      console.warn(`  ⚠️ Профиль ${demo.email}: ${profileError.message}`);
    }

    if (demo.employeeId) {
      const { error: empError } = await admin
        .from("employees")
        .update({ profile_id: user.id })
        .eq("id", demo.employeeId);

      if (empError) {
        console.warn(`  ⚠️ Привязка сотрудника ${demo.employeeId}: ${empError.message}`);
      }
    }

    console.log(`  ✅ ${demo.role.padEnd(12)} ${demo.email} / ${DEMO_PASSWORD}`);
  }

  console.log("\n📋 Учётные записи для демонстрации:");
  console.log("   Владелец:          owner@demo.local");
  console.log("   Старший (Центр):   senior.central@demo.local");
  console.log("   Админ (Центр):     admin.central@demo.local");
  console.log(`   Пароль для всех:   ${DEMO_PASSWORD}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});