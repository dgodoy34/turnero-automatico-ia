const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// extensiones a revisar
const EXTENSIONS = [".ts", ".tsx", ".js"];

// carpetas a ignorar
const IGNORE = ["node_modules", ".next", ".git"];

// modo fix automático (true = reemplaza)
const AUTO_FIX = false;

// =========================
// 🔍 recorrer directorios
// =========================
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

// =========================
// 🔍 analizar archivo
// =========================
function analyzeFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");

  const hasRestaurantId = content.includes("restaurant.id");
  const hasBusinessId = content.includes("business_id");

  if (!hasRestaurantId) return null;

  console.log("\n📄 Archivo:", filePath);
  console.log("⚠️ Tiene restaurant.id");

  // mostrar líneas afectadas
  const lines = content.split("\n");

  lines.forEach((line, i) => {
    if (line.includes("restaurant.id")) {
      console.log(`   ➜ Línea ${i + 1}: ${line.trim()}`);
    }
  });

  // =========================
  // 🔧 FIX AUTOMÁTICO
  // =========================
  if (AUTO_FIX) {
    content = content.replace(/restaurant\.id/g, "businessId");

    if (!content.includes("const businessId = restaurant.id")) {
      content = content.replace(
        /(\.single\(\);\s*\n)/,
        `$1\nconst businessId = restaurant.id;\n`
      );
    }

    fs.writeFileSync(filePath, content, "utf-8");

    console.log("   ✅ FIX aplicado");
  }

  return true;
}

// =========================
// 🚀 MAIN
// =========================

console.log("🚀 Escaneando proyecto...\n");

const files = walk(ROOT);

let issues = 0;

files.forEach((file) => {
  const result = analyzeFile(file);
  if (result) issues++;
});

console.log("\n=========================");
console.log(`📊 Archivos con problemas: ${issues}`);
console.log("=========================");

if (!AUTO_FIX) {
  console.log("\n⚠️ Modo SOLO LECTURA");
  console.log("👉 Cambiá AUTO_FIX = true para arreglar automáticamente");
}