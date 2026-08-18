import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function clean(value, maximum = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => message && ["user", "assistant"].includes(message.role))
    .map((message) => ({
      role: message.role,
      text: clean(message.text, 1200),
    }))
    .filter((message) => message.text)
    .slice(-12);
}

function extractOutputText(result) {
  if (typeof result?.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  for (const item of result?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content?.text) return String(content.text).trim();
    }
  }
  return "";
}

function designInstructions(phase) {
  const phaseRules = phase === "refine"
    ? [
        "The homeowner is refining an already generated concept.",
        "Help them identify exactly what feels wrong or incomplete in the selected concept.",
        "Clarify only the changes needed. Explicitly preserve every part of the selected concept they did not ask to change.",
        "The final brief must be written as a conservative image-edit instruction that changes only the requested details.",
      ]
    : [
        "The homeowner is defining the look for the first proposed remodel.",
        "Help them describe a believable remodeled version of their actual property, not a fantasy replacement.",
        "The final brief should produce a visible renovation while keeping the same property, structure placement, layout, scale, perspective, and recognizable features.",
      ];

  return [
    "You are Su, Project Pilot's design conversation assistant.",
    "Your job is to help a homeowner discover and clearly describe the exact remodeled look they are searching for based on their own responses.",
    "Do not use a fixed quiz, canned style menu, or preset questionnaire.",
    "Ask one short, natural follow-up question at a time, chosen specifically from what the homeowner just said and what is still unclear.",
    "Use the homeowner's own words. Do not force design terminology on them.",
    "Only ask about details that materially affect the result, such as what must stay, what must change, desired feel, materials, colors, function, maintenance, budget realism, and anything they want to avoid.",
    "Do not ask questions that the saved project context or conversation already answers.",
    "Do not repeat a question. Do not ask multiple unrelated questions in one response.",
    "When the homeowner has provided enough detail, stop asking questions and produce a precise design brief.",
    "The design brief must be practical, specific, photorealistic, faithful to the actual property, and appropriate for a balanced remodel.",
    "A balanced remodel should preserve most of the original image and property identity while visibly upgrading the requested project area with believable materials, finishes, cleanup, repairs, and functional improvements.",
    "Do not invent hidden walls, new portions of the house, relocated structures, altered property boundaries, or a different camera position unless the homeowner explicitly requests a structural change.",
    ...phaseRules,
    "Return only JSON matching the required schema.",
  ].join("\n");
}

async function callModel({ model, input, phase }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: designInstructions(phase),
      input,
      max_output_tokens: 700,
      text: {
        format: {
          type: "json_schema",
          name: "project_vision_guidance",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              ready: { type: "boolean" },
              message: { type: "string" },
              brief: { type: "string" },
            },
            required: ["ready", "message", "brief"],
          },
        },
      },
    }),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.error?.message || "Su could not continue the design conversation.");
    error.status = response.status;
    throw error;
  }

  const outputText = extractOutputText(result);
  if (!outputText) throw new Error("Su returned an empty design response.");

  try {
    const parsed = JSON.parse(outputText);
    return {
      ready: Boolean(parsed.ready),
      message: clean(parsed.message, 1200),
      brief: clean(parsed.brief, 3000),
    };
  } catch {
    throw new Error("Su could not format the design guidance correctly. Please try again.");
  }
}

export async function POST(request) {
  try {
    const { service, user } = await requireUser(request);
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Su is not connected yet. Add OPENAI_API_KEY in Vercel." }, { status: 503 });
    }

    const body = await request.json();
    const projectId = clean(body.projectId, 80);
    const phase = body.phase === "refine" ? "refine" : "initial";
    const messages = cleanMessages(body.messages);
    const selectedConcept = clean(body.selectedConcept, 500);
    const currentBrief = clean(body.currentBrief, 3000);

    if (!projectId || !messages.some((message) => message.role === "user")) {
      return NextResponse.json({ error: "Tell Su what you want the project to look like." }, { status: 400 });
    }

    const { data: project, error: projectError } = await service
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "That project could not be opened." }, { status: 404 });
    }

    const context = [
      `Phase: ${phase}`,
      `Saved project title: ${clean(project.title, 300) || "Untitled project"}`,
      `Saved project type: ${clean(project.project_type, 200) || "Not specified"}`,
      `Saved project description: ${clean(project.description, 1200) || "Not specified"}`,
      `Saved property location: ${clean(project.address, 500) || "Not specified"}`,
      `Saved budget: ${project.budget ?? "Not specified"}`,
      `Saved timeline: ${clean(project.timeline, 300) || "Not specified"}`,
      selectedConcept ? `Selected concept: ${selectedConcept}` : "",
      currentBrief ? `Current approved design brief: ${currentBrief}` : "",
      "Conversation:",
      ...messages.map((message) => `${message.role === "user" ? "Homeowner" : "Su"}: ${message.text}`),
    ].filter(Boolean).join("\n");

    const preferredModel = process.env.OPENAI_ASSISTANT_MODEL || "gpt-5.6-luna";
    const fallbackModel = process.env.OPENAI_ASSISTANT_FALLBACK_MODEL || "gpt-5.4-mini";

    let result;
    try {
      result = await callModel({ model: preferredModel, input: context, phase });
    } catch (error) {
      if (preferredModel === fallbackModel || error?.status === 401 || error?.status === 429) throw error;
      result = await callModel({ model: fallbackModel, input: context, phase });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Su could not continue the design conversation." },
      { status: Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500 }
    );
  }
}
