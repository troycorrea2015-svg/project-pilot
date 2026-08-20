import { NextResponse } from "next/server";
import { escapeHtml, requireAdmin, sendEmail } from "../../../../../lib/marketplace-server";

export const runtime = "nodejs";

function clean(value, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const requestId = clean(body.requestId, 120);
    const subject = clean(body.subject, 180);
    const message = clean(body.message, 4000);
    if (!requestId || !subject || !message) {
      return NextResponse.json({ error: "requestId, subject, and message are required." }, { status: 400 });
    }

    const { service } = await requireAdmin(request);
    const { data: permitRequest, error: requestError } = await service
      .from("permit_concierge_requests")
      .select("id,project_id,contact_email,case_number")
      .eq("id", requestId)
      .single();
    if (requestError || !permitRequest) return NextResponse.json({ error: "Permit Concierge request not found." }, { status: 404 });
    if (!permitRequest.contact_email) return NextResponse.json({ sent: false, skipped: true, reason: "No customer email saved." });

    const { data: project } = await service
      .from("projects")
      .select("title")
      .eq("id", permitRequest.project_id)
      .maybeSingle();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const result = await sendEmail({
      to: permitRequest.contact_email,
      subject,
      html: `<h2>Project Pilot permit update</h2>
        <p><strong>${escapeHtml(project?.title || permitRequest.case_number || "Your permit")}</strong></p>
        <p>${escapeHtml(message).replaceAll("\n", "<br/>")}</p>
        <p><a href="${escapeHtml(`${siteUrl}/project/${permitRequest.project_id}?tab=permits`)}">Open your live permit status</a></p>
        <p style="color:#667; font-size:12px">Project Pilot will clearly tell you when an applicant-controlled action is required. If the dashboard says nothing is needed from you, Project Pilot owns the next action.</p>`,
    });

    return NextResponse.json({ sent: !result?.skipped, skipped: Boolean(result?.skipped) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Permit update email could not be sent." }, { status: 500 });
  }
}
