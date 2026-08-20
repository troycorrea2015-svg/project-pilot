import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Project Pilot 4.5 keeps the pre-payment Sprint 3.1C concierge intake route retired.
// Full-Service Permit Concierge must start through /api/permit-service/start so
// Stripe confirmation, authorization, revenue accounting, and the operating
// workflow are created as one auditable transaction.
export async function POST() {
  return NextResponse.json(
    {
      error: "This legacy Permit Concierge intake route has been retired. Start Full-Service Permit Concierge from the project's Permits workspace to use secure checkout.",
      code: "PERMIT_CONCIERGE_LEGACY_ROUTE_RETIRED",
    },
    { status: 410 }
  );
}
