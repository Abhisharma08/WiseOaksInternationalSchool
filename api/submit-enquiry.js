const STEP_CONFIG = {
  step1: {
    formIdEnv: "HUBSPOT_FORM_ID_STEP1",
    allowedFields: ["firstname", "student_name", "email"]
  },
  step2: {
    formIdEnv: "HUBSPOT_FORM_ID_STEP2",
    allowedFields: [
      "email",
      "phone_number",
      "residential_status",
      "campus",
      "grade",
      "feedback"
    ]
  }
};

function json(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(payload));
}

function pickAllowedFields(data, allowedFields) {
  const fields = [];

  for (const fieldName of allowedFields) {
    const value = data?.[fieldName];
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    fields.push({
      name: fieldName,
      value: trimmed
    });
  }

  return fields;
}

function parseRequestBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { ok: false, error: "Method not allowed" });
  }

  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const { step, data, pageUri, pageName } = parseRequestBody(request.body);
  const stepConfig = STEP_CONFIG[step];

  if (!portalId || !stepConfig) {
    return json(response, 400, { ok: false, error: "Invalid server configuration" });
  }

  const formId = process.env[stepConfig.formIdEnv];
  if (!formId) {
    return json(response, 500, { ok: false, error: "Missing form configuration" });
  }

  const fields = pickAllowedFields(data, stepConfig.allowedFields);
  if (fields.length === 0) {
    return json(response, 400, { ok: false, error: "No valid form fields provided" });
  }

  try {
    const hubspotResponse = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields,
          context: {
            pageUri: typeof pageUri === "string" ? pageUri : "",
            pageName: typeof pageName === "string" ? pageName : ""
          }
        })
      }
    );

    if (!hubspotResponse.ok) {
      const details = await hubspotResponse.text();
      console.error("HubSpot submission failed", details);
      return json(response, 502, { ok: false, error: "Submission failed" });
    }

    return json(response, 200, { ok: true });
  } catch (error) {
    console.error("HubSpot proxy error", error);
    return json(response, 502, { ok: false, error: "Submission failed" });
  }
};
