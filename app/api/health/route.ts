import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/env";

function parseDbEnv(name: "DATABASE_URL" | "DIRECT_URL") {
  const raw = process.env[name];
  if (!raw) return { set: false as const };
  try {
    const url = new URL(raw);
    return {
      set: true as const,
      user: url.username,
      host: url.hostname,
      port: url.port,
      hasPgbouncer: url.searchParams.has("pgbouncer"),
      hasQuotes: raw.startsWith('"') || raw.startsWith("'"),
    };
  } catch {
    return { set: true as const, invalid: true as const };
  }
}

/** Публичная диагностика env на Vercel (без паролей). Удалите после настройки. */
export async function GET() {
  const database = parseDbEnv("DATABASE_URL");
  const direct = parseDbEnv("DIRECT_URL");
  const expectedRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];

  let dbOk = false;
  let profileCount: number | null = null;
  let dbError: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
      profileCount = await prisma.profile.count();
    } catch (error) {
      dbError = error instanceof Error ? error.message.split("\n")[0] : "unknown";
    }
  }

  const issues: string[] = [];
  if (!isSupabaseConfigured()) issues.push("NEXT_PUBLIC_SUPABASE_* не заданы");
  if (!database.set) issues.push("DATABASE_URL не задан");
  if (database.set && "invalid" in database) issues.push("DATABASE_URL — битый URL");
  if (database.set && "user" in database && database.user === "postgres") {
    issues.push('DATABASE_URL: логин "postgres" — нужен postgres.' + (expectedRef ?? "ВАШ_REF"));
  }
  if (database.set && "hasQuotes" in database && database.hasQuotes) {
    issues.push("DATABASE_URL начинается с кавычек — уберите их в Vercel");
  }
  if (database.set && "port" in database && database.port !== "6543") {
    issues.push(`DATABASE_URL порт ${database.port}, ожидался 6543`);
  }
  if (database.set && "hasPgbouncer" in database && !database.hasPgbouncer) {
    issues.push("DATABASE_URL: добавьте ?pgbouncer=true");
  }
  if (dbError?.includes("Authentication failed")) {
    issues.push("Пароль в DATABASE_URL на Vercel не совпадает с Supabase Database password");
  }

  return NextResponse.json({
    ok: isSupabaseConfigured() && dbOk,
    supabase: isSupabaseConfigured(),
    database: isDatabaseConfigured(),
    dbConnection: dbOk,
    profileCount,
    expectedRef,
    env: {
      DATABASE_URL: database,
      DIRECT_URL: direct,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    },
    issues,
  });
}