export const handler = async () => {
  try {
    const res = await fetch("https://turiago.app/api/cron/send-reminders");

    const text = await res.text();

    console.log("🌐 STATUS:", res.status);
    console.log("🌐 RESPONSE RAW:", text);

    let data;

    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error("La respuesta no es JSON");
    }

    console.log("✅ CRON OK:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("❌ CRON ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Cron failed",
      }),
    };
  }
};