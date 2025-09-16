const { Logging } = require("@google-cloud/logging");

const projectId = process.env.GCP_PROJECT_ID;
const credentials = JSON.parse(
  Buffer.from(process.env.GCP_CREDENTIALS, "base64").toString()
);

const logging = new Logging({ projectId, credentials });
const log = logging.log("netlify-logs"); // custom log name

/**
 * Lambda compatible function for Netlify
 * @param {} event 
 * @returns 
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    console.log("Received log data:", event);
    const body = JSON.parse(event.body || "{}");

    /*
    const logEntry = {
      timestamp: new Date().toISOString(),
      id: body.id || null,
      title: body.title || null,
    };
    */
    const logEntry = body.id + " " + body.title;
    const metadata = {
      resource: { type: "global" },
      severity: "INFO"
    };
    await log.write(log.entry(metadata, logEntry));

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error" };
  }
};
