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

function analyze(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  let issues = [];

  lines.forEach((line, i) => {

    // ❌ uso viejo
    if (line.includes("restaurant.id") && !line.includes("const businessId")) {
      issues.push({
        type: "restaurant.id",
        line: i + 1,
        text: line.trim(),
      });
    }

    // ❌ queries viejas
    if (line.includes("restaurant_id")) {
      issues.push({
        type: "restaurant_id column",
        line: i + 1,
        text: line.trim(),
      });
    }

    // ⚠️ inserts sin business_id
    if (
      line.includes(".insert(") &&
      !content.includes("business_id")
    ) {
      issues.push({
        type: "insert sin business_id",
        line: i + 1,
        text: line.trim(),
      });
    }

    // ⚠️ eq sin business_id
    if (
      line.includes(".eq(") &&
      !line.includes("business_id") &&
      line.includes("id")
    ) {
      issues.push({
        type: "posible falta business_id",
        line: i + 1,
        text: line.trim(),
      });
    }

  });

  if (issues.length > 0) {
    console.log("\n📄", filePath);

    issues.forEach((issue) => {
      console.log(
        `  [${issue.type}] Línea ${issue.line}: ${issue.text}`
      );
    });
  }

  return issues.length;
}

console.log("🚀 Auditoría de migración...\n");

const files = walk(ROOT);

let totalIssues = 0;

files.forEach((file) => {
  totalIssues += analyze(file);
});

console.log("\n===========================");
console.log("📊 Total issues:", totalIssues);
console.log("===========================");

if (totalIssues === 0) {
  console.log("🎉 TODO OK — Migración completa");
} else {
  console.log("⚠️ Hay cosas para revisar");
}