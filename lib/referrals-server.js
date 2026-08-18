import crypto from "crypto";

export const REFERRAL_WELCOME_CREDIT_CENTS = 1000;
export const REFERRAL_REWARD_CENTS = 1000;

export function referralMaxCreditCents() {
  const configured = Number.parseInt(process.env.PERMIT_CONCIERGE_MAX_CREDIT_CENTS || "4000", 10);
  return Number.isInteger(configured) && configured >= 0 ? configured : 4000;
}

export async function creditBalanceCents(service, userId) {
  const { data, error } = await service
    .from("permit_service_credit_ledger")
    .select("amount_cents")
    .eq("user_id", userId);
  if (error) {
    if (String(error.message || "").includes("permit_service_credit_ledger")) return 0;
    throw error;
  }
  return (data || []).reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
}

export async function ensureReferralCode(service, userId) {
  const { data: existing, error: existingError } = await service
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `PP${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const { data, error } = await service
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("code")
      .single();
    if (!error && data?.code) return data.code;
    if (error?.code !== "23505") throw error;
  }
  throw new Error("A referral code could not be created. Try again.");
}

export async function claimReferralCode(service, { userId, code }) {
  const normalized = String(code || "").trim().toUpperCase().slice(0, 40);
  if (!normalized) return { claimed: false, reason: "missing" };

  const { data: existingAttribution, error: existingAttributionError } = await service
    .from("referral_attributions")
    .select("*")
    .eq("referred_user_id", userId)
    .maybeSingle();
  if (existingAttributionError) throw existingAttributionError;
  if (existingAttribution) return { claimed: true, alreadyClaimed: true, attribution: existingAttribution };

  const { data: authUserResult } = await service.auth.admin.getUserById(userId);
  const createdAt = authUserResult?.user?.created_at ? new Date(authUserResult.user.created_at).getTime() : 0;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (createdAt && Date.now() - createdAt > fourteenDays) return { claimed: false, reason: "too_old" };

  const { data: referralCode, error: codeError } = await service
    .from("referral_codes")
    .select("user_id, code")
    .eq("code", normalized)
    .maybeSingle();
  if (codeError) throw codeError;
  if (!referralCode) return { claimed: false, reason: "invalid" };
  if (referralCode.user_id === userId) return { claimed: false, reason: "self" };

  const { data: attribution, error: attributionError } = await service
    .from("referral_attributions")
    .insert({
      referred_user_id: userId,
      referrer_user_id: referralCode.user_id,
      referral_code: referralCode.code,
      status: "signed_up",
      referred_credit_cents: REFERRAL_WELCOME_CREDIT_CENTS,
      referrer_reward_cents: REFERRAL_REWARD_CENTS,
    })
    .select("*")
    .single();
  if (attributionError) {
    if (attributionError.code === "23505") return { claimed: true, alreadyClaimed: true };
    throw attributionError;
  }

  const { error: creditError } = await service.from("permit_service_credit_ledger").insert({
    user_id: userId,
    amount_cents: REFERRAL_WELCOME_CREDIT_CENTS,
    reason: "Referral welcome credit",
    idempotency_key: `referral-welcome:${attribution.id}`,
    related_user_id: referralCode.user_id,
    metadata: { referral_code: referralCode.code },
  });
  if (creditError && creditError.code !== "23505") throw creditError;

  return { claimed: true, attribution, creditCents: REFERRAL_WELCOME_CREDIT_CENTS };
}

export async function reserveOrderCredit(service, order, creditCents) {
  const amount = Math.max(0, Number(creditCents || order?.metadata?.credit_applied_cents || 0));
  if (!amount) return 0;
  const { error } = await service.from("permit_service_credit_ledger").insert({
    user_id: order.user_id,
    amount_cents: -amount,
    reason: "Permit Concierge credit reserved",
    idempotency_key: `permit-credit-reserve:${order.id}`,
    related_order_id: order.id,
    metadata: { base_price_cents: Number(order?.metadata?.base_price_cents || 0) },
  });
  if (error && error.code !== "23505") throw error;
  return amount;
}

export async function releasePendingOrderCredit(service, order, reason = "Permit Concierge checkout cancelled — credit released") {
  const amount = Math.max(0, Number(order?.metadata?.credit_applied_cents || 0));
  if (!amount) return 0;
  const { error } = await service.from("permit_service_credit_ledger").insert({
    user_id: order.user_id,
    amount_cents: amount,
    reason,
    idempotency_key: `permit-credit-release:${order.id}`,
    related_order_id: order.id,
  });
  if (error && error.code !== "23505") throw error;
  return amount;
}

export async function rewardReferrerForPaidOrder(service, order) {
  const { data: attribution, error } = await service
    .from("referral_attributions")
    .select("*")
    .eq("referred_user_id", order.user_id)
    .maybeSingle();
  if (error) {
    if (String(error.message || "").includes("referral_attributions")) return null;
    throw error;
  }
  if (!attribution || attribution.status === "rewarded") return attribution;

  const now = new Date().toISOString();
  const { error: ledgerError } = await service.from("permit_service_credit_ledger").insert({
    user_id: attribution.referrer_user_id,
    amount_cents: Number(attribution.referrer_reward_cents || REFERRAL_REWARD_CENTS),
    reason: "Referral reward",
    idempotency_key: `referral-reward:${attribution.id}:${order.id}`,
    related_user_id: order.user_id,
    related_order_id: order.id,
    metadata: { referral_code: attribution.referral_code },
  });
  if (ledgerError && ledgerError.code !== "23505") throw ledgerError;

  const { data: updated, error: updateError } = await service
    .from("referral_attributions")
    .update({ status: "rewarded", qualified_order_id: order.id, qualified_at: now, rewarded_at: now })
    .eq("id", attribution.id)
    .select("*")
    .single();
  if (updateError) throw updateError;
  return updated;
}

export async function restoreOrderCreditAfterRefund(service, order) {
  const used = Number(order?.metadata?.credit_applied_cents || 0);
  if (used > 0) {
    const { error } = await service.from("permit_service_credit_ledger").insert({
      user_id: order.user_id,
      amount_cents: used,
      reason: "Permit Concierge refund — credit restored",
      idempotency_key: `permit-credit-refund:${order.id}`,
      related_order_id: order.id,
    });
    if (error && error.code !== "23505") throw error;
  }

  const { data: attribution } = await service
    .from("referral_attributions")
    .select("*")
    .eq("qualified_order_id", order.id)
    .eq("status", "rewarded")
    .maybeSingle();
  if (!attribution) return;

  const reward = Number(attribution.referrer_reward_cents || REFERRAL_REWARD_CENTS);
  const { error: reverseError } = await service.from("permit_service_credit_ledger").insert({
    user_id: attribution.referrer_user_id,
    amount_cents: -reward,
    reason: "Referral reward reversed after refunded order",
    idempotency_key: `referral-reward-reverse:${attribution.id}:${order.id}`,
    related_user_id: order.user_id,
    related_order_id: order.id,
  });
  if (reverseError && reverseError.code !== "23505") throw reverseError;

  await service.from("referral_attributions").update({ status: "signed_up", qualified_order_id: null, qualified_at: null, rewarded_at: null, reversed_at: new Date().toISOString() }).eq("id", attribution.id);
}
