import { hashPassword } from "../utils/crypto.js";

const password = process.argv.slice(2).find((argument) => argument !== "--");

if (!password) {
  console.error("Usage: pnpm --filter @work-rodion/api auth:hash-password -- <password>");
  process.exit(1);
}

hashPassword(password)
  .then((hash) => {
    console.log(hash);
  })
  .catch((error) => {
    console.error("Failed to hash password", error);
    process.exit(1);
  });
