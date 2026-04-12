export const handler = async () => {
  try {
    const res = await fetch(
      "https://turiact.netlify.app/api/cron/auto-cancel"
    );

    const data = await res.json();

    console.log("AUTO CANCEL OK:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("AUTO CANCEL ERROR:", error);

    return {
      statusCode: 500,
      body: "error",
    };
  }
};