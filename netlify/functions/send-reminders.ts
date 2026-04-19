export const handler = async () => {
  try {
    const res = await fetch(
      "https://turiago.app/api/cron/send-reminders"
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ HTTP ERROR:", res.status, text);
      throw new Error(`HTTP error: ${res.status}`);
    }

    const data = await res.json();

    console.log("📩 REMINDERS OK:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("❌ REMINDERS ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Reminders cron failed",
      }),
    };
  }
};