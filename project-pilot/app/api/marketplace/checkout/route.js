import { NextResponse } from "next/server";
import { createStripeCheckoutSession, requireUser } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";

export async function POST(request) {
  let service;
  let reservedMatchId;
  let contractorId;

  try {
    if (process.env.MARKETPLACE_PAYMENTS_ENABLED !== "true") {
      return NextResponse.json({ error: "Marketplace payments are not enabled yet." }, { status: 503 });
    }

    const { matchId } = await request.json();
    if (!matchId) return NextResponse.json({ error: "A lead match is required." }, { status: 400 });

    const auth = await requireUser(request);
    service = auth.service;
    contractorId = auth.user.id;

    const [{ data: match, error: matchError }, { data: contractor, error: contractorError }] = await Promise.all([
      service
        .from("marketplace_lead_matches")
        .select("id, lead_request_id, contractor_id, fee_cents, status, payment_status")
        .eq("id", matchId)
        .single(),
      service
        .from("contractor_profiles")
        .select("user_id, active, verification_status, terms_accepted_at")
        .eq("user_id", contractorId)
        .maybeSingle(),
    ]);

    if (matchError || !match) return NextResponse.json({ error: "This opportunity could not be found." }, { status: 404 });
    if (match.contractor_id !== contractorId) return NextResponse.json({ error: "This opportunity is not assigned to your account." }, { status: 403 });
    if (contractorError || !contractor) return NextResponse.json({ error: "Complete your contractor profile before accepting opportunities." }, { status: 409 });
    if (!contractor.active || contractor.verification_status !== "Verified") {
      return NextResponse.json({ error: "Your contractor profile must be active and verified before accepting paid introductions." }, { status: 403 });
    }
    if (!contractor.terms_accepted_at) return NextResponse.json({ error: "Accept the contractor partner terms before continuing." }, { status: 403 });
    if (!Number.isInteger(match.fee_cents) || match.fee_cents <= 0) return NextResponse.json({ error: "This opportunity does not have a valid introduction fee." }, { status: 409 });
    if (match.status !== "Offered" || match.payment_status !== "Unpaid") {
      return NextResponse.json({ error: "This opportunity is no longer available for checkout." }, { status: 409 });
    }

    const { data: leadRequest } = await service
      .from("marketplace_lead_requests")
      .select("id, status")
      .eq("id", match.lead_request_id)
      .maybeSingle();
    if (!leadRequest || !["Open", "Matched"].includes(leadRequest.status)) {
      return NextResponse.json({ error: "The homeowner request is no longer open." }, { status: 409 });
    }

    // Reserve this opportunity before creating a Stripe session. This prevents
    // double-clicks or duplicate browser requests from creating duplicate charges.
    const { data: reserved, error: reserveError } = await service
      .from("marketplace_lead_matches")
      .update({ payment_status: "Pending", updated_at: new Date().toISOString() })
      .eq("id", match.id)
      .eq("contractor_id", contractorId)
      .eq("status", "Offered")
      .eq("payment_status", "Unpaid")
      .select("id")
      .maybeSingle();

    if (reserveError) throw reserveError;
    if (!reserved) return NextResponse.json({ error: "Checkout is already open for this opportunity. Refresh your lead inbox." }, { status: 409 });
    reservedMatchId = match.id;

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await createStripeCheckoutSession({
      amountCents: match.fee_cents,
      customerEmail: auth.user.email,
      matchId: match.id,
      contractorId,
      successUrl: `${origin}/contractor?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/contractor?payment=cancelled&match_id=${match.id}`,
    });

    const { error: updateError } = await service
      .from("marketplace_lead_matches")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id)
      .eq("contractor_id", contractorId)
      .eq("payment_status", "Pending");

    if (updateError) throw updateError;
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (service && reservedMatchId && contractorId) {
      try {
        await service
          .from("marketplace_lead_matches")
          .update({ payment_status: "Unpaid", stripe_checkout_session_id: null, updated_at: new Date().toISOString() })
          .eq("id", reservedMatchId)
          .eq("contractor_id", contractorId)
          .eq("status", "Offered")
          .eq("payment_status", "Pending");
      } catch {
        // The original checkout error is more useful to the caller.
      }
    }
    return NextResponse.json({ error: error.message || "Checkout could not be started." }, { status: 500 });
  }
}
