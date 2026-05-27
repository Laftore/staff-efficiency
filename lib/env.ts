import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

/** True when Supabase Auth can be used (middleware + login). */
export function isSupabaseConfigured(): boolean {
  const client = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return client.success;
}

/** True when Prisma can reach the database. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function isSmartshellConfigured(): boolean {
  return Boolean(process.env.SMARTSHELL_API_TOKEN);
}

/** True when VK Bot is fully configured for sending notifications. */
export function isVkBotConfigured(): boolean {
  return Boolean(
    process.env.VK_BOT_TOKEN &&
    process.env.VK_GROUP_ID &&
    process.env.VK_CONFIRMATION_TOKEN
  );
}

export function getServerEnv() {
  return serverSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
