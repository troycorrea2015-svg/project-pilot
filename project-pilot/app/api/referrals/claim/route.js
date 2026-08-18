import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/marketplace-server";
import { claimReferralCode } from "../../../../lib/referrals-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { user, service } = await requireUser(request);
    const { code } = await request.json();
    const result = await claimReferralCode(service, { userId: user.id, code });
    if (!result.claimed) {
      const messages = {
        invalid: "That referral link is not valid.",
        self: "You cannot refer your own account.",
        missing: "A referral code is required.",
        too_old: "Referral credit is available to new Project Pilot accounts during the first 14 days.",
      };
      return NextResponse.json({ error: messages[result.reason] || "Referral could not be applied." }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("referral_codes") || message.includes("permit_service_credit_ledger")) {
      return NextResponse.json({ error: "Project Pilot loyalty migration is missing. Run RUN_THIS_IN_SUPABASE_4_2_UPGRADE.sql." }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Referral could not be applied." }, { status: 500 });
  }
}
