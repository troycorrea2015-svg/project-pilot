import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const fallbackUrl = "https://qytzrlupvkqdulffnpez.supabase.co";
const fallbackAnon = "sb_publishable_zi6CB203ohT4Qx8GazWqBw_fjsJS51f";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
}

export function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackAnon;
}

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(getSupabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sign in required.");

  const service = getServiceClient();
  const { data, error } = await service.auth.getUser(token);
  if (error || !data?.user) throw new Error("Your sign-in session could not be verified.");
  return { user: data.user, service };
}

async function stripeRequest(path, { method = "POST", body, idempotencyKey } = {}) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body ? body.toString() : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Stripe request failed.");
  return payload;
}

export async function requireAdmin(request) {
  const context = await requireUser(request);
  const { data: profile, error } = await context.service
    .from("profiles")
    .select("is_admin")
    .eq("id", context.user.id)
    .single();
  if (error || !profile?.is_admin) throw new Error("Administrator access required.");
  return context;
}

export async function createStripeCheckoutSession({
  amountCents,
  customerEmail,
  matchId,
  contractorId,
  successUrl,
  cancelUrl,
}) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("payment_method_types[0]", "card");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("customer_email", customerEmail);
  params.set("client_reference_id", matchId);
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(amountCents));
  params.set("line_items[0][price_data][product_data][name]", "Project Pilot qualified introduction");
  params.set("line_items[0][price_data][product_data][description]", "One accepted homeowner project opportunity. Ranking is not affected by payment.");
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[lead_match_id]", matchId);
  params.set("metadata[contractor_id]", contractorId);
  params.set("payment_intent_data[metadata][lead_match_id]", matchId);
  params.set("payment_intent_data[metadata][contractor_id]", contractorId);

  return stripeRequest("checkout/sessions", { method: "POST", body: params });
}

export async function expireStripeCheckoutSession(sessionId) {
  if (!sessionId) return null;
  return stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}/expire`, { method: "POST" });
}

export async function createStripeRefund({ paymentIntentId, amountCents, idempotencyKey }) {
  if (!paymentIntentId) throw new Error("The Stripe payment reference is missing.");
  const params = new URLSearchParams();
  params.set("payment_intent", paymentIntentId);
  if (amountCents) params.set("amount", String(amountCents));
  params.set("metadata[reason]", "Project Pilot approved lead review");
  return stripeRequest("refunds", { method: "POST", body: params, idempotencyKey });
}

function timingSafeEqualHex(left, right) {
  try {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

export function verifyStripeSignature(payload, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));
  if (!timestamp || !signatures.length) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  return signatures.some((signature) => timingSafeEqualHex(signature, expected));
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MARKETPLACE_FROM_EMAIL;
  if (!apiKey || !from || !to) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "Notification email could not be sent.");
  }

  return response.json();
}
