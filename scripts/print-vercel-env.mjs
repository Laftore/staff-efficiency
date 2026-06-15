#!/usr/bin/env node
/**
 * Показывает, что именно вставить в Vercel (без вывода паролей целиком).
 * npm run deploy:print-env
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const envFile = resolve(process.cwd(), ".env.production.local");
if (!existsSync(envFile)) {
  console.error("❌ Нет .env.production.local");
  process.exit(1);
}

dotenv.config({ path: envFile });

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
];

console.log("\n📋 Проверка перед копированием в Vercel:\n");

for (const key of keys) {
  const value = process.env[key];
  if (!value) {
    console.log(`❌ ${key} — пусто`);
    continue;
  }
  if (value.startsWith('"') || value.startsWith("'")) {
    console.log(`⚠️  ${key} — уберите кавычки при вставке в Vercel`);
  }
  if (key.includes("DATABASE")) {
    try {
      const url = new URL(value);
      console.log(`✅ ${key}`);
      console.log(`     user: ${url.username}`);
      console.log(`     host: ${url.hostname}:${url.port}`);
    } catch {
      console.log(`❌ ${key} — невалидный URL`);
    }
  } else {
    console.log(`✅ ${key} — задан (${value.length} символов)`);
  }
}

console.log(`
В Vercel → Settings → Environment Variables:
  • Отметьте Production + Preview
  • Вставляйте БЕЗ кавычек в начале/конце
  • После сохранения: Deployments → Redeploy

Проверка на живом сайте: https://ВАШ-ДОМЕН.vercel.app/api/health
`);