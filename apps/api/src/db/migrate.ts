import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, "../../../../drizzle");

async function main() {
  const files = (await import("node:fs/promises")).readdir(migrationsDirectory);
  const sortedFiles = (await files).filter((file) => file.endsWith(".sql")).sort();

  for (const file of sortedFiles) {
    const migrationPath = path.join(migrationsDirectory, file);
    const sql = await readFile(migrationPath, "utf8");
    await pool.query(sql);
    console.log(`Applied migration ${migrationPath}`);
  }
}

main()
  .catch((error) => {
    console.error("Migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
