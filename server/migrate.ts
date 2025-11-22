import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "./db";

async function runMigrations() {
  const migrationsDir = join(process.cwd(), "migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const migrationFile = join(migrationsDir, file);
    const sql = await readFile(migrationFile, "utf8");
    await pool.query(sql);
    console.log(`Applied migration from ${migrationFile}`);
  }
}

runMigrations()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
