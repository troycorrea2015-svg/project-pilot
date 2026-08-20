import { NextResponse } from "next/server";
import {
  createPermitServiceCheckoutSession,
  expireStripeCheckoutSession,
  requireUser,
  retrieveStripeCheckoutSession,
} from "../../../../lib/marketplace-server";
import {
  permitServicePaymentsEnabled,
  permitServicePriceCents,
  stableCaseNumber,
} from "../../../../lib/permit-service-server";
import { creditBalanceCents, referralMaxCreditCents, releasePendingOrderCredit, reserveOrderCredit } from "../../../../lib/referrals-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value, maximum = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function jurisdictionFromProject(project) {
  return clean(project?.jurisdiction || project?.permit_research?.jurisdiction || project?.permit_research?.authority || "", 500);
}

function applicationUrlFromProject(project) {
  const permitResearch = project?.permit_research || {};
  return clean(permitResearch.application_url || permitResearch.applicationUrl || permitResearch.portal_url || permitResearch.portalUrl || "", 2000);
}

export async function POST(request) {
  try {
    if (!permitServicePaymentsEnabled()) {
      return NextResponse.json(
        { error: "Full-Service Permit Concierge checkout is not enabled yet. Set PERMIT_SERVICE_PAYMENTS_ENABLED=true after Stripe live checkout is configured." },
        { status: 503 }
      );
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe is not configured for Full-Service Permit Concierge." }, { status: 503 });
    }

    const { user, service } = await requireUser(request);
    const body = await request.json();
    const projectId = clean(body.projectId, 100);
    const signerName = clean(body.signerName, 200);
    const contactEmail = clean(body.contactEmail || user.email, 320);
    const contactPhone = clean(body.contactPhone, 80);
    const homeownerNotes = clean(body.homeownerNotes, 3000);
    const accepted = body.accepted === true;

    if (!projectId) return NextResponse.json({ error: "Open a project before starting Full-Service Permit Concierge." }, { status: 400 });
    if (!signerName) return NextResponse.json({ error: "Enter the homeowner/applicant name for the authorization record." }, { status: 400 });
    if (!validEmail(contactEmail)) return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
    if (!accepted) return NextResponse.json({ error: "Review and accept the permit coordination authorization before continuing." }, { status: 400 });

    const { data: project, error: projectError } = await service
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();
    if (projectError || !project) return NextResponse.json({ error: "That Project Pilot project could not be opened." }, { status: 404 });

    const now = new Date().toISOString();
    let { data: permitCase, error: caseLoadError } = await service
      .from("permit_cases")
      .select("*")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (caseLoadError) throw caseLoadError;

    if (!permitCase) {
      const projectAddress = clean(project.address || project.location_label || "", 1000);
      const jurisdiction = jurisdictionFromProject(project);
      const { data: createdCase, error: createCaseError } = await service
        .from("permit_cases")
        .insert({
          project_id: project.id,
          user_id: user.id,
          project_type: clean(project.project_type || project.type || "general", 200) || "general",
          jurisdiction,
          jurisdiction_confidence: jurisdiction ? "medium" : "review",
          application_url: applicationUrlFromProject(project),
          application_label: jurisdiction ? `${jurisdiction} permit application` : "Permit application route under review",
          submission_method: "Full-Service Permit Concierge",
          status: "draft",
          readiness_score: 0,
          answers: { project_title: clean(project.title || "", 500), property_address: projectAddress },
          checklist: [],
          document_links: {},
          corrections: [],
          inspections: [],
          activity: [],
          next_action: "Complete Full-Service Permit Concierge checkout to begin permit coordination.",
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (createCaseError || !createdCase) throw createCaseError || new Error("Permit case could not be created.");
      permitCase = createdCase;
    }

    const caseNumber = stableCaseNumber(permitCase.id);
    const requestedServices = ["package_review", "form_preparation", "agency_coordination", "correction_management", "inspection_coordination"];
    const basePriceCents = permitServicePriceCents();
    const availableCreditCents = await creditBalanceCents(service, user.id);
    const creditAppliedCents = Math.min(
      Math.max(0, availableCreditCents),
      referralMaxCreditCents(),
      Math.max(0, basePriceCents - 5000)
    );
    const priceCents = Math.max(5000, basePriceCents - creditAppliedCents);

    const { data: existingRequest, error: existingRequestError } = await service
      .from("permit_concierge_requests")
      .select("*")
      .eq("permit_case_id", permitCase.id)
      .maybeSingle();
    if (existingRequestError) throw existingRequestError;
    if (existingRequest && ["paid", "waived"].includes(existingRequest.payment_status) && existingRequest.service_started_at) {
      return NextResponse.json({ alreadyActive: true, projectId: project.id });
    }

    const { data: conciergeRequest, error: requestError } = await service
      .from("permit_concierge_requests")
      .upsert(
        {
          permit_case_id: permitCase.id,
          project_id: project.id,
          user_id: user.id,
          case_number: caseNumber,
          service_mode: "full_service",
          status: "requested",
          current_phase: "intake",
          requested_services: requestedServices,
          preferred_contact: "email",
          contact_email: contactEmail,
          contact_phone: contactPhone,
          best_contact_time: "",
          homeowner_notes: homeownerNotes,
          authorization_scope: "full_service_permit_coordination",
          authorization_confirmed_at: now,
          terms_version: "4.5",
          payment_status: "pending",
          service_fee_cents: priceCents,
          requested_at: now,
          updated_at: now,
        },
        { onConflict: "permit_case_id" }
      )
      .select("*")
      .single();

    if (requestError || !conciergeRequest) {
      const message = String(requestError?.message || "");
      if (message.includes("payment_status") || message.includes("service_fee_cents") || message.includes("permit_service_orders")) {
        return NextResponse.json({ error: "Project Pilot revenue migration is missing. Run RUN_THIS_IN_SUPABASE_4_5_UPGRADE.sql, then retry." }, { status: 409 });
      }
      throw requestError || new Error("The permit service request could not be created.");
    }

    if (["paid", "waived"].includes(conciergeRequest.payment_status) && conciergeRequest.service_started_at) {
      return NextResponse.json({ alreadyActive: true, projectId: project.id });
    }

    const { error: authorizationError } = await service
      .from("permit_service_authorizations")
      .upsert(
        {
          request_id: conciergeRequest.id,
          permit_case_id: permitCase.id,
          project_id: project.id,
          user_id: user.id,
          authorization_version: "4.5",
          signer_name: signerName,
          signer_email: contactEmail,
          scopes: {
            review_project_and_property_information: true,
            research_and_verify_permit_route: true,
            prepare_application_information: true,
            organize_application_documents: true,
            communicate_with_agency_where_permitted: true,
            enter_portal_information_where_permitted: true,
            submit_where_permitted_and_authorized: true,
            manage_correction_workflow: true,
            coordinate_inspections_and_closeout: true,
          },
          acknowledgements: {
            applicant_login_may_be_required: true,
            applicant_signature_may_be_required: true,
            identity_verification_may_be_required: true,
            government_payment_may_be_required: true,
            licensed_professional_or_seal_may_be_required: true,
            government_and_third_party_fees_are_separate: true,
            project_pilot_does_not_impersonate_customer: true,
            government_requirements_control: true,
          },
          accepted_at: now,
        },
        { onConflict: "request_id,authorization_version" }
      );
    if (authorizationError) throw authorizationError;

    const { data: existingOrder } = await service
      .from("permit_service_orders")
      .select("*")
      .eq("request_id", conciergeRequest.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOrder?.stripe_checkout_session_id) {
      const priorSession = await retrieveStripeCheckoutSession(existingOrder.stripe_checkout_session_id).catch(() => null);
      const currentPriceMatches = Number(existingOrder.amount_cents || 0) === Number(priceCents);
      if (priorSession?.status === "open" && priorSession?.url && currentPriceMatches) {
        return NextResponse.json({
          url: priorSession.url,
          amountCents: existingOrder.amount_cents,
          basePriceCents: Number(existingOrder.metadata?.base_price_cents || basePriceCents),
          creditAppliedCents: Number(existingOrder.metadata?.credit_applied_cents || 0),
          orderId: existingOrder.id,
          reused: true,
        });
      }
      if (priorSession?.status === "open") await expireStripeCheckoutSession(existingOrder.stripe_checkout_session_id).catch(() => null);
      await releasePendingOrderCredit(service, existingOrder);
      await service.from("permit_service_orders").update({ status: "cancelled", cancelled_at: now, updated_at: now }).eq("id", existingOrder.id).eq("status", "pending");
    } else if (existingOrder) {
      await releasePendingOrderCredit(service, existingOrder);
      await service.from("permit_service_orders").update({ status: "cancelled", cancelled_at: now, updated_at: now }).eq("id", existingOrder.id).eq("status", "pending");
    }

    const { data: order, error: orderError } = await service
      .from("permit_service_orders")
      .insert({
        request_id: conciergeRequest.id,
        permit_case_id: permitCase.id,
        project_id: project.id,
        user_id: user.id,
        service_code: "full_service_permit_coordination",
        amount_cents: priceCents,
        currency: "usd",
        status: "pending",
        metadata: {
          case_number: caseNumber,
          project_title: project.title || "",
          base_price_cents: basePriceCents,
          credit_applied_cents: creditAppliedCents,
        },
      })
      .select("*")
      .single();
    if (orderError || !order) throw orderError || new Error("Permit service order could not be created.");

    await reserveOrderCredit(service, order, creditAppliedCents);
    await service.from("permit_concierge_requests").update({ revenue_order_id: order.id, payment_status: "pending", updated_at: now }).eq("id", conciergeRequest.id);

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    let checkout;
    try {
      checkout = await createPermitServiceCheckoutSession({
        amountCents: priceCents,
        basePriceCents,
        creditAppliedCents,
        customerEmail: contactEmail,
        orderId: order.id,
        requestId: conciergeRequest.id,
        projectId: project.id,
        successUrl: `${origin}/api/permit-service/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/project/${project.id}?tab=permits&permit_service=cancelled`,
      });
    } catch (checkoutError) {
      await releasePendingOrderCredit(service, order, "Permit Concierge checkout could not be opened — credit released").catch(() => null);
      await service.from("permit_service_orders").update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", order.id).eq("status", "pending");
      throw checkoutError;
    }

    const { error: updateOrderError } = await service
      .from("permit_service_orders")
      .update({ stripe_checkout_session_id: checkout.id, updated_at: now })
      .eq("id", order.id)
      .eq("status", "pending");
    if (updateOrderError) throw updateOrderError;

    return NextResponse.json({
      url: checkout.url,
      amountCents: priceCents,
      basePriceCents,
      creditAppliedCents,
      orderId: order.id,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Full-Service Permit Concierge checkout could not be started." }, { status: 500 });
  }
}
