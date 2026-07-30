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

const VARIANTS = [
  {
    key: "option-a",
    initialLabel: "Option A — Conservative refresh",
    initialDirective:
      "Create a conservative, practical option focused on safety, repair, organization, and modest finish upgrades. Keep the change localized and budget-conscious.",
    refineLabel: "Refinement A — Closest match",
    refineDirective:
      "Apply the homeowner's new instruction as literally and conservatively as possible. Keep every unrequested detail exactly as shown in the selected concept.",
  },
  {
    key: "option-b",
    initialLabel: "Option B — Balanced redesign",
    initialDirective:
      "Create a balanced option that feels polished and upgraded while remaining realistic for a typical homeowner. Improve appearance and usability without replacing the property.",
    refineLabel: "Refinement B — Alternative finish",
    refineDirective:
      "Apply the same homeowner instruction with a tasteful alternative material, finish, or detail treatment while keeping the layout and all unrequested elements fixed.",
  },
  {
    key: "option-c",
    initialLabel: "Option C — Strongest visual",
    initialDirective:
      "Create the strongest visual option while staying believable for the requested budget. Make it attractive and finished, but still clearly the same property and same project area.",
    refineLabel: "Refinement C — Enhanced detail",
    refineDirective:
      "Apply the homeowner instruction with slightly more polished detailing, while preserving the selected concept's layout, dimensions, camera angle, and every unrequested feature.",
  },
];

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

function inferProjectMode(project, description = "") {
  const haystack = `${project?.project_type || ""} ${project?.title || ""} ${project?.description || ""} ${description}`.toLowerCase();
  if (/(deck|porch|patio|balcony)/.test(haystack)) return "deck";
  if (/(pool|spa|hot tub)/.test(haystack)) return "pool";
  if (/(roof|shingle|gutters?)/.test(haystack)) return "roof";
  if (/(kitchen|bath(room)?|interior|basement)/.test(haystack)) return "interior";
  if (/(driveway|garage|walkway|pavers?)/.test(haystack)) return "hardscape";
  if (/(landscap|yard|lawn|garden|tree|fence)/.test(haystack)) return "landscape";
  return "general";
}

function modeSpecificRules(mode) {
  switch (mode) {
    case "deck":
      return [
        "This is a deck, porch, or patio visualization. Treat the existing foreground deck or patio as the primary edit zone unless the homeowner explicitly requests a nearby companion feature.",
        "Preserve the exact yard layout, mature trees, sheds, fields, tree lines, and horizon.",
        "Do not move, replace, enlarge, shrink, or redesign the home.",
        "If the home is only partially visible, do not invent or reveal new siding walls, roof faces, doors, windows, or house sections that were not visible in the supplied image.",
        "Do not move the deck to a different location. Improve the existing deck in place.",
      ];
    case "pool":
      return [
        "This is a pool or outdoor amenity visualization. Keep the home, property boundaries, fixed structures, mature trees, and camera angle anchored.",
        "Add or revise the pool only within realistic open space and do not move the home or existing fixed structures unless the homeowner explicitly requests their removal.",
      ];
    case "roof":
      return [
        "This is a roof or exterior-envelope visualization. Preserve the exact house geometry and only update roofing or closely related exterior finishes.",
      ];
    case "interior":
      return [
        "This is an interior visualization. Preserve the room geometry, walls, window locations, door locations, and camera angle unless the homeowner explicitly requests a structural change.",
      ];
    case "hardscape":
      return [
        "This is a hardscape visualization. Preserve the home placement, property layout, drainage direction, and surrounding fixed structures.",
      ];
    case "landscape":
      return [
        "This is a landscaping visualization. Preserve the home placement, property boundaries, major fixed structures, and any mature tree the homeowner did not ask to remove.",
      ];
    default:
      return [
        "Preserve the exact property and treat this as a strict edit of the supplied image, not a reimagined scene.",
      ];
  }
}

