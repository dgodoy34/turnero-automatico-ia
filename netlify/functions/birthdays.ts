export const handler = async () => {
  try {
    const res = await fetch(
      "https://turiact.netlify.app/api/cron/birthdays"
    );

    const data = await res.json();

    console.log("🎂 BIRTHDAY CRON OK:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("❌ BIRTHDAY CRON ERROR:", error);

    return {
      statusCode: 500,
      body: "error",
    };
  }
};