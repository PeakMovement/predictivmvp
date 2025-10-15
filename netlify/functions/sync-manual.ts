import { Handler } from "@netlify/functions";
import { logSync } from "../utils/logger";
import { getDateParam } from "../utils/date";
import { requireEnv } from "../utils/env";

const handler: Handler = async (event) => {
  try {
    requireEnv();
    const url = new URL(event.rawUrl);
    const dateUsed = getDateParam(url);
    logSync("sync-manual:test", { url: url.pathname, dateUsed });
    return { statusCode: 200, body: JSON.stringify({ ok: true, dateUsed }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

export { handler };
