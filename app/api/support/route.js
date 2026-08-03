import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["General","Account","Project Assistant","Project Vision","Permit Autopilot","Permit Concierge","Contractors","Billing","Bug"]);
function clean(value, max) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function POST(request) {
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json();
    const subject = clean(body.subject, 160);
    const message = clean(body.message, 5000);
    const category = CATEGORIES.has(body.category) ? body.category : "General";
    const projectId = clean(body.projectId, 80) || null;
    const pagePath = clean(body.pagePath, 500);

    if (subject.length < 3 || message.length < 10) {
      return NextResponse.json({ error: "Add a short subject and at least 10 characters describing what happened." }, { status: 400 });
    }

    const dayStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await service
      .from("launch_support_requests")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", user.id)
      .gte("created_at", dayStart);
    if (countError) throw countError;
    if (Number(count || 0) >= 5) {
      return NextResponse.json({ error: "You have reached the support-request limit for today. Add details to your most recent request instead of creating duplicates." }, { status: 429 });
    }

    const { data, error } = await service
      .from("launch_support_requests")
      .insert({
        user_id: user.id,
        project_id: projectId,
        user_email: user.email || "",
        category,
        subject,
        message,
        page_path: pagePath,
      })
      .select("id,status,created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, request: data });
  } catch (error) {
    const missing = String(error.message || "").includes("launch_support_requests");
    return NextResponse.json(
      { error: missing ? "Launch support is not installed yet. Run Supabase migration 014." : error.message || "The support request could not be created." },
      { status: missing ? 503 : 500 }
    );
  }
}
