import { NextResponse } from "next/server";
import { createStripeRefund, requireAdmin } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { creditId } = await request.json();
    if (!creditId) return NextResponse.json({ error: "A lead review is required." }, { status: 400 });

    const { service } = await requireAdmin(request);
    const { data: credit, error: creditError } = await service
      .from("marketplace_lead_credits")
      .select("id, status, lead_match_id, marketplace_lead_matches(id, payment_status, paid_amount_cents, stripe_payment_intent_id)")
      .eq("id", creditId)
      .single();

    if (creditError || !credit) return NextResponse.json({ error: "Lead review not found." }, { status: 404 });
    const match = credit.marketplace_lead_matches;
    if (!match) return NextResponse.json({ error: "The related payment record is missing." }, { status: 409 });
    if (credit.status === "Issued" || ["Refunded", "Credited"].includes(match.payment_status)) {
      return NextResponse.json({ issued: true, duplicate: true });
    }

    let paymentStatus = "Credited";
    let stripeRefundId = null;
    if (match.payment_status === "Paid") {
      const refund = await createStripeRefund({
        paymentIntentId: match.stripe_payment_intent_id,
        amountCents: Number(match.paid_amount_cents || 0),
        idempotencyKey: `project-pilot-credit-${credit.id}`,
      });
      stripeRefundId = refund.id;
      paymentStatus = "Refunded";
    }

    const now = new Date().toISOString();
    const [{ error: matchError }, { error: updateCreditError }] = await Promise.all([
      service.from("marketplace_lead_matches").update({ payment_status: paymentStatus, updated_at: now }).eq("id", match.id),
      service.from("marketplace_lead_credits").update({ status: "Issued", admin_notes: stripeRefundId ? `Stripe refund ${stripeRefundId}` : "Account credit approved", updated_at: now }).eq("id", credit.id),
    ]);

    if (matchError) throw matchError;
    if (updateCreditError) throw updateCreditError;
    return NextResponse.json({ issued: true, paymentStatus, stripeRefundId });
  } catch (error) {
    return NextResponse.json({ error: error.message || "The refund or credit could not be issued." }, { status: 500 });
  }
}
