import { NextResponse } from "next/server";
import { escapeHtml, requireUser, sendEmail } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";

function clean(value, max = 3000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request) {
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json();
    const requestId = clean(body.requestId, 120);
    const message = clean(body.message, 3000);
    if (!requestId || !message) return NextResponse.json({ error: "Permit request and message are required." }, { status: 400 });

    const { data: permitRequest, error } = await service
      .from("permit_concierge_requests")
      .select("id,project_id,user_id,case_number")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .single();
    if (error || !permitRequest) return NextResponse.json({ error: "Permit request not found." }, { status: 404 });

    const adminEmail = process.env.PERMIT_CONCIERGE_EMAIL;
    if (!adminEmail) return NextResponse.json({ sent: false, skipped: true });

    const { data: project } = await service.from("projects").select("title,address,location_label").eq("id", permitRequest.project_id).maybeSingle();
    const result = await sendEmail({
      to: adminEmail,
      subject: `Customer permit message — ${permitRequest.case_number || project?.title || "Project Pilot case"}`,
      html: `<h2>New homeowner message</h2>
        <p><strong>Project:</strong> ${escapeHtml(project?.title || "Untitled project")}</p>
        <p><strong>Property:</strong> ${escapeHtml(project?.address || project?.location_label || "Not saved")}</p>
        <p><strong>Customer:</strong> ${escapeHtml(user.email || user.id)}</p>
        <p>${escapeHtml(message).replaceAll("\n", "<br/>")}</p>
        <p>Open the Permit Concierge workbench to respond.</p>`,
    });

    return NextResponse.json({ sent: !result?.skipped, skipped: Boolean(result?.skipped) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Permit message notification could not be sent." }, { status: 500 });
  }
}
