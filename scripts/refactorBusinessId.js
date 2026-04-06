const fs = require("fs");
const path = require("path");

const ROOT = "./"; // raíz del proyecto

function walk(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);

    // ignorar node_modules y .next
    if (fullPath.includes("node_modules") || fullPath.includes(".next")) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else {

      if (!fullPath.endsWith(".ts") && !fullPath.endsWith(".tsx") && !fullPath.endsWith(".js")) {
        return;
      }

      let content = fs.readFileSync(fullPath, "utf8");

      if (content.includes("restaurant_id")) {

        console.log("🔧 Refactor:", fullPath);

        // 🔥 reemplazo inteligente
        content = content.replace(
          /\.eq\("restaurant_id",\s*([^)]+)\)/g,
          `.eq("business_id", $1)`
        );

        content = content.replace(
          /restaurant_id:/g,
          "business_id:"
        );

        fs.writeFileSync(fullPath, content, "utf8");
      }
    }
  });
  
}

walk(ROOT);

console.log("✅ Refactor terminado");