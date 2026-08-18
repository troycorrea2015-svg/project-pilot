import { NextResponse } from "next/server";
import { expireStripeCheckoutSession, requireUser } from "../../../../../lib/marketplace-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { matchId } = await request.json();
    if (!matchId) return NextResponse.json({ error: "A lead match is required." }, { status: 400 });

    const { user, service } = await requireUser(request);
    const { data: match, error: findError } = await service
      .from("marketplace_lead_matches")
      .select("id, stripe_checkout_session_id, payment_status, status")
      .eq("id", matchId)
      .eq("contractor_id", user.id)
      .single();

    if (findError || !match) return NextResponse.json({ error: "This checkout could not be found." }, { status: 404 });
    if (match.status !== "Offered" || match.payment_status !== "Pending") {
      return NextResponse.json({ error: "This checkout no longer needs to be reset." }, { status: 409 });
    }

    if (match.stripe_checkout_session_id) {
      await expireStripeCheckoutSession(match.stripe_checkout_session_id).catch((error) => {
        if (!String(error.message || "").toLowerCase().includes("expired")) throw error;
      });
    }

    const { data, error } = await service
      .from("marketplace_lead_matches")
      .update({
        payment_status: "Unpaid",
        stripe_checkout_session_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .eq("contractor_id", user.id)
      .eq("status", "Offered")
      .eq("payment_status", "Pending")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "This checkout no longer needs to be reset." }, { status: 409 });
    return NextResponse.json({ reset: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Checkout could not be reset." }, { status: 500 });
  }
}
