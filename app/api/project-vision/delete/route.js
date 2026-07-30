import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value, maximum = 100) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function POST(request) {
  try {
    const { service, user } = await requireUser(request);
    const body = await request.json();
    const projectId = clean(body.projectId, 80);
    const assetId = clean(body.assetId, 80);

    if (!projectId || !assetId) {
      return NextResponse.json({ error: "Choose an image to remove." }, { status: 400 });
    }

    const { data: project, error: projectError } = await service
      .from("projects")
      .select("id,user_id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "That project could not be opened." }, { status: 404 });
    }

    const { data: asset, error: assetError } = await service
      .from("project_vision_assets")
      .select("id,project_id,user_id,asset_type,storage_path")
      .eq("id", assetId)
      .eq("project_id", project.id)
      .single();

    if (assetError || !asset || asset.user_id !== user.id) {
      return NextResponse.json({ error: "That image could not be found in this project." }, { status: 404 });
    }

    let relatedConcepts = [];
    if (asset.asset_type === "source") {
      const { data, error } = await service
        .from("project_vision_assets")
        .select("id,storage_path")
        .eq("project_id", project.id)
        .eq("source_asset_id", asset.id)
        .eq("asset_type", "concept");

      if (error) throw error;
      relatedConcepts = data || [];
    }

    const removedIds = [...relatedConcepts.map((item) => item.id), asset.id];
    const storagePaths = [...relatedConcepts.map((item) => item.storage_path), asset.storage_path]
      .filter(Boolean);

    if (relatedConcepts.length) {
      const { error: conceptDeleteError } = await service
        .from("project_vision_assets")
        .delete()
        .in("id", relatedConcepts.map((item) => item.id));

      if (conceptDeleteError) throw conceptDeleteError;
    }

    const { error: assetDeleteError } = await service
      .from("project_vision_assets")
      .delete()
      .eq("id", asset.id)
      .eq("project_id", project.id);

    if (assetDeleteError) throw assetDeleteError;

    let warning = "";
    if (storagePaths.length) {
      const { error: storageError } = await service.storage
        .from("project-vision")
        .remove(storagePaths);

      if (storageError) {
        warning = "The image was removed from the project. A background storage copy may require administrator cleanup.";
      }
    }

    return NextResponse.json({
      ok: true,
      removedIds,
      warning,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "The image could not be removed." },
      { status: 500 }
    );
  }
}
