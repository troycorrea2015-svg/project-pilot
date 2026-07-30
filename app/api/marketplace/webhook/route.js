import { NextResponse } from "next/server";
import { escapeHtml, getServiceClient, sendEmail, verifyStripeSignature } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";

export async function POST(request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    const event = JSON.parse(payload);
    const service = getServiceClient();

    const { data: existing } = await service
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing) return NextResponse.json({ received: true, duplicate: true });

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const matchId = session.metadata?.lead_match_id || session.client_reference_id;
      const contractorId = session.metadata?.contractor_id;

      if (!matchId || !contractorId) throw new Error("Stripe checkout metadata is incomplete.");
      if (session.payment_status !== "paid") throw new Error("Stripe has not confirmed payment for this checkout session.");
      if (String(session.currency || "").toLowerCase() !== "usd") throw new Error("Unexpected checkout currency.");

      const { data: currentMatch, error: currentMatchError } = await service
        .from("marketplace_lead_matches")
        .select("id, lead_request_id, contractor_id, fee_cents, status, payment_status")
        .eq("id", matchId)
        .eq("contractor_id", contractorId)
        .maybeSingle();
      if (currentMatchError) throw currentMatchError;
      if (!currentMatch) throw new Error("The paid Project Pilot opportunity could not be found.");
      if (Number(session.amount_total || 0) !== Number(currentMatch.fee_cents || 0)) {
        throw new Error("Stripe payment amount does not match the introduction fee.");
      }

      // A duplicate completion for an already-paid match is safe to acknowledge.
      if (!(currentMatch.status === "Accepted" && currentMatch.payment_status === "Paid")) {
        if (currentMatch.status !== "Offered" || currentMatch.payment_status !== "Pending") {
          throw new Error("The opportunity is not in a payable state.");
        }

        const { data: match, error: matchError } = await service
          .from("marketplace_lead_matches")
          .update({
            status: "Accepted",
            payment_status: "Paid",
            paid_amount_cents: Number(session.amount_total || 0),
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchId)
          .eq("contractor_id", contractorId)
          .eq("status", "Offered")
          .eq("payment_status", "Pending")
          .select("id, lead_request_id, contractor_id")
          .maybeSingle();

        if (matchError) throw matchError;
        if (!match) throw new Error("The paid opportunity could not be finalized.");

        await service
          .from("marketplace_lead_requests")
          .update({ status: "Matched", updated_at: new Date().toISOString() })
          .eq("id", match.lead_request_id)
          .eq("status", "Open");

        const [{ data: requestData }, { data: contractorData }, { data: contactData }] = await Promise.all([
          service.from("marketplace_lead_requests").select("project_title, homeowner_id").eq("id", match.lead_request_id).single(),
          service.from("contractor_profiles").select("business_name").eq("user_id", contractorId).single(),
          service.from("marketplace_lead_contacts").select("contact_email, contact_name").eq("lead_request_id", match.lead_request_id).single(),
        ]);

        if (contactData?.contact_email) {
          await sendEmail({
            to: contactData.contact_email,
            subject: "A contractor accepted your Project Pilot request",
            html: `<p>Hello ${escapeHtml(contactData.contact_name || "there")},</p><p><strong>${escapeHtml(contractorData?.business_name || "A matched contractor")}</strong> accepted your request for <strong>${escapeHtml(requestData?.project_title || "your project")}</strong>.</p><p>The contractor now has the contact information you provided and may contact you directly.</p>`,
          }).catch(() => null);
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data?.object || {};
      const matchId = session.metadata?.lead_match_id || session.client_reference_id;
      if (matchId) {
        await service
          .from("marketplace_lead_matches")
          .update({ payment_status: "Unpaid", stripe_checkout_session_id: null, updated_at: new Date().toISOString() })
          .eq("id", matchId)
          .eq("status", "Offered")
          .eq("payment_status", "Pending");
      }
    }

    const { error: eventInsertError } = await service
      .from("stripe_webhook_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (eventInsertError && eventInsertError.code !== "23505") throw eventInsertError;

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Webhook processing failed." }, { status: 500 });
  }
}
