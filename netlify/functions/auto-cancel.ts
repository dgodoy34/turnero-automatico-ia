export const handler = async () => {
  try {
    const res = await fetch(
      "https://turiago.app/api/cron/auto-cancel"
    );

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }

    const data = await res.json();

    console.log("🧹 AUTO CANCEL OK:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("❌ AUTO CANCEL ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Auto cancel failed",
      }),
    };
  }
};