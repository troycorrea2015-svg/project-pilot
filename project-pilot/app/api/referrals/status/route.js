import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/marketplace-server";
import { creditBalanceCents, ensureReferralCode } from "../../../../lib/referrals-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { user, service } = await requireUser(request);
    const code = await ensureReferralCode(service, user.id);
    const [balanceCents, { count: invited }, { count: rewarded }] = await Promise.all([
      creditBalanceCents(service, user.id),
      service.from("referral_attributions").select("id", { count: "exact", head: true }).eq("referrer_user_id", user.id),
      service.from("referral_attributions").select("id", { count: "exact", head: true }).eq("referrer_user_id", user.id).eq("status", "rewarded"),
    ]);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    return NextResponse.json({
      code,
      shareUrl: `${origin}/?ref=${encodeURIComponent(code)}`,
      balanceCents,
      invited: invited || 0,
      rewarded: rewarded || 0,
      rewardCents: 1000,
      friendCreditCents: 1000,
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("referral_codes") || message.includes("permit_service_credit_ledger")) {
      return NextResponse.json({ error: "Project Pilot loyalty migration is missing." }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Referral status could not be loaded." }, { status: 500 });
  }
}
