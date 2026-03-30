import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(currentDirectory, "../../../../drizzle/0000_init.sql");

async function main() {
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
  console.log(`Applied migration ${migrationPath}`);
}

main()
  .catch((error) => {
    console.error("Migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
