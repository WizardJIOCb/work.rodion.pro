import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { db, pool } from "../db/client.js";
import { users } from "../db/schema.js";

async function main() {
  const [existingUser] = await db.select().from(users).where(eq(users.email, env.ADMIN_EMAIL)).limit(1);

  if (existingUser) {
    await db
      .update(users)
      .set({
        name: "Rodion",
        passwordHash: env.ADMIN_PASSWORD_HASH,
        isAdmin: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    console.log(`Updated admin user ${env.ADMIN_EMAIL}`);
    return;
  }

  await db.insert(users).values({
    email: env.ADMIN_EMAIL,
    name: "Rodion",
    passwordHash: env.ADMIN_PASSWORD_HASH,
    isAdmin: true,
  });

  console.log(`Created admin user ${env.ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

