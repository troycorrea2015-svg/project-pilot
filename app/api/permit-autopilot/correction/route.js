import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function clean(value, maximum = 7000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function extractText(payload) {
  const parts = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

async function requestStructuredResponse(body) {
  const candidates = [...new Set([
    process.env.OPENAI_ASSISTANT_MODEL,
    "gpt-5-mini",
    "gpt-4o-mini",
  ].filter(Boolean))];
  let lastMessage = "Su could not analyze this correction notice.";

  for (const model of candidates) {
    const requestBody = { ...body, model };
    if (!String(model).startsWith("gpt-5")) delete requestBody.reasoning;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload;
    lastMessage = payload?.error?.message || lastMessage;
    if (![400, 404].includes(response.status) || model === candidates[candidates.length - 1]) break;
  }
  throw new Error(lastMessage);
}

export async function POST(request) {
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json();
    const caseId = clean(body.caseId, 100);
    const correctionText = clean(body.correctionText, 7000);

    if (!caseId || correctionText.length < 20) {
      return NextResponse.json({ error: "Paste the correction notice before asking Su to prepare a response." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Su is not connected. Add OPENAI_API_KEY in Vercel and redeploy." }, { status: 503 });
    }

    const { data: permitCase, error: caseError } = await service
      .from("permit_cases")
      .select("*")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .single();
    if (caseError || !permitCase) return NextResponse.json({ error: "That permit case could not be opened." }, { status: 404 });

    const { data: project, error: projectError } = await service
      .from("projects")
      .select("id,title,project_type,description,address,location_label,jurisdiction,budget,permit_research")
      .eq("id", permitCase.project_id)
      .eq("user_id", user.id)
      .single();
    if (projectError || !project) return NextResponse.json({ error: "That project could not be opened." }, { status: 404 });

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        explanation: { type: "string" },
        actionItems: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
        responseDraft: { type: "string" },
        professionalReview: { type: "string" },
      },
      required: ["explanation", "actionItems", "responseDraft", "professionalReview"],
    };

    const context = {
      project: {
        title: project.title,
        type: project.project_type,
        description: project.description,
        property: project.address || project.location_label,
        budget: project.budget,
      },
      permitCase: {
        jurisdiction: permitCase.jurisdiction,
        application: permitCase.application_label,
        answers: permitCase.answers,
        checklist: permitCase.checklist,
        linkedDocumentKeys: Object.keys(permitCase.document_links || {}),
      },
      savedPermitResearch: project.permit_research,
    };

    const payload = await requestStructuredResponse({
      store: false,
      reasoning: { effort: "none" },
      max_output_tokens: 900,
      instructions: [
        "You are Su, Project Pilot's permit correction assistant.",
        "Translate government reviewer comments into plain homeowner language and practical next steps.",
        "Use only the supplied project and permit-case context. Do not invent code sections, fees, deadlines, approval status, or professional conclusions.",
        "Separate what the reviewer explicitly requested from any cautious inference.",
        "When structural, electrical, plumbing, mechanical, survey, legal, sealed-plan, or licensed-professional work may be required, state that professional review should be confirmed with the authority.",
        "The response draft must be polite, factual, and written for the applicant to review. Do not claim that attachments were included unless the context confirms them.",
      ].join("\n"),
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: `PROJECT AND PERMIT CONTEXT\n${JSON.stringify(context)}\n\nREVIEWER CORRECTION NOTICE\n${correctionText}`,
        }],
      }],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "permit_correction_analysis",
          description: "Plain-language permit correction analysis and applicant response draft.",
          strict: true,
          schema,
        },
      },
    });

    const raw = extractText(payload);
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error("Su returned an unreadable correction analysis. Please retry.");
    }

    return NextResponse.json({
      explanation: clean(result.explanation, 2000),
      actionItems: Array.isArray(result.actionItems) ? result.actionItems.map((item) => clean(item, 500)).filter(Boolean).slice(0, 8) : [],
      responseDraft: clean(result.responseDraft, 4000),
      professionalReview: clean(result.professionalReview, 1500),
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Su could not analyze the correction notice." }, { status: 500 });
  }
}