function buildPrompt({
  project,
  description,
  stylePreferences,
  revisionNotes,
  budgetTier,
  variant,
  mode,
  generationMode,
  visionMessage,
  baseConceptCaption,
}) {
  const projectContext = [project?.project_type, project?.title, project?.description]
    .filter(Boolean)
    .join(" — ");
  const isRefinement = generationMode === "refine";

  return [
    isRefinement
      ? "Edit the supplied selected Project Vision concept into a refined photorealistic concept."
      : "Edit the supplied user-uploaded property photo into a photorealistic proposed-after visualization.",
    isRefinement
      ? "The supplied image is the homeowner's selected concept and is the visual starting point for this revision."
      : "The supplied image is the homeowner's real property photo and must remain the visual foundation.",
    "This must remain the same property, same camera position, same perspective, and same overall composition.",
    "Preserve every element that the homeowner did not explicitly ask to change, including property layout, yard shape, terrain, fixed structures, tree placement, outbuildings, horizon line, background landscape, lighting direction, and recognizable features.",
    "Do not move, replace, resize, or redesign the home unless the homeowner directly asks for a home addition or structural alteration.",
    "Do not invent new house walls, siding, roof sections, doors, windows, or hidden structure that are not visible in the supplied image.",
    "Do not shift the perspective, crop into a different camera position, replace the property, or create a new scene.",
    ...modeSpecificRules(mode),
    isRefinement ? variant.refineDirective : variant.initialDirective,
    "Return one polished photorealistic concept with no labels, text, watermark, border, collage, or split screen.",
    projectContext ? `Saved project context: ${projectContext}` : "",
    `Original project request: ${description}`,
    stylePreferences ? `Saved style and material preferences: ${stylePreferences}` : "",
    budgetTier !== "Not specified"
      ? `Budget direction: ${budgetTier}. Keep the visible scope and finishes consistent with that budget range.`
      : "",
    revisionNotes ? `Earlier revision guidance: ${revisionNotes}` : "",
    isRefinement && baseConceptCaption ? `Selected starting concept: ${baseConceptCaption}` : "",
    isRefinement ? `Homeowner's latest Add Your Vision instruction: ${visionMessage}` : "",
    isRefinement
      ? "Apply only the latest instruction and the minimum supporting changes needed to make it believable. Everything else in the selected concept must remain unchanged."
      : "If the request is unclear, keep edits conservative and localized to the requested project area only.",
    isRefinement
      ? `Refinement variation: ${variant.refineLabel}.`
      : `Initial variation: ${variant.initialLabel}.`,
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
    `project-vision-input.${imageType.extension}`
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
  if (!base64Image) throw new Error("The image editor returned no completed image.");

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
  const createdAssetIds = [];
  const createdStoragePaths = [];

  try {
    const context = await requireUser(request);
    service = context.service;
    const user = context.user;

    const body = await request.json();
    const projectId = clean(body.projectId, 80);
    const sourceAssetId = clean(body.sourceAssetId, 80);
    const baseConceptId = clean(body.baseConceptId, 80);
    const generationMode = body.generationMode === "refine" ? "refine" : "initial";
    const description = clean(body.description, 1800);
    const stylePreferences = clean(body.stylePreferences, 900);
    const revisionNotes = clean(body.revisionNotes, 900);
    const visionMessage = clean(body.visionMessage, 1200);
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

    if (generationMode === "refine" && (!baseConceptId || visionMessage.length < 3)) {
      return NextResponse.json(
        { error: "Choose a concept and tell Su what you want changed." },
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
        .select("id,project_id,user_id,asset_type,source_asset_id,storage_path,mime_type,width,height,caption")
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

    let baseConcept = null;
    if (generationMode === "refine") {
      const { data, error } = await service
        .from("project_vision_assets")
        .select("id,project_id,user_id,asset_type,source_asset_id,storage_path,mime_type,width,height,caption")
        .eq("id", baseConceptId)
        .eq("user_id", user.id)
        .single();

      if (
        error ||
        !data ||
        data.project_id !== project.id ||
        data.asset_type !== "concept" ||
        data.source_asset_id !== source.id
      ) {
        return NextResponse.json({ error: "Choose a valid saved concept to refine." }, { status: 400 });
      }
      baseConcept = data;
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
        { error: `This account has reached its Project Vision limit of ${dailyLimit} generation request${dailyLimit === 1 ? "" : "s"} today.` },
        { status: 429 }
      );
    }

    const requestDescription = generationMode === "refine"
      ? `${description}\nAdd Your Vision refinement: ${visionMessage}`
      : description;

    const { data: visionRequest, error: requestError } = await service
      .from("project_vision_requests")
      .insert({
        project_id: project.id,
        user_id: user.id,
        source_asset_id: source.id,
        project_description: requestDescription,
        budget_tier: budgetTier,
        style_preferences: stylePreferences,
        preserve_instructions:
          "Preserve the original property, home placement, structures, layout, perspective, camera angle, framing, and recognizable fixed features. Modify only what the homeowner explicitly requests and do not invent hidden house structure.",
        status: "processing",
      })
      .select("id")
      .single();

    if (requestError || !visionRequest) {
      throw requestError || new Error("The visualization request could not be saved.");
    }
    requestId = visionRequest.id;

    const inputAsset = baseConcept || source;
    const { data: inputBlob, error: downloadError } = await service.storage
      .from("project-vision")
      .download(inputAsset.storage_path);

    if (downloadError || !inputBlob) {
      throw downloadError || new Error("The selected image could not be loaded.");
    }

    const imageBuffer = Buffer.from(await inputBlob.arrayBuffer());
    const imageType = detectImageType(imageBuffer);
    if (!imageType) {
      throw new Error(
        "The selected image is not a valid PNG, JPG, or WebP file. Delete it and upload or generate it again."
      );
    }

    const mode = inferProjectMode(project, description);
    const width = Number(inputAsset.width || source.width || 0);
    const height = Number(inputAsset.height || source.height || 0);

    const { data: latestVersions, error: versionError } = await service
      .from("project_vision_assets")
      .select("version_number")
      .eq("project_id", project.id)
      .eq("source_asset_id", source.id)
      .eq("asset_type", "concept")
      .order("version_number", { ascending: false })
      .limit(1);

    if (versionError) throw versionError;
    let nextVersion = Number(latestVersions?.[0]?.version_number || 0) + 1;
    const createdAssets = [];
    const providerRequestIds = [];
    const fallbackWarnings = [];

    for (const variant of VARIANTS) {
      const prompt = buildPrompt({
        project,
        description,
        stylePreferences,
        revisionNotes,
        budgetTier,
        variant,
        mode,
        generationMode,
        visionMessage,
        baseConceptCaption: baseConcept?.caption || "",
      });

      let edited;
      let firstError;
      try {
        edited = await editWithImageApi({ imageBuffer, imageType, prompt, width, height });
      } catch (error) {
        firstError = error;
        if (!shouldTryResponsesFallback(error)) throw error;
        edited = await editWithResponsesApi({ imageBuffer, imageType, prompt });
      }

      const resultBuffer = Buffer.from(edited.base64Image, "base64");
      const resultType = detectImageType(resultBuffer);
      if (!resultType) throw new Error("The AI returned an invalid image file.");

      const label = generationMode === "refine" ? variant.refineLabel : variant.initialLabel;
      const resultPath = `${user.id}/${project.id}/concept-${source.id}-${variant.key}-${crypto.randomUUID()}.${resultType.extension}`;

      const { error: uploadError } = await service.storage
        .from("project-vision")
        .upload(resultPath, resultBuffer, {
          contentType: resultType.mime,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      createdStoragePaths.push(resultPath);

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
          width: width || null,
          height: height || null,
          caption: label,
          generation_prompt: prompt,
          revision_notes: generationMode === "refine" ? visionMessage : revisionNotes,
          version_number: nextVersion,
          status: "ready",
        })
        .select("*")
        .single();

      if (assetError || !resultAsset) {
        await service.storage.from("project-vision").remove([resultPath]);
        throw assetError || new Error("A completed concept could not be saved.");
      }

      createdAssetIds.push(resultAsset.id);
      createdAssets.push(resultAsset);
      providerRequestIds.push(edited.requestId || "");
      if (firstError) fallbackWarnings.push(clean(firstError.message, 350));
      nextVersion += 1;
    }

    const firstAsset = createdAssets[0] || null;
    await service
      .from("project_vision_requests")
      .update({
        result_asset_id: firstAsset?.id || null,
        status: "completed",
        provider_request_id: clean(providerRequestIds.filter(Boolean).join(","), 250),
        error_message: fallbackWarnings.length
          ? `Primary editor fallback used: ${clean(fallbackWarnings.join(" | "), 850)}`
          : "",
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return NextResponse.json({
      ok: true,
      requestId,
      generationMode,
      generatedCount: createdAssets.length,
      selectedAssetId: firstAsset?.id || "",
      assets: createdAssets,
    });
  } catch (error) {
    if (service && createdAssetIds.length) {
      try {
        await service.from("project_vision_assets").delete().in("id", createdAssetIds);
      } catch {
        // Best-effort rollback only.
      }
    }
    if (service && createdStoragePaths.length) {
      try {
        await service.storage.from("project-vision").remove(createdStoragePaths);
      } catch {
        // Best-effort rollback only.
      }
    }

    await updateFailedRequest(service, requestId, error).catch(() => null);

    let message = error?.message || "Project Vision could not complete this request.";
    if (/invalid image file or mode/i.test(message)) {
      message =
        "This photo is stored in an incompatible image mode. Delete it, upload the original again, and retry. New uploads are converted to a standard PNG automatically.";
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
