const STEP_CONFIG = {
  step1: {
    allowedFields: ["firstname", "student_name", "email"]
  },
  step2: {
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
      property: fieldName,
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

  const { step, data, pageUri, pageName } = parseRequestBody(request.body);
  const stepConfig = STEP_CONFIG[step];

  if (!stepConfig) {
    return json(response, 400, { ok: false, error: "Invalid server configuration" });
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return json(response, 500, { ok: false, error: "Missing HUBSPOT_ACCESS_TOKEN" });
  }

  const fields = pickAllowedFields(data, stepConfig.allowedFields);
  if (fields.length === 0) {
    return json(response, 400, { ok: false, error: "No valid form fields provided" });
  }

  const emailField = fields.find(f => f.property === 'email');
  const email = emailField ? emailField.value : null;

  if (!email) {
    return json(response, 400, { ok: false, error: "Email is required for contact updates" });
  }

  try {
    // Send data to HubSpot using Contacts API directly (Upsert by email)
    const hubspotResponse = await fetch(
      `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(email)}/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          properties: fields
        })
      }
    );

    if (!hubspotResponse.ok) {
      const details = await hubspotResponse.text();
      console.error("HubSpot Contacts API submission failed", details);
      return json(response, 502, { ok: false, error: "Submission failed" });
    }

    return json(response, 200, { ok: true });
  } catch (error) {
    console.error("HubSpot proxy error", error);
    return json(response, 502, { ok: false, error: "Submission failed" });
  }
};
