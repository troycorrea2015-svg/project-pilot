import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({
      siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      paymentsEnabled: process.env.MARKETPLACE_PAYMENTS_ENABLED === "true",
      permitPaymentsEnabled: process.env.PERMIT_SERVICE_PAYMENTS_ENABLED === "true",
      permitPriceCents: Number.parseInt(process.env.PERMIT_CONCIERGE_PRICE_CENTS || "9900", 10),
      emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MARKETPLACE_FROM_EMAIL),
      permitInboxConfigured: Boolean(process.env.PERMIT_CONCIERGE_EMAIL),
      mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "Live" : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "Test" : "Not configured",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Launch status could not be loaded." }, { status: 403 });
  }
}
