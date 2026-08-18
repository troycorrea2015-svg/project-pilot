import { NextResponse } from "next/server";
import { getServiceClient, retrieveStripeCheckoutSession } from "../../../../lib/marketplace-server";
import { activatePermitServiceOrder } from "../../../../lib/permit-service-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const fallback = new URL("/dashboard?permit_service=payment_error", url.origin);

  try {
    if (!sessionId) throw new Error("Stripe checkout session is missing.");
    const session = await retrieveStripeCheckoutSession(sessionId);
    if (session?.metadata?.purchase_type !== "permit_service") throw new Error("This checkout is not a permit service purchase.");

    const service = getServiceClient();
    const result = await activatePermitServiceOrder(service, session);
    return NextResponse.redirect(new URL(`/project/${result.projectId}?tab=permits&permit_service=active`, url.origin), 303);
  } catch (error) {
    fallback.searchParams.set("message", String(error?.message || "Permit service payment could not be confirmed.").slice(0, 180));
    return NextResponse.redirect(fallback, 303);
  }
}
