#!/usr/bin/env node
/**
 * Настройка Supabase Cloud для деплоя на Vercel.
 *
 * Перед запуском создайте проект на https://supabase.com и скопируйте ключи
 * в .env.production.local (см. .env.production.example).
 *
 * Запуск: node scripts/setup-vercel-supabase.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const root = resolve(import.meta.dirname, "..");
const envFile = resolve(root, ".env.production.local");

if (!existsSync(envFile)) {
  console.error(`
❌ Файл .env.production.local не найден.

Создайте его из шаблона:
  copy .env.production.example .env.production.local

Заполните значения из Supabase Dashboard → Project Settings → API / Database.
`);
  process.exit(1);
}

dotenv.config({ path: envFile });

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Не заполнены переменные: ${missing.join(", ")}`);
  process.exit(1);
}

function run(cmd) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env } });
}

console.log("\n🚀 Настройка Supabase Cloud для StaffEfficiency\n");

run("npx prisma generate");
run("npx prisma migrate deploy");
run("npm run db:seed");
run("npm run demo:users");

console.log(`
✅ Supabase готов к деплою на Vercel.

Следующие шаги:
  1. Зайдите на https://vercel.com → Add New Project
  2. Импортируйте репозиторий Laftore/staff-efficiency
  3. Добавьте Environment Variables (из .env.production.local):
     - NEXT_PUBLIC_SUPABASE_URL
     - NEXT_PUBLIC_SUPABASE_ANON_KEY
     - SUPABASE_SERVICE_ROLE_KEY
     - DATABASE_URL  (pooler, порт 6543, ?pgbouncer=true)
     - DIRECT_URL    (pooler, порт 5432 — НЕ db.xxx.supabase.co!)
  4. Deploy (миграции уже применены этим скриптом)

Демо-логин после деплоя:
  owner@demo.local / Demo2026!
`);