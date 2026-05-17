import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    // For local dev, wrangler will manage the sqlite file.
    // For prod D1 via HTTP, these would be populated.
    // We leave them dummy here because we rely on wrangler d1 migrations apply
    accountId: "0",
    databaseId: "0",
    token: "0",
  },
});
