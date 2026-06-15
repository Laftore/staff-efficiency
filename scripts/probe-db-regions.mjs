#!/usr/bin/env node
/** Проверяет, какой регион pooler реально принимает ваш пароль. */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.production.local" });

const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(
  /https:\/\/([^.]+)\.supabase\.co/,
)?.[1];

if (!ref) {
  console.error("❌ Не найден project ref в NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

function buildUrl(region, port) {
  const base = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!base) return null;
  const url = new URL(base);
  url.username = `postgres.${ref}`;
  url.hostname = `aws-0-${region}.pooler.supabase.com`;
  url.port = String(port);
  if (port === 6543) {
    url.search = "pgbouncer=true";
  } else {
    url.search = "";
  }
  return url.toString();
}

const regions = [
  "eu-west-1",
  "eu-central-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "us-east-1",
  "us-west-1",
  "ap-southeast-1",
  "ap-northeast-1",
];

const current = new URL(process.env.DIRECT_URL ?? "");
console.log(`\nProject ref: ${ref}`);
console.log(`Сейчас в .env: ${current.hostname}:${current.port}\n`);

for (const region of regions) {
  for (const port of [5432, 6543]) {
    const conn = buildUrl(region, port);
    const prisma = new PrismaClient({ datasources: { db: { url: conn } } });
    try {
      await prisma.$queryRaw`SELECT 1 AS ok`;
      console.log(`✅ РАБОТАЕТ: aws-0-${region}.pooler.supabase.com:${port}`);
    } catch {
      // silent fail
    } finally {
      await prisma.$disconnect();
    }
  }
}

console.log("\nЕсли ни один регион не подошёл — пароль в строке не совпадает с Database password в Supabase.\n");