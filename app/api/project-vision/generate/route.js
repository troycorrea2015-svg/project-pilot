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

function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", extension: "png" };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", extension: "webp" };
  }

  return null;
}

function buildPrompt({ project, description, stylePreferences, revisionNotes, budgetTier }) {
  const projectContext = [project.project_type, project.title, project.description]
    .filter(Boolean)
    .join(" — ");

  return [
    "Edit the attached user-uploaded property photo into a realistic proposed-after visualization.",
    "This is an image-editing request. The attached photo must remain the visual foundation; do not substitute a different house, yard, room, structure, property, or camera view.",
    "Preserve the original camera position, perspective, image framing, terrain, property boundaries, driveway, mature trees, fixed structures, neighboring context, and every recognizable feature that the user did not explicitly ask to change.",
    "Only add, remove, repair, or modify the requested project elements.",
    "Keep dimensions, scale, construction feasibility, material transitions, shadows, weather, and lighting believable.",
    "Return one polished photorealistic finished concept with no text, labels, watermark, border, collage, or split screen.",
    projectContext ? `Saved project context: ${projectContext}` : "",
    `Requested change: ${description}`,
    stylePreferences ? `Style and material preferences: ${stylePreferences}` : "",
    budgetTier !== "Not specified"
      ? `Budget direction: ${budgetTier}. Keep the visible scope and finishes consistent with that budget range.`
      : "",
    revisionNotes ? `Revision request: ${revisionNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function providerError(result, fallback, status = 500) {
  const error = new Error(result?.error?.message || result?.message || fallback);
  error.status = status;
  error.code = result?.error?.code || "";
  error.type = result?.error?.type || "";
  error.moderationDetails = result?.error?.moderation_details || null;
  return error;
}

function isModerationError(error) {
  return error?.code === "moderation_blocked" || /safety|moderation/i.test(error?.type || "");
}

function shouldTryResponsesFallback(error) {
  if (!error || isModerationError(error)) return false;
  if (error.status === 401 || error.status === 429) return false;
  return true;
}

async function editWithImageApi({ imageBuffer, imageType, prompt, width, height }) {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const automaticSize = height > width * 1.12
    ? "1024x1536"
    : width > height * 1.12
      ? "1536x1024"
      : "1024x1024";

  const form = new FormData();
  form.append("model", model);
  form.append(
    "image[]",
    new Blob([imageBuffer], { type: imageType.mime }),
    `project-original.${imageType.extension}`
  );
  form.append("prompt", prompt);
  form.append("size", process.env.OPENAI_IMAGE_SIZE || automaticSize);
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "high");
  form.append("output_format", "png");

  if (model !== "gpt-image-2") {
    form.append("input_fidelity", process.env.OPENAI_IMAGE_INPUT_FIDELITY || "high");
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw providerError(result, "The AI image editor could not complete this visualization.", response.status);
  }

  const base64Image = result?.data?.[0]?.b64_json;
  if (!base64Image) {
    throw new Error("The image editor returned no completed image.");
  }

  return {
    base64Image,
    requestId: response.headers.get("x-request-id") || "",
    provider: "images-edits",
  };
}

async function editWithResponsesApi({ imageBuffer, imageType, prompt }) {
  const model = process.env.OPENAI_PROJECT_VISION_MODEL || "gpt-5.5";
  const imageUrl = `data:${imageType.mime};base64,${imageBuffer.toString("base64")}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageUrl, detail: "high" },
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    }),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw providerError(result, "The fallback image editor could not complete this visualization.", response.status);
  }

  const imageCall = (result?.output || []).find((item) => item?.type === "image_generation_call");
  const base64Image = imageCall?.result || imageCall?.b64_json || "";
  if (!base64Image) {
    const outputText = clean(result?.output_text, 500);
    throw new Error(outputText || "The fallback image editor returned no completed image.");
  }

  return {
    base64Image,
    requestId: response.headers.get("x-request-id") || result?.id || "",
    provider: "responses-image-generation",
  };
}

async function updateFailedRequest(service, requestId, error) {
  if (!service || !requestId) return;
  await service
    .from("project_vision_requests")
    .update({
      status: "failed",
      error_message: clean(error?.message || "Image generation failed.", 1000),
      provider_request_id: clean(error?.requestId || "", 250),
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

    const { data: visionRequest, error: requestError } = await service
      .from("project_vision_requests")
      .insert({
        project_id: project.id,
        user_id: user.id,
        source_asset_id: source.id,
        project_description: description,
        budget_tier: budgetTier,
        style_preferences: stylePreferences,
        preserve_instructions:
          "Preserve the original property, structures, layout, perspective, camera angle, framing, and recognizable fixed features. Modify only the requested project elements.",
        status: "processing",
      })
      .select("id")
      .single();

    if (requestError || !visionRequest) {
      throw requestError || new Error("The visualization request could not be saved.");
    }
    requestId = visionRequest.id;

    const { data: originalBlob, error: downloadError } = await service.storage
      .from("project-vision")
      .download(source.storage_path);

    if (downloadError || !originalBlob) {
      throw downloadError || new Error("The original photo could not be loaded.");
    }

    const imageBuffer = Buffer.from(await originalBlob.arrayBuffer());
    const imageType = detectImageType(imageBuffer);
    if (!imageType) {
      throw new Error(
        "The stored file is not a valid PNG, JPG, or WebP image. Delete it and upload the original photo again."
      );
    }

    const prompt = buildPrompt({
      project,
      description,
      stylePreferences,
      revisionNotes,
      budgetTier,
    });

    let edited;
    let firstError;

    try {
      edited = await editWithImageApi({
        imageBuffer,
        imageType,
        prompt,
        width: Number(source.width || 0),
        height: Number(source.height || 0),
      });
    } catch (error) {
      firstError = error;
      if (!shouldTryResponsesFallback(error)) throw error;
      edited = await editWithResponsesApi({ imageBuffer, imageType, prompt });
    }

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
    const resultBuffer = Buffer.from(edited.base64Image, "base64");
    const resultType = detectImageType(resultBuffer);
    if (!resultType) {
      throw new Error("The AI returned an invalid image file.");
    }

    const resultPath = `${user.id}/${project.id}/concept-${source.id}-${crypto.randomUUID()}.${resultType.extension}`;

    const { error: uploadError } = await service.storage
      .from("project-vision")
      .upload(resultPath, resultBuffer, {
        contentType: resultType.mime,
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
        mime_type: resultType.mime,
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
        provider_request_id: clean(edited.requestId || "", 250),
        error_message: firstError
          ? `Primary editor failed; fallback succeeded: ${clean(firstError.message, 700)}`
          : "",
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return NextResponse.json({
      asset: resultAsset,
      provider: edited.provider,
    });
  } catch (error) {
    await updateFailedRequest(service, requestId, error).catch(() => null);

    let message = error?.message || "Project Vision could not complete this request.";
    if (/invalid image file or mode/i.test(message)) {
      message =
        "This photo is stored in an incompatible image mode. Delete it, upload the original again after this update, and retry. New uploads are converted to a standard PNG automatically.";
    }

    return NextResponse.json(
      {
        error: message,
        code: clean(error?.code || "", 100),
      },
      { status: Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500 }
    );
  }
}
