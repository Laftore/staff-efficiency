#!/usr/bin/env node
/**
 * Проверяет, что Supabase Auth и Postgres доступны с текущими env.
 * Запуск: npm run deploy:check
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const root = resolve(import.meta.dirname, "..");
const envFile = resolve(root, ".env.production.local");

if (!existsSync(envFile)) {
  console.error("❌ Нет файла .env.production.local");
  process.exit(1);
}

dotenv.config({ path: envFile });

function parseDbUrl(name) {
  const raw = process.env[name];
  if (!raw) return { ok: false, error: "не задана" };
  try {
    const url = new URL(raw);
    return {
      ok: true,
      user: url.username,
      host: url.hostname,
      port: url.port,
      hasPgbouncer: url.searchParams.has("pgbouncer"),
    };
  } catch {
    return { ok: false, error: "невалидный URL" };
  }
}

function checkDbUrl(name, expectedPort) {
  const parsed = parseDbUrl(name);
  if (!parsed.ok) {
    console.log(`  ❌ ${name}: ${parsed.error}`);
    return false;
  }

  const issues = [];
  if (parsed.host.startsWith("db.") && parsed.host.endsWith(".supabase.co")) {
    issues.push("хост db.*.supabase.co — на Vercel часто не работает, нужен pooler.supabase.com");
  }
  if (parsed.user === "postgres") {
    issues.push('логин "postgres" — нужен postgres.ВАШ_REF (из Supabase → ORM / Prisma)');
  }
  if (expectedPort && parsed.port !== expectedPort) {
    issues.push(`порт ${parsed.port}, ожидался ${expectedPort}`);
  }
  if (name === "DATABASE_URL" && parsed.port === "6543" && !parsed.hasPgbouncer) {
    issues.push("добавьте ?pgbouncer=true в конец DATABASE_URL");
  }

  if (issues.length) {
    console.log(`  ⚠️  ${name}: ${parsed.user}@${parsed.host}:${parsed.port}`);
    for (const issue of issues) console.log(`      → ${issue}`);
    return false;
  }

  console.log(`  ✅ ${name}: ${parsed.user}@${parsed.host}:${parsed.port}`);
  return true;
}

async function main() {
  console.log("\n🔍 Проверка подключения к Supabase\n");

  let ok = true;

  console.log("1) Формат переменных:");
  ok = checkDbUrl("DATABASE_URL", "6543") && ok;
  ok = checkDbUrl("DIRECT_URL", "5432") && ok;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log("  ❌ NEXT_PUBLIC_SUPABASE_URL не задан");
    ok = false;
  } else {
    console.log(`  ✅ NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  }

  console.log("\n2) Supabase Auth (вход owner@demo.local):");
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    const { error } = await supabase.auth.signInWithPassword({
      email: "owner@demo.local",
      password: process.env.DEMO_PASSWORD ?? "Demo2026!",
    });
    if (error) {
      console.log(`  ❌ ${error.message}`);
      ok = false;
    } else {
      console.log("  ✅ Логин работает");
    }
  } else {
    console.log("  ❌ Нет anon key");
    ok = false;
  }

  console.log("\n3) Postgres (Prisma — то же, что падает на Vercel):");
  if (!process.env.DATABASE_URL) {
    console.log("  ❌ DATABASE_URL не задан");
    ok = false;
  } else {
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("  ✅ База отвечает");
      const count = await prisma.profile.count().catch(() => -1);
      if (count === -1) {
        console.log("  ⚠️  Таблица profiles не найдена — запустите npm run deploy:setup");
        ok = false;
      } else if (count === 0) {
        console.log("  ⚠️  profiles пустая — запустите npm run deploy:setup");
        ok = false;
      } else {
        console.log(`  ✅ profiles: ${count} записей`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ ${msg.split("\n")[0]}`);
      if (msg.includes("Authentication failed")) {
        console.log("      → Неверный ПАРОЛЬ БД в DATABASE_URL / DIRECT_URL");
        console.log("      → Supabase → Settings → Database → Reset password");
        console.log("      → Скопируйте строки из вкладки ORM / Prisma (не Direct!)");
      }
      ok = false;
    } finally {
      await prisma.$disconnect();
    }
  }

  if (ok) {
    console.log("\n✅ Локально всё готово.\n");
    console.log("Vercel: в DATABASE_URL логин ДОЛЖЕН быть postgres.cjvetfdckqntllyialxb");
    console.log("Если в логах Vercel написано «credentials for postgres» без ref — env на Vercel СТАРЫЕ.\n");
  } else {
    console.log("\n❌ Исправьте ошибки выше, затем: npm run deploy:setup\n");
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});