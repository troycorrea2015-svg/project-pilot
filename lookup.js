const OFFICIAL_SOURCE_REGISTRY = {
  "19963": {
    label: "Milford area",
    note: "The complete street address must be checked because this ZIP can involve more than one county or local authority.",
    sources: []
  },
  "19968": {
    label: "Milton area",
    note: "Confirm whether the property is inside town limits or under Sussex County jurisdiction.",
    sources: []
  },
  "19947": {
    label: "Georgetown area",
    note: "Confirm whether the property is inside town limits or under Sussex County jurisdiction.",
    sources: []
  },
  "19901": {
    label: "Dover area",
    note: "Confirm municipal boundaries and the authority responsible for the specific property.",
    sources: []
  },
  "19958": {
    label: "Lewes area",
    note: "Confirm whether the property is inside city limits or under Sussex County jurisdiction.",
    sources: []
  },
  "19971": {
    label: "Rehoboth Beach area",
    note: "Confirm municipal boundaries and any coastal or flood-zone requirements.",
    sources: []
  },
  "19973": {
    label: "Seaford area",
    note: "Confirm whether the property is inside city limits or under Sussex County jurisdiction.",
    sources: []
  }
};

function extractOutputText(result) {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const parts = [];
  for (const item of result.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("").trim();
}

function cleanJson(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "OPENAI_API_KEY is not configured",
      setupRequired: true
    });
  }

  const {
    address = "",
    zip = "",
    project = "",
    approach = "",
    description = ""
  } = req.body || {};

  if (!address || !zip || !project) {
    return res.status(400).json({
      error: "Address, ZIP code, and project type are required."
    });
  }

  const sourceRecord = OFFICIAL_SOURCE_REGISTRY[zip] || {
    label: "Unverified jurisdiction",
    note: "Use the full property address to determine the correct city, county, and permitting authority.",
    sources: []
  };

  const prompt = `
You are Project Pilot, a careful residential-project planning assistant.

Create a PRELIMINARY roadmap for:
- Property address: ${address}
- ZIP code: ${zip}
- Project type: ${project}
- Work approach: ${approach}
- Description: ${description || "No additional description supplied"}

Location context:
- Area label: ${sourceRecord.label}
- Verification note: ${sourceRecord.note}

Safety and accuracy requirements:
1. Never state that a permit is definitely required unless an official source supplied in the prompt proves it.
2. Never invent fees, processing times, code sections, application links, inspection requirements, license status, or contractor information.
3. Clearly say that the exact governing jurisdiction must be verified from the full property address.
4. Explain likely considerations in plain language.
5. Distinguish general guidance from verified local requirements.
6. Do not provide legal advice.
7. Return ONLY valid JSON. No markdown fences.

Return this exact JSON shape:
{
  "title": "string",
  "summary": "string",
  "city": "string",
  "county": "string",
  "jurisdictionStatus": "Verified or Needs verification",
  "steps": ["5 to 7 concise strings"],
  "documents": ["3 to 6 concise strings"],
  "questionsToVerify": ["3 to 6 concise strings"],
  "sourceStatus": "string"
}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({
        error: "The AI service returned an error.",
        detail
      });
    }

    const result = await response.json();
    const text = cleanJson(extractOutputText(result));
    const data = JSON.parse(text);

    return res.status(200).json({
      ...data,
      ai: true,
      sources: sourceRecord.sources,
      locationNote: sourceRecord.note
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to create the AI roadmap.",
      detail: error.message
    });
  }
};
