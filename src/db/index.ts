import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// In Cloudflare Workers/Pages, the D1 instance is passed via env bindings.
// So we export a function that takes the binding and returns the typed drizzle client.
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
