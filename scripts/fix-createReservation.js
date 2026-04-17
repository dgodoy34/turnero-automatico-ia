const fs = require("fs");

const path = "./lib/createReservation.ts";

let content = fs.readFileSync(path, "utf8");

console.log("🛠 Aplicando fixes...");

// =========================
// FIX 1 - VALIDACIÓN HORARIO
// =========================
content = content.replace(
  /const validSlot = tableInventory\.some\([\s\S]*?\}\);\s*\n\s*if \(!validSlot\) \{[\s\S]*?\}\n/,
  `// 🔥 VALIDAR SOLO SI HAY CONFIG REAL
const hasTimeConfig = tableInventory.some(
  t => t.start_time && t.end_time
);

if (hasTimeConfig) {

  const validSlot = tableInventory.some((t) => {

    if (!t.start_time || !t.end_time) return true;

    if (t.start_time < t.end_time) {
      return start_time >= t.start_time && start_time < t.end_time;
    }

    return (
      start_time >= t.start_time || start_time < t.end_time
    );
  });

  if (!validSlot) {
    return {
      success: false,
      message: "Horario fuera del turno configurado.",
    };
  }
}
`
);

// =========================
// FIX 2 - INSERT WALK-IN
// =========================
content = content.replace(
  /phone:\s*client_phone,/g,
  `phone: client?.phone || client_phone || "0000000000",`
);

content = content.replace(
  /name:\s*client_name,/g,
  `name: client?.name || client_name || "Walk-in",`
);

// =========================
// FIX 3 - DUPLICADOS WALK-IN
// =========================
content = content.replace(
  /const \{ data: existing \} = await supabase[\s\S]*?if \(existing\) \{[\s\S]*?\}\n/,
  `if (source !== "walkin") {

  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("business_id", businessId)
    .eq("client_dni", dni)
    .eq("date", date)
    .eq("time", formattedStart)
    .eq("status", "confirmed")
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      message: "Ya tenés una reserva confirmada en ese horario.",
    };
  }
}
`
);

// =========================
// FIX 4 - CLIENT PHONE SAFE
// =========================
content = content.replace(
  /if \(!client\.phone\)/g,
  `if (!client?.phone)`
);

// =========================
// SAVE
// =========================
fs.writeFileSync(path, content);

console.log("✅ FIXES APLICADOS");