import { escapeHtml, sendEmail } from "./marketplace-server";
import { releasePendingOrderCredit, reserveOrderCredit, rewardReferrerForPaidOrder } from "./referrals-server";

export const PERMIT_SERVICE_CODE = "full_service_permit_coordination";

export function permitServicePriceCents() {
  const configured = Number.parseInt(process.env.PERMIT_CONCIERGE_PRICE_CENTS || "9900", 10);
  return Number.isInteger(configured) && configured >= 5000 ? configured : 9900;
}

export function permitServicePaymentsEnabled() {
  return process.env.PERMIT_SERVICE_PAYMENTS_ENABLED === "true";
}

export function stableCaseNumber(permitCaseId) {
  const today = new Date();
  const stamp = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, "0")}${String(today.getUTCDate()).padStart(2, "0")}`;
  return `PP-${stamp}-${String(permitCaseId || "").replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export async function activatePermitServiceOrder(service, session) {
  const orderId = session?.metadata?.permit_order_id || session?.client_reference_id;
  if (!orderId) throw new Error("Permit service order metadata is incomplete.");
  if (session.payment_status !== "paid") throw new Error("Stripe has not confirmed payment for this permit service.");
  if (String(session.currency || "").toLowerCase() !== "usd") throw new Error("Unexpected permit service checkout currency.");

  const { data: order, error: orderError } = await service
    .from("permit_service_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error("The Project Pilot permit service order could not be found.");
  if (Number(session.amount_total || 0) !== Number(order.amount_cents || 0)) {
    throw new Error("Stripe payment amount does not match the permit service order.");
  }

  const now = new Date().toISOString();
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : null;

  const { data: existingRequest, error: existingRequestError } = await service
    .from("permit_concierge_requests")
    .select("*")
    .eq("id", order.request_id)
    .single();
  if (existingRequestError || !existingRequest) throw existingRequestError || new Error("The Permit Concierge request could not be found.");

  if (order.status !== "paid") {
    const { error: paymentError } = await service
      .from("permit_service_orders")
      .update({
        status: "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntent,
        paid_at: now,
        updated_at: now,
      })
      .eq("id", order.id);
    if (paymentError) throw paymentError;
  }

  const { data: request, error: requestError } = await service
    .from("permit_concierge_requests")
    .update({
      payment_status: "paid",
      service_fee_cents: order.amount_cents,
      revenue_order_id: order.id,
      paid_at: order.paid_at || now,
      status: "requested",
      current_phase: "intake",
      service_started_at: existingRequest.service_started_at || now,
      updated_at: now,
    })
    .eq("id", order.request_id)
    .select("*")
    .single();
  if (requestError) throw requestError;

  const { data: permitCase, error: caseError } = await service
    .from("permit_cases")
    .select("*")
    .eq("id", order.permit_case_id)
    .single();
  if (caseError) throw caseError;

  const activity = Array.isArray(permitCase.activity) ? permitCase.activity : [];
  const hasStartEvent = activity.some((item) => item?.type === "full_service_paid");
  const nextActivity = hasStartEvent
    ? activity
    : [
        ...activity,
        {
          id: crypto.randomUUID(),
          at: now,
          type: "full_service_paid",
          title: "Full-service Permit Concierge activated",
          detail: "Payment was confirmed and Project Pilot began the full-service permit operations workflow.",
        },
      ].slice(-100);

  const { error: caseUpdateError } = await service
    .from("permit_cases")
    .update({
      status: "concierge_requested",
      concierge_requested_at: permitCase.concierge_requested_at || now,
      submission_method: "Full-service Permit Concierge",
      next_action: "Project Pilot is verifying the permit route and required application package.",
      activity: nextActivity,
      updated_at: now,
    })
    .eq("id", permitCase.id);
  if (caseUpdateError) throw caseUpdateError;

  const { count: existingTaskCount, error: taskCountError } = await service
    .from("permit_concierge_tasks")
    .select("id", { count: "exact", head: true })
    .eq("request_id", request.id);
  if (taskCountError) throw taskCountError;

  if (!existingTaskCount) {
    const taskDefinitions = [
      ["Verify jurisdiction and filing authority", "Confirm the county, municipality, state office, and any overlapping approvals that control this project."],
      ["Review the saved project scope", "Check the property, project description, dimensions, trades, and missing facts before preparing forms."],
      ["Build the official requirements list", "Identify applications, plans, supporting documents, government fees, signatures, and applicant-controlled requirements."],
      ["Prepare the application information", "Complete and organize the permit application fields using the homeowner's saved Project Pilot information."],
      ["Prepare the submission package", "Organize and name the required documents and verify that the packet is ready for the filing route."],
      ["Confirm what Project Pilot may file", "Verify whether Project Pilot can submit or coordinate the filing or whether the applicant must complete a portal-controlled step."],
      ["Coordinate the official submission", "Handle permitted administrative filing steps and record the government reference number and fee requirements."],
      ["Monitor and manage corrections", "Track reviewer comments, prepare the correction response, and coordinate resubmission."],
      ["Coordinate inspections and closeout", "Track required inspections, results, final approvals, and the completed permit record."],
    ];
    const tasks = taskDefinitions.map(([title, plain_language], index) => ({
      request_id: request.id,
      project_id: order.project_id,
      user_id: order.user_id,
      assigned_to: "concierge",
      title,
      plain_language,
      status: index === 0 ? "in_progress" : "pending",
      sort_order: (index + 1) * 10,
    }));
    const { error: taskError } = await service.from("permit_concierge_tasks").insert(tasks);
    if (taskError) throw taskError;
  }

  const { count: existingMessageCount } = await service
    .from("permit_concierge_messages")
    .select("id", { count: "exact", head: true })
    .eq("request_id", request.id);

  if (!existingMessageCount) {
    await service.from("permit_concierge_messages").insert({
      request_id: request.id,
      project_id: order.project_id,
      user_id: order.user_id,
      sender_role: "system",
      sender_user_id: null,
      visible_to_homeowner: true,
      body: "Your Full-Service Permit Concierge payment is confirmed. Project Pilot is reviewing the project, verifying the official permit route, preparing the application package, and coordinating the remaining process. We will only stop and ask you to act when a government or professional requirement must be completed personally by you or another authorized professional.",
      created_at: now,
    });
  }

  const { count: existingEventCount } = await service
    .from("permit_concierge_events")
    .select("id", { count: "exact", head: true })
    .eq("request_id", request.id)
    .eq("event_type", "full_service_started");

  if (!existingEventCount) {
    await service.from("permit_concierge_events").insert({
      request_id: request.id,
      permit_case_id: order.permit_case_id,
      project_id: order.project_id,
      user_id: order.user_id,
      event_type: "full_service_started",
      title: "Project Pilot started the full-service permit workflow",
      detail: "Payment was confirmed. The case is queued for jurisdiction verification, application preparation, filing coordination, corrections, inspections, and closeout.",
      source: "project_pilot",
      visible_to_homeowner: true,
      created_by: order.user_id,
      created_at: now,
    });
  }

  await reserveOrderCredit(service, order, Number(order?.metadata?.credit_applied_cents || 0));
  await rewardReferrerForPaidOrder(service, order).catch(() => null);

  const [{ data: project }, { data: auth }] = await Promise.all([
    service.from("projects").select("title, address, location_label").eq("id", order.project_id).maybeSingle(),
    service.from("permit_service_authorizations").select("signer_name, signer_email").eq("request_id", request.id).order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const customerEmail = auth?.signer_email || request.contact_email;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectpiloting.com";
  const creditAppliedCents = Number(order?.metadata?.credit_applied_cents || 0);
  const basePriceCents = Number(order?.metadata?.base_price_cents || order.amount_cents || 0);
  const creditSummary = creditAppliedCents > 0
    ? `<p><strong>Base Concierge price:</strong> $${(basePriceCents / 100).toFixed(2)}<br/><strong>Project Pilot credit:</strong> -$${(creditAppliedCents / 100).toFixed(2)}<br/><strong>Amount paid:</strong> $${(Number(order.amount_cents || 0) / 100).toFixed(2)}</p>`
    : "";
  if (customerEmail) {
    await sendEmail({
      to: customerEmail,
      subject: `Project Pilot Permit Concierge is active — ${request.case_number || stableCaseNumber(order.permit_case_id)}`,
      html: `<h2>Your Full-Service Permit Concierge is active.</h2>
        <p>We confirmed your $${(Number(order.amount_cents || 0) / 100).toFixed(2)} Project Pilot coordination payment and opened case <strong>${escapeHtml(request.case_number || stableCaseNumber(order.permit_case_id))}</strong>.</p>
        ${creditSummary}
        <p>Project Pilot will begin by verifying the official permit authority and requirements, then organize and coordinate the authorized administrative workflow. We will contact you when an agency requires an applicant-controlled action such as a signature, identity check, government payment, or licensed-professional document.</p>
        <p><a href="${escapeHtml(`${siteUrl}/project/${order.project_id}?tab=permits`)}">Open your permit workspace</a></p>
        <p>Government fees and licensed-professional or other third-party charges are separate unless explicitly stated otherwise.</p>`,
    }).catch(() => null);
  }

  const adminEmail = process.env.PERMIT_CONCIERGE_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `PAID permit case ${request.case_number || stableCaseNumber(order.permit_case_id)}: ${project?.title || "Project Pilot project"}`,
      html: `<h2>Paid Full-Service Permit Concierge case</h2>
        <p><strong>Revenue:</strong> $${(Number(order.amount_cents || 0) / 100).toFixed(2)}</p>
        <p><strong>Case:</strong> ${escapeHtml(request.case_number || stableCaseNumber(order.permit_case_id))}</p>
        <p><strong>Project:</strong> ${escapeHtml(project?.title || "Untitled project")}</p>
        <p><strong>Property:</strong> ${escapeHtml(project?.address || project?.location_label || "Not saved")}</p>
        <p><strong>Customer:</strong> ${escapeHtml(auth?.signer_name || "Customer")} · ${escapeHtml(auth?.signer_email || request.contact_email || "")}</p>
        <p>Open the Permit Concierge workbench in the Project Pilot Admin Control Center.</p>`,
    }).catch(() => null);
  }

  return { order: { ...order, status: "paid", paid_at: order.paid_at || now }, request, projectId: order.project_id };
}

export async function cancelPendingPermitServiceOrder(service, session) {
  const orderId = session?.metadata?.permit_order_id || session?.client_reference_id;
  if (!orderId) return null;
  const now = new Date().toISOString();
  const { data: order } = await service.from("permit_service_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.status !== "pending") return order;

  await releasePendingOrderCredit(service, order);
  await service.from("permit_service_orders").update({ status: "cancelled", cancelled_at: now, updated_at: now }).eq("id", orderId).eq("status", "pending");
  await service.from("permit_concierge_requests").update({ payment_status: "cancelled", updated_at: now }).eq("id", order.request_id).eq("payment_status", "pending");
  return { ...order, status: "cancelled" };
}
