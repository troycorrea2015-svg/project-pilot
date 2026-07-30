import { NextResponse } from "next/server";
import { escapeHtml, requireUser, sendEmail } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { leadRequestId } = await request.json();
    const { user, service } = await requireUser(request);

    const { data: lead, error: leadError } = await service
      .from("marketplace_lead_requests")
      .select("id, homeowner_id, project_title, project_type, county, zip_code")
      .eq("id", leadRequestId)
      .eq("homeowner_id", user.id)
      .single();

    if (leadError || !lead) return NextResponse.json({ error: "Lead request not found." }, { status: 404 });

    const { data: matches, error: matchError } = await service
      .from("marketplace_lead_matches")
      .select("id, fee_cents, contractor_id")
      .eq("lead_request_id", lead.id);

    if (matchError) throw matchError;

    const contractorIds = (matches || []).map((item) => item.contractor_id);
    const { data: usersData } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const userMap = new Map((usersData?.users || []).map((item) => [item.id, item.email]));
    const { data: profiles } = contractorIds.length
      ? await service.from("contractor_profiles").select("user_id, business_name").in("user_id", contractorIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map((item) => [item.user_id, item]));
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    await Promise.all((matches || []).map((match) => {
      const email = userMap.get(match.contractor_id);
      const business = profileMap.get(match.contractor_id)?.business_name || "Contractor partner";
      if (!email) return null;
      return sendEmail({
        to: email,
        subject: `New Project Pilot opportunity: ${lead.project_title}`,
        html: `<p>Hello ${escapeHtml(business)},</p><p>A homeowner requested an introduction for a <strong>${escapeHtml(lead.project_type)}</strong> project in ${escapeHtml(lead.county || lead.zip_code || "your service area")}.</p><p>The qualified introduction fee is <strong>$${(match.fee_cents / 100).toFixed(0)}</strong> and is shown before you accept. Payment does not affect Best Match ranking.</p><p><a href="${escapeHtml(origin)}/contractor">Review the opportunity</a></p>`,
      }).catch(() => null);
    }));

    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Notifications could not be sent." }, { status: 500 });
  }
}
