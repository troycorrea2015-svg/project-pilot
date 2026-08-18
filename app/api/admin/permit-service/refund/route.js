import { NextResponse } from "next/server";
import { createStripeRefund, requireAdmin, sendEmail } from "../../../../../lib/marketplace-server";
import { restoreOrderCreditAfterRefund } from "../../../../../lib/referrals-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { orderId, reason = "Customer cancellation before substantive permit coordination work began." } = await request.json();
    if (!orderId) return NextResponse.json({ error: "A permit service order is required." }, { status: 400 });

    const { service } = await requireAdmin(request);
    const { data: order, error: orderError } = await service
      .from("permit_service_orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return NextResponse.json({ error: "Permit service order not found." }, { status: 404 });
    if (order.status === "refunded") return NextResponse.json({ refunded: true, duplicate: true });
    if (order.status !== "paid" || !order.stripe_payment_intent_id) {
      return NextResponse.json({ error: "Only a paid Stripe permit service order can be refunded here." }, { status: 409 });
    }

    const { data: conciergeRequest, error: requestError } = await service
      .from("permit_concierge_requests")
      .select("*")
      .eq("id", order.request_id)
      .single();
    if (requestError || !conciergeRequest) throw requestError || new Error("Permit Concierge request is missing.");

    const refundableAtIntake = ["requested", "intake_review"].includes(conciergeRequest.status) && ["intake", "requested", "intake_review"].includes(conciergeRequest.current_phase || "intake");
    if (!refundableAtIntake) {
      return NextResponse.json({ error: "This case has progressed beyond intake. Review the work performed and refund policy before issuing any adjustment in Stripe." }, { status: 409 });
    }

    const refund = await createStripeRefund({
      paymentIntentId: order.stripe_payment_intent_id,
      amountCents: Number(order.amount_cents || 0),
      idempotencyKey: `project-pilot-permit-refund-${order.id}`,
      reason: "Project Pilot Permit Concierge customer cancellation",
    });

    const now = new Date().toISOString();
    const [{ error: orderUpdateError }, { error: requestUpdateError }, { data: permitCase, error: caseLoadError }] = await Promise.all([
      service.from("permit_service_orders").update({ status: "refunded", refunded_at: now, metadata: { ...(order.metadata || {}), refund_id: refund.id, refund_reason: String(reason).slice(0, 1000) }, updated_at: now }).eq("id", order.id),
      service.from("permit_concierge_requests").update({ payment_status: "refunded", status: "cancelled", current_phase: "cancelled", service_completed_at: now, updated_at: now }).eq("id", order.request_id),
      service.from("permit_cases").select("*").eq("id", order.permit_case_id).single(),
    ]);
    if (orderUpdateError) throw orderUpdateError;
    if (requestUpdateError) throw requestUpdateError;
    if (caseLoadError) throw caseLoadError;

    const activity = Array.isArray(permitCase.activity) ? permitCase.activity : [];
    await service.from("permit_cases").update({
      status: "draft",
      next_action: "Full-Service Permit Concierge was refunded. Continue with guided permit planning or restart service later.",
      activity: [...activity, { id: crypto.randomUUID(), at: now, type: "permit_service_refunded", title: "Permit Concierge refunded", detail: String(reason).slice(0, 1000) }].slice(-100),
      updated_at: now,
    }).eq("id", order.permit_case_id);

    await restoreOrderCreditAfterRefund(service, order);

    await service.from("permit_concierge_tasks").update({ status: "cancelled", updated_at: now }).eq("request_id", order.request_id).in("status", ["pending", "in_progress", "blocked"]);
    await service.from("permit_concierge_events").insert({
      request_id: order.request_id,
      permit_case_id: order.permit_case_id,
      project_id: order.project_id,
      user_id: order.user_id,
      event_type: "service_refunded",
      title: "Full-Service Permit Concierge refunded",
      detail: String(reason).slice(0, 1000),
      source: "project_pilot",
      visible_to_homeowner: true,
      created_by: null,
      created_at: now,
    });

    const customerEmail = conciergeRequest.contact_email;
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: "Project Pilot Permit Concierge refund issued",
        html: `<p>Your Full-Service Permit Concierge coordination fee has been refunded.</p><p>Refund reference: <strong>${refund.id}</strong></p><p>Your Project Pilot project remains available, and you can continue using the guided permit tools.</p>`,
      }).catch(() => null);
    }

    return NextResponse.json({ refunded: true, stripeRefundId: refund.id });
  } catch (error) {
    return NextResponse.json({ error: error.message || "The permit service refund could not be issued." }, { status: 500 });
  }
}
