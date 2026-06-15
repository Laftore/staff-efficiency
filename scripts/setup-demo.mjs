#!/usr/bin/env node
/**
 * Однокомандная настройка демо-окружения для ВКР.
 *
 * Режимы:
 *   npm run demo:setup          — Supabase local (полный вход через /login)
 *   npm run demo:setup -- --mock — только PostgreSQL + mock-авторизация (быстрые скриншоты)
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const useMock = process.argv.includes("--mock");

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}

function tryRun(cmd) {
  try {
    execSync(cmd, { cwd: root, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function parseSupabaseStatus(output) {
  const map = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^\s*([A-Z_]+):\s+(.+)$/);
    if (match) map[match[1]] = match[2].trim();
  }
  return map;
}

function writeEnvLocal(vars) {
  const lines = [
    "# Автоматически сгенерировано scripts/setup-demo.mjs",
    "# Демо-окружение для ВКР / скриншотов",
    "",
    ...Object.entries(vars).map(([k, v]) => `${k}=${v}`),
    "",
  ];
  const target = resolve(root, ".env.local");
  writeFileSync(target, lines.join("\n"), "utf8");
  console.log(`\n✅ Записан ${target}`);
}

console.log("\n🚀 StaffEfficiency — настройка демо-окружения\n");

// 1. PostgreSQL (всегда нужен для Prisma)
run("docker compose -f docker-compose.demo.yml up -d");

const pgUrl =
  "postgresql://staff:staff_demo_2026@127.0.0.1:5433/staff_efficiency";

let envVars = {
  DATABASE_URL: pgUrl,
  DIRECT_URL: pgUrl,
};

if (useMock) {
  console.log("\n📸 Режим MOCK: вход без Supabase (cookie e2e-test-role)\n");
  envVars = {
    ...envVars,
    E2E_AUTH_MOCK: "1",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key-for-dev-only",
  };
} else {
  // 2. Supabase local
  if (!existsSync(resolve(root, "supabase", "config.toml"))) {
    console.log("Инициализация Supabase local...");
    run("npx supabase init");
  }

  // Копируем RLS-миграцию если ещё не в supabase/migrations
  const rlsSource = resolve(
    root,
    "supabase/migrations/20250521120100_rls_and_auth.sql",
  );
  const rlsTarget = resolve(
    root,
    "supabase/migrations/20250521120100_rls_and_auth.sql",
  );
  if (!existsSync(rlsTarget) && existsSync(rlsSource)) {
    // already in place
  }

  if (!tryRun("npx supabase status")) {
    run("npx supabase start");
  }

  const status = spawnSync("npx", ["supabase", "status", "-o", "env"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

  const statusText = status.stdout || "";
  const statusMap = parseSupabaseStatus(statusText);

  const apiUrl = statusMap.API_URL || "http://127.0.0.1:54321";
  const anonKey = statusMap.ANON_KEY || "";
  const serviceKey = statusMap.SERVICE_ROLE_KEY || "";
  const dbUrl =
    statusMap.DB_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  if (!anonKey || !serviceKey) {
    console.error(
      "\n❌ Не удалось получить ключи Supabase. Запустите: npx supabase start\n",
    );
    process.exit(1);
  }

  envVars = {
    DATABASE_URL: dbUrl,
    DIRECT_URL: dbUrl,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    DEMO_PASSWORD: "Demo2026!",
  };
}

writeEnvLocal(envVars);

// 3. Зависимости
if (!existsSync(resolve(root, "node_modules"))) {
  run("npm install");
}

// 4. Prisma
run("npx prisma generate");
if (useMock) {
  console.log("Mock-режим: prisma db push (без RLS-миграций Supabase)");
  run("npx prisma db push");
} else {
  run("npx prisma migrate deploy");
}

// 5. Seed
run("npm run db:seed");

// 6. Демо-пользователи (только с Supabase)
if (!useMock) {
  run("npm run demo:users");
}

console.log("\n" + "=".repeat(60));
console.log("🎉 Демо готово! Запуск: npm run dev");
console.log("   Откройте: http://localhost:3000");
if (useMock) {
  console.log("\n   Быстрый вход: http://localhost:3000/dev-login");
} else {
  console.log("\n   Логин: owner@demo.local / Demo2026!");
  console.log("   Также: senior.central@demo.local, admin.central@demo.local");
}
console.log("=".repeat(60) + "\n");