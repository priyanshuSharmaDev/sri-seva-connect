import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npm run db:seed"
  },
  datasource: {
    // Keep application traffic on Neon's pooled URL while migrations use the
    // direct connection required for session-level schema operations.
    url: env("DATABASE_URL_UNPOOLED")
  }
});
