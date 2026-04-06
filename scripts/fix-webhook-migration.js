const fs = require("fs");
const path = require("path");

// 🔥 subimos un nivel desde /scripts
const filePath = path.join(__dirname, "../app/api/whatsapp/webhook/route.ts");

let content = fs.readFileSync(filePath, "utf-8");

console.log("🔍 Procesando archivo...");

// reemplazo
content = content.replace(/restaurant\.id/g, "businessId");

// insertar businessId si no existe
if (!content.includes("const businessId = restaurant.id")) {
  content = content.replace(
    /(\.single\(\);\s*\n)/,
    `$1\nconst businessId = restaurant.id;\n`
  );
}

fs.writeFileSync(filePath, content, "utf-8");

console.log("✅ Migración lista");