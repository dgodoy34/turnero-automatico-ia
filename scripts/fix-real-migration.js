const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const EXTENSIONS = [".ts", ".tsx", ".js"];
const IGNORE = ["node_modules", ".next", ".git", "scripts"];

function walk(dir, files = []) {
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE.includes(file)) {
        walk(fullPath, files);
      }
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        files.push(fullPath);
      }
    }
  });

  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let original = content;

  const isAPI = filePath.includes("app/api");

  // =========================
  // 🔥 1. FRONTEND SAFE FIX
  // =========================
  if (filePath.includes("app") || filePath.includes("components")) {
    content = content.replace(/\.restaurant_id/g, ".business_id");
  }

  // =========================
  // 🔥 2. reservationCode FIX
  // =========================
  if (filePath.includes("reservationCode")) {
    content = content.replace(
      /\.eq\("id",\s*restaurantId\)/g,
      `.eq("business_id", businessId)`
    );
  }

  // =========================
  // 🔥 3. INSERT CRÍTICOS
  // =========================
  if (
    filePath.includes("conversation") ||
    filePath.includes("createBooking") ||
    filePath.includes("appointments")
  ) {
    content = content.replace(
      /\.insert\(\s*{/g,
      `.insert({\n        business_id,`
    );
  }

  // =========================
  // 🔥 4. FIX .eq("id", id) SOLO EN APIs
  // =========================
  if (isAPI && !filePath.includes("restaurants")) {
    content = content.replace(
      /\.eq\("id",\s*id\)/g,
      `.eq("id", id)\n      .eq("business_id", businessId)`
    );
  }

  // =========================
  // 🔥 5. webhook connect FIX
  // =========================
  if (filePath.includes("whatsapp")) {
    content = content.replace(
      /\.eq\("id",\s*restaurant_id\)/g,
      `.eq("id", businessId)`
    );
  }

  // =========================
  // 🔥 6. PROTECCIÓN: NO TOCAR phone_number_id
  // =========================
  // (no hacemos nada, solo evitamos falsos positivos)

  // =========================
  // 💾 GUARDAR SI CAMBIÓ
  // =========================
  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log("✅ FIX:", filePath);
  }
}

// =========================
// 🚀 MAIN
// =========================

console.log("🚀 Ejecutando FIX PRO...\n");

const files = walk(ROOT);

files.forEach((file) => {
  fixFile(file);
});

console.log("\n🎉 FIX COMPLETADO (VERSIÓN PRO)");