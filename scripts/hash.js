// scripts/hash.ts
import bcrypt from "bcryptjs";

async function run() {
  const hash = await bcrypt.hash("123456", 10);
  console.log(hash);
}

run();