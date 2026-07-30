import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_BUDGETS = new Set([
  "Not specified",
  "Under $10,000",
  "$10,000–$25,000",
  "$25,000–$50,000",
  "$50,000+",
  "Premium",
]);

function clean(value, maximum = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function extensionFor(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function buildPrompt({ project, description, stylePreferences, revisionNotes, budgetTier }) {
  const projectContext = [project.project_type, project.title, project.description]
    .filter(Boolean)
    .join(" — ");

  return [
    "Create a realistic proposed-after visualization by editing the supplied property photo.",
    "The supplied image is the user's actual property and must remain the visual foundation.",
    "Preserve the same house, property boundaries, camera position, perspective, terrain, driveway, mature trees, fixed structures, neighboring context, and recognizable features unless the user explicitly requests a change to one of those items.",
    "Do not replace the property with a different house or invent a new location.",
    "Only add, remove, or modify the project elements requested below.",
    "Keep scale, placement, construction feasibility, shadows, lighting, and materials believable.",
    "Return a polished photorealistic concept rendering with no labels, text, watermark, border, split screen, or collage.",
    projectContext ? `Project context: ${projectContext}` : "",
    `Requested project: ${description}`,
    stylePreferences ? `Style and material preferences: ${stylePreferences}` : "",
    budgetTier !== "Not specified" ? `Budget direction: ${budgetTier}. Keep the visible scope and finishes consistent with that budget level.` : "",
    revisionNotes ? `Revision request: ${revisionNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function updateFailedRequest(service, requestId, error) {
  if (!requestId) return;
  await service
    .from("project_vision_requests")
    .update({
      status: "failed",
      error_message: clean(error?.message || "Image generation failed.", 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
}

export async function POST(request) {
  let service;
  let requestId = "";

  try {
    const context = await requireUser(request);
    service = context.service;
    const user = context.user;

    const body = await request.json();
    const projectId = clean(body.projectId, 80);
    const sourceAssetId = clean(body.sourceAssetId, 80);
    const description = clean(body.description, 1800);
    const stylePreferences = clean(body.stylePreferences, 900);
    const revisionNotes = clean(body.revisionNotes, 900);
    const requestedBudget = clean(body.budgetTier, 80) || "Not specified";
    const budgetTier = ALLOWED_BUDGETS.has(requestedBudget) ? requestedBudget : "Not specified";

    if (process.env.PROJECT_VISION_ENABLED === "false") {
      return NextResponse.json(
        { error: "Project Vision is temporarily paused by the administrator." },
        { status: 503 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Project Vision is not connected yet. Add OPENAI_API_KEY in Vercel, then redeploy." },
        { status: 503 }
      );
    }

    if (!projectId || !sourceAssetId || description.length < 10) {
      return NextResponse.json(
        { error: "Choose an original photo and describe the finished project in at least 10 characters." },
        { status: 400 }
      );
    }

    const [{ data: project, error: projectError }, { data: source, error: sourceError }] = await Promise.all([
      service
        .from("projects")
        .select("id,user_id,title,project_type,description")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single(),
      service
        .from("project_vision_assets")
        .select("id,project_id,user_id,asset_type,storage_path,mime_type,width,height")
        .eq("id", sourceAssetId)
        .eq("user_id", user.id)
        .single(),
    ]);

    if (projectError || !project) {
      return NextResponse.json({ error: "That project could not be opened." }, { status: 404 });
    }

    if (sourceError || !source || source.project_id !== project.id || source.asset_type !== "source") {
      return NextResponse.json({ error: "Choose a valid original photo from this project." }, { status: 400 });
    }

    const configuredLimit = Number.parseInt(process.env.PROJECT_VISION_DAILY_LIMIT || "5", 10);
    const dailyLimit = Number.isFinite(configuredLimit) ? Math.max(1, Math.min(configuredLimit, 50)) : 5;
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: dailyRequests, error: limitError } = await service
      .from("project_vision_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["processing", "completed"])
      .gte("created_at", dayStart.toISOString());
    if (limitError) throw limitError;
    if (Number(dailyRequests || 0) >= dailyLimit) {
      return NextResponse.json(
        { error: `This account has reached its Project Vision limit of ${dailyLimit} image${dailyLimit === 1 ? "" : "s"} today.` },
        { status: 429 }
      );
    }

    const supportedMime = ["image/jpeg", "image/png", "image/webp"].includes(source.mime_type);
    if (!supportedMime) {
      return NextResponse.json(
        { error: "This image format cannot be edited yet. Upload a JPG, PNG, or WebP photo." },
        { status: 400 }
      );
    }

    const preserveInstructions =
      "Preserve the original property, structures, layout, perspective, camera angle, and recognizable fixed features. Modify only the requested project elements.";

    const { data: visionRequest, error: requestError } = await service
      .from("project_vision_requests")
      .insert({
        project_id: project.id,
        user_id: user.id,
        source_asset_id: source.id,
        project_description: description,
        budget_tier: budgetTier,
        style_preferences: stylePreferences,
        preserve_instructions: preserveInstructions,
        status: "processing",
      })
      .select("id")
      .single();

    if (requestError || !visionRequest) throw requestError || new Error("The visualization request could not be saved.");
    requestId = visionRequest.id;

    const { data: originalBlob, error: downloadError } = await service.storage
      .from("project-vision")
      .download(source.storage_path);

    if (downloadError || !originalBlob) throw downloadError || new Error("The original photo could not be loaded.");

    const prompt = buildPrompt({
      project,
      description,
      stylePreferences,
      revisionNotes,
      budgetTier,
    });

    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    form.append(
      "image",
      new Blob([await originalBlob.arrayBuffer()], { type: source.mime_type }),
      `project-original.${extensionFor(source.mime_type)}`
    );
    form.append("prompt", prompt);
    const sourceWidth = Number(source.width || 0);
    const sourceHeight = Number(source.height || 0);
    const automaticSize = sourceHeight > sourceWidth * 1.12
      ? "1024x1536"
      : sourceWidth > sourceHeight * 1.12
        ? "1536x1024"
        : "1024x1024";
    form.append("size", process.env.OPENAI_IMAGE_SIZE || automaticSize);
    form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "high");
    form.append("input_fidelity", process.env.OPENAI_IMAGE_INPUT_FIDELITY || "high");

    const openAIResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      cache: "no-store",
    });

    const openAIResult = await openAIResponse.json().catch(() => ({}));
    if (!openAIResponse.ok) {
      const providerMessage = openAIResult?.error?.message || "The AI image editor could not complete this visualization.";
      if (/invalid image file or mode/i.test(providerMessage)) {
        throw new Error(
          "This original photo uses an incompatible color format. Remove it and upload it again; Project Pilot now converts new uploads to a standard RGB JPG automatically."
        );
      }
      throw new Error(providerMessage);
    }

    const base64Image = openAIResult?.data?.[0]?.b64_json;
    if (!base64Image) throw new Error("The image editor returned no completed image.");

    const { data: latestVersions, error: versionError } = await service
      .from("project_vision_assets")
      .select("version_number")
      .eq("project_id", project.id)
      .eq("source_asset_id", source.id)
      .eq("asset_type", "concept")
      .order("version_number", { ascending: false })
      .limit(1);

    if (versionError) throw versionError;
    const versionNumber = Number(latestVersions?.[0]?.version_number || 0) + 1;
    const resultPath = `${user.id}/${project.id}/concept-${source.id}-${crypto.randomUUID()}.png`;
    const resultBuffer = Buffer.from(base64Image, "base64");

    const { error: uploadError } = await service.storage
      .from("project-vision")
      .upload(resultPath, resultBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: resultAsset, error: assetError } = await service
      .from("project_vision_assets")
      .insert({
        project_id: project.id,
        user_id: user.id,
        asset_type: "concept",
        source_asset_id: source.id,
        storage_path: resultPath,
        mime_type: "image/png",
        file_size_bytes: resultBuffer.length,
        caption: `Project Vision concept ${versionNumber}`,
        generation_prompt: description,
        revision_notes: revisionNotes,
        version_number: versionNumber,
        status: "ready",
      })
      .select("*")
      .single();

    if (assetError || !resultAsset) {
      await service.storage.from("project-vision").remove([resultPath]);
      throw assetError || new Error("The completed concept could not be saved.");
    }

    await service
      .from("project_vision_requests")
      .update({
        result_asset_id: resultAsset.id,
        status: "completed",
        provider_request_id: openAIResponse.headers.get("x-request-id") || "",
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return NextResponse.json({ asset: resultAsset });
  } catch (error) {
    await updateFailedRequest(service, requestId, error).catch(() => null);
    return NextResponse.json(
      { error: error?.message || "Project Vision could not complete this request." },
      { status: 500 }
    );
  }
}
