import { NextResponse } from "next/server";
import { requireUser, sendEmail, escapeHtml } from "../../../../lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SERVICES = new Set([
  "package_review",
  "form_preparation",
  "agency_coordination",
  "correction_management",
  "inspection_coordination",
]);

function clean(value, maximum = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request) {
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json();
    const permitCaseId = clean(body.permitCaseId, 100);
    const preferredContact = ["email", "phone", "either"].includes(body.preferredContact)
      ? body.preferredContact
      : "email";
    const contactEmail = clean(body.contactEmail || user.email, 320);
    const contactPhone = clean(body.contactPhone, 80);
    const bestContactTime = clean(body.bestContactTime, 200);
    const homeownerNotes = clean(body.homeownerNotes, 3000);
    const requestedServices = Array.isArray(body.requestedServices)
      ? [...new Set(body.requestedServices.filter((item) => ALLOWED_SERVICES.has(item)))]
      : [];
    const accepted = body.accepted === true;

    if (!permitCaseId) {
      return NextResponse.json({ error: "Open a permit case before requesting Permit Concierge." }, { status: 400 });
    }
    if (!accepted) {
      return NextResponse.json({ error: "Review and accept the Permit Concierge authorization before continuing." }, { status: 400 });
    }
    if (!requestedServices.length) {
      return NextResponse.json({ error: "Choose at least one way you want Permit Concierge to help." }, { status: 400 });
    }
    if (!validEmail(contactEmail)) {
      return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
    }
    if ((preferredContact === "phone" || preferredContact === "either") && !contactPhone) {
      return NextResponse.json({ error: "Enter a phone number for phone contact." }, { status: 400 });
    }

    const { data: permitCase, error: caseError } = await service
      .from("permit_cases")
      .select("id,project_id,user_id,jurisdiction,status,readiness_score,authorization_confirmed_at,activity")
      .eq("id", permitCaseId)
      .eq("user_id", user.id)
      .single();

    if (caseError || !permitCase) {
      return NextResponse.json({ error: "That permit case could not be opened." }, { status: 404 });
    }

    const { data: project } = await service
      .from("projects")
      .select("id,title,project_type,address,location_label")
      .eq("id", permitCase.project_id)
      .eq("user_id", user.id)
      .single();

    const now = new Date().toISOString();
    const requestPayload = {
      permit_case_id: permitCase.id,
      project_id: permitCase.project_id,
      user_id: user.id,
      status: "requested",
      requested_services: requestedServices,
      preferred_contact: preferredContact,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      best_contact_time: bestContactTime,
      homeowner_notes: homeownerNotes,
      authorization_scope: "review_prepare_coordinate",
      authorization_confirmed_at: now,
      terms_version: "3.1C",
      requested_at: now,
      updated_at: now,
    };

    const { data: conciergeRequest, error: requestError } = await service
      .from("permit_concierge_requests")
      .upsert(requestPayload, { onConflict: "permit_case_id" })
      .select("*")
      .single();

    if (requestError || !conciergeRequest) {
      throw requestError || new Error("The Permit Concierge request could not be created.");
    }

    const { count: existingTaskCount } = await service
      .from("permit_concierge_tasks")
      .select("id", { count: "exact", head: true })
      .eq("request_id", conciergeRequest.id);

    if (!existingTaskCount) {
      const baseTasks = [
        {
          assigned_to: "concierge",
          title: "Review the permit package",
          plain_language: "Project Pilot checks the answers, linked documents, likely authority, and missing information before any filing step.",
          sort_order: 10,
        },
        {
          assigned_to: "concierge",
          title: "Confirm the official filing route",
          plain_language: "The concierge verifies which county, town, or state portal or form controls this project.",
          sort_order: 20,
        },
        {
          assigned_to: "concierge",
          title: "Prepare application information",
          plain_language: "The concierge organizes the application answers and documents so the homeowner does not have to start from scratch.",
          sort_order: 30,
        },
        {
          assigned_to: "homeowner",
          title: "Complete identity, signature, or notarization when requested",
          plain_language: "Government portals may require the applicant personally to verify identity, sign certifications, or complete notarization.",
          sort_order: 40,
        },
        {
          assigned_to: "homeowner",
          title: "Approve and pay government fees when due",
          plain_language: "Project Pilot can track the fee and deadline, but the homeowner remains in control of government payments unless a separate authorized payment workflow is offered.",
          sort_order: 50,
        },
      ].map((task) => ({
        request_id: conciergeRequest.id,
        project_id: permitCase.project_id,
        user_id: user.id,
        status: "pending",
        ...task,
      }));

      await service.from("permit_concierge_tasks").insert(baseTasks);
    }

    const { count: existingMessageCount } = await service
      .from("permit_concierge_messages")
      .select("id", { count: "exact", head: true })
      .eq("request_id", conciergeRequest.id);

    if (!existingMessageCount) {
      await service.from("permit_concierge_messages").insert({
        request_id: conciergeRequest.id,
        project_id: permitCase.project_id,
        user_id: user.id,
        sender_role: "system",
        sender_user_id: null,
        visible_to_homeowner: true,
        body: "Your Permit Concierge request was received. A coordinator can now review the saved permit package, identify missing items, and guide the next filing step. You will still be asked to complete any identity, legal signature, professional-seal, or government-payment step required by the authority.",
      });
    }

    const existingActivity = Array.isArray(permitCase.activity) ? permitCase.activity : [];
    const nextActivity = [
      ...existingActivity,
      {
        id: crypto.randomUUID(),
        at: now,
        type: "concierge",
        title: "Permit Concierge service requested",
        detail: `Requested services: ${requestedServices.join(", ")}.`,
      },
    ].slice(-100);

    await service
      .from("permit_cases")
      .update({
        concierge_requested_at: now,
        status: "concierge_requested",
        activity: nextActivity,
        updated_at: now,
      })
      .eq("id", permitCase.id)
      .eq("user_id", user.id);

    const adminEmail = process.env.PERMIT_CONCIERGE_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `New Permit Concierge request: ${project?.title || "Project Pilot project"}`,
        html: `<h2>New Permit Concierge request</h2>
          <p><strong>Project:</strong> ${escapeHtml(project?.title || "Untitled project")}</p>
          <p><strong>Jurisdiction:</strong> ${escapeHtml(permitCase.jurisdiction || "Needs review")}</p>
          <p><strong>Readiness:</strong> ${Number(permitCase.readiness_score || 0)}%</p>
          <p><strong>Contact:</strong> ${escapeHtml(contactEmail)} ${contactPhone ? `· ${escapeHtml(contactPhone)}` : ""}</p>
          <p><strong>Requested services:</strong> ${escapeHtml(requestedServices.join(", "))}</p>
          <p>Open the Project Pilot Admin Control Center to review the case.</p>`,
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, request: conciergeRequest });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Permit Concierge could not be requested." }, { status: 500 });
  }
}
