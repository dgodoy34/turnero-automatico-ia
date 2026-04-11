export const handler = async () => {
  try {
    const res = await fetch("https://turiact.netlify.app/api/cron/send-reminders");
    const data = await res.json();

    console.log("CRON OK:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("CRON ERROR:", error);

    return {
      statusCode: 500,
      body: "error",
    };
  }
};