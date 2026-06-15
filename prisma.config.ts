import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Не перезаписывать env, если родительский процесс уже загрузил .env.production.local
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
});