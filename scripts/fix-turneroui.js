const fs = require("fs");

const path = "./components/turnero/TurneroUI.tsx"; // ⚠️ ajustá ruta si hace falta

let content = fs.readFileSync(path, "utf8");

console.log("🛠 Fix TurneroUI...");

// =====================
// FIX 1: successMessage state
// =====================
if (!content.includes("setSuccessMessage")) {
  content = content.replace(
    "const [clientBirthday, setClientBirthday] = useState(\"\")",
    `const [clientBirthday, setClientBirthday] = useState("")
const [successMessage, setSuccessMessage] = useState("")`
  );
}

// =====================
// FIX 2: createReservationRequest
// =====================
if (!content.includes("async function createReservationRequest")) {
  content = content.replace(
    "async function updateAppointmentStatus",
    `
async function createReservationRequest() {
  setShowClientModal(false);
  await addAppointment();
}

async function updateAppointmentStatus`
  );
}

// =====================
// FIX 3: agregar header restaurant
// =====================
content = content.replace(
  /headers:\s*{\s*"Content-Type":\s*"application\/json"\s*}/,
  `headers: {
        "Content-Type": "application/json",
        "x-restaurant-id": restaurantId!
      }`
);

// =====================
// SAVE
// =====================
fs.writeFileSync(path, content);

console.log("✅ TurneroUI FIX aplicado");