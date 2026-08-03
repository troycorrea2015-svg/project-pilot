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
      marketplacePayments: {
        ready: process.env.MARKETPLACE_PAYMENTS_ENABLED === "true",
        detail: process.env.MARKETPLACE_PAYMENTS_ENABLED === "true" ? "Enabled" : "Off — no automated contractor charges",
        optional: true,
      },
    };

    const critical = [
      checks.productionDomain.ready,
      checks.serviceRole.ready,
      checks.openAI.ready,
      checks.projectVision.ready,
      tables.profiles?.ready,
      tables.projects?.ready,
      tables.project_vision_assets?.ready,
      tables.permit_cases?.ready,
      tables.permit_concierge_requests?.ready,
      tables.launch_support_requests?.ready,
    ];

    return NextResponse.json({
      status: critical.every(Boolean) ? "ready" : "needs_attention",
      version: "3.2-launch-candidate",
      checks,
      tables,
      manualChecks: [
        "Create a new homeowner account and confirm the email redirect returns to projectpiloting.com.",
        "Create a project, sign out, sign back in, and confirm the project is still present.",
        "Ask Su a project-specific question and approve one safe project update.",
        "Generate one Project Vision concept, refine it, favorite it, and delete an unwanted image.",
        "Complete Permit Autopilot intake and submit one Permit Concierge request.",
        "Enable Supabase CAPTCHA and review Auth rate limits before broad advertising.",
        "Configure custom SMTP before sending a large signup campaign.",
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Launch readiness could not be checked." }, { status: 403 });
  }
}
