import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function tableCheck(service, table) {
  const { error } = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
  return { ready: !error, detail: error ? error.message : "Connected" };
}

export async function GET(request) {
  try {
    const { service } = await requireAdmin(request);
    const tableNames = [
      "profiles",
      "projects",
      "project_vision_assets",
      "project_vision_requests",
      "permit_cases",
      "permit_concierge_requests",
      "permit_concierge_tasks",
      "permit_concierge_messages",
      "permit_application_exports",
      "permit_service_authorizations",
      "permit_concierge_events",
      "permit_concierge_corrections",
      "permit_concierge_inspections",
      "permit_jurisdiction_playbooks",
      "permit_service_orders",
      "referral_codes",
      "referral_attributions",
      "permit_service_credit_ledger",
      "contractor_profiles",
      "marketplace_lead_requests",
      "marketplace_lead_matches",
      "launch_support_requests",
    ];
    const tableResults = await Promise.all(tableNames.map(async (name) => [name, await tableCheck(service, name)]));
    const tables = Object.fromEntries(tableResults);

    const checks = {
      productionDomain: {
        ready: /^https:\/\/(www\.)?projectpiloting\.com\/?$/i.test(process.env.NEXT_PUBLIC_SITE_URL || ""),
        detail: process.env.NEXT_PUBLIC_SITE_URL || "NEXT_PUBLIC_SITE_URL is missing",
      },
      serviceRole: { ready: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), detail: "Required for protected server actions" },
      openAI: { ready: Boolean(process.env.OPENAI_API_KEY), detail: "Required for Su and Project Vision" },
      projectVision: { ready: process.env.PROJECT_VISION_ENABLED !== "false", detail: `Daily request limit: ${process.env.PROJECT_VISION_DAILY_LIMIT || "5"}` },
      assistantLimit: { ready: true, detail: `Daily question limit: ${process.env.PROJECT_ASSISTANT_DAILY_LIMIT || "50"}` },
      supportEmail: { ready: Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL), detail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "Optional; in-app support still works" },
      stripeSecret: {
        ready: Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")),
        detail: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "Stripe live key configured" : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "Stripe TEST key configured — switch to live before charging customers" : "STRIPE_SECRET_KEY is missing",
      },
      stripeWebhook: { ready: Boolean(process.env.STRIPE_WEBHOOK_SECRET), detail: process.env.STRIPE_WEBHOOK_SECRET ? "Webhook signature verification configured" : "STRIPE_WEBHOOK_SECRET is missing" },
      permitServicePayments: {
        ready: process.env.PERMIT_SERVICE_PAYMENTS_ENABLED === "true",
        detail: process.env.PERMIT_SERVICE_PAYMENTS_ENABLED === "true" ? `Enabled at $${(Number.parseInt(process.env.PERMIT_CONCIERGE_PRICE_CENTS || "9900", 10) / 100).toFixed(2)}` : "Off — paid Permit Concierge checkout is disabled",
      },
      marketplacePayments: {
        ready: process.env.MARKETPLACE_PAYMENTS_ENABLED === "true",
        detail: process.env.MARKETPLACE_PAYMENTS_ENABLED === "true" ? "Contractor introduction charges enabled" : "Off — contractor lead charges remain disabled",
        optional: true,
      },
      outboundEmail: {
        ready: Boolean(process.env.RESEND_API_KEY && process.env.MARKETPLACE_FROM_EMAIL),
        detail: process.env.RESEND_API_KEY && process.env.MARKETPLACE_FROM_EMAIL ? "Outbound service email configured" : "RESEND_API_KEY and MARKETPLACE_FROM_EMAIL are required for paid-service notifications",
      },
      permitInbox: { ready: Boolean(process.env.PERMIT_CONCIERGE_EMAIL), detail: process.env.PERMIT_CONCIERGE_EMAIL || "Set the inbox that will operate paid permit cases" },
    };

    const critical = [
      checks.productionDomain.ready,
      checks.serviceRole.ready,
      checks.openAI.ready,
      checks.projectVision.ready,
      checks.stripeSecret.ready,
      checks.stripeWebhook.ready,
      checks.permitServicePayments.ready,
      checks.outboundEmail.ready,
      checks.permitInbox.ready,
      tables.profiles?.ready,
      tables.projects?.ready,
      tables.project_vision_assets?.ready,
      tables.permit_cases?.ready,
      tables.permit_concierge_requests?.ready,
      tables.permit_service_authorizations?.ready,
      tables.permit_service_orders?.ready,
      tables.referral_codes?.ready,
      tables.referral_attributions?.ready,
      tables.permit_service_credit_ledger?.ready,
      tables.launch_support_requests?.ready,
    ];

    return NextResponse.json({
      status: critical.every(Boolean) ? "ready" : "needs_attention",
      version: "4.5-consumer-command-center",
      checks,
      tables,
      manualChecks: [
        "Create a new homeowner account and confirm the email redirect returns to projectpiloting.com.",
        "Create a project, sign out, sign back in, and confirm the project is still present.",
        "Ask Su a project-specific question and approve one safe project update.",
        "Generate one Project Vision concept, refine it, favorite it, and delete an unwanted image.",
        "Confirm the free permit path works, then complete one Stripe TEST $99-base-price Permit Concierge checkout and confirm the permit service activates only after payment confirmation.",
        "Confirm the paid permit order appears in Admin Financials and the Permit Concierge workbench.",
        "Create a referral link, claim it with a new account, confirm $10 credit at checkout, and confirm the referrer reward after payment.",
        "While a paid test case is still at intake, run the Admin intake refund and confirm Stripe and the case both show the refund/cancellation.",
        "Complete one contractor lead checkout in Stripe TEST mode if contractor marketplace payments will be enabled at launch.",
        "Before charging real customers, replace Stripe test keys with live keys and update the live webhook endpoint.",
        "Enable Supabase CAPTCHA and review Auth rate limits before broad advertising.",
        "Configure custom SMTP/Resend and the Permit Concierge operating inbox before broad paid-service advertising.",
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Launch readiness could not be checked." }, { status: 403 });
  }
}
