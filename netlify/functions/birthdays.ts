export const handler = async () => {
  try {
    const res = await fetch(
      "https://turiago.app/api/cron/birthdays"
    );

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }

    const data = await res.json();

    console.log("🎂 BIRTHDAYS OK:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("❌ BIRTHDAYS ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Birthday cron failed",
      }),
    };
  }
};