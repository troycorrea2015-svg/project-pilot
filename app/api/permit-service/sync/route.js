import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/marketplace-server";
import {
  effectivePermitServiceStatus,
  nextActionForPermitStatus,
  permitCaseStatusForServiceStatus,
  permitProgressPercent,
  projectProgressForPermitStatus,
  projectStatusForPermitStatus,
  serviceSummaryForStatus,
} from "../../../../lib/permit-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value, maximum = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function nonEmptyAnswerCount(answers) {
  return Object.entries(answers || {}).filter(([key, value]) =>
    !String(key).startsWith("_") && String(value ?? "").trim() && String(value).trim().toLowerCase() !== "not sure yet"
  ).length;
}

function taskMatches(task, text) {
  return String(task?.title || "").toLowerCase().includes(text);
}

export async function POST(request) {
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const projectId = clean(body.projectId, 100);
    if (!projectId) return NextResponse.json({ error: "Project id is required." }, { status: 400 });

    const { data: project, error: projectError } = await service
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();
    if (projectError || !project) return NextResponse.json({ error: "Project could not be opened." }, { status: 404 });

    const { data: permitCase, error: caseError } = await service
      .from("permit_cases")
      .select("*")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (caseError) throw caseError;
    if (!permitCase) return NextResponse.json({ active: false, reason: "No permit case exists yet." });

    const { data: requestRow, error: requestError } = await service
      .from("permit_concierge_requests")
      .select("*")
      .eq("permit_case_id", permitCase.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!requestRow || !["paid", "waived"].includes(String(requestRow.payment_status || "").toLowerCase())) {
      return NextResponse.json({ active: false, permitCase, request: requestRow || null });
    }

    const { data: tasksData, error: tasksError } = await service
      .from("permit_concierge_tasks")
      .select("*")
      .eq("request_id", requestRow.id)
      .order("sort_order")
      .order("created_at");
    if (tasksError) throw tasksError;

    let tasks = tasksData || [];
    const now = new Date().toISOString();
    const checklist = Array.isArray(permitCase.checklist) ? permitCase.checklist : [];
    const documentLinks = permitCase.document_links || {};
    const requiredDocuments = checklist.filter((item) => item?.required);
    const requiredDocumentsReady = requiredDocuments.every((item) => Boolean(documentLinks?.[item.key]));
    const permitResearch = project.permit_research || {};
    const routeVerified = Boolean(
      permitCase.jurisdiction &&
      permitCase.application_url &&
      String(permitCase.jurisdiction_confidence || "").toLowerCase() === "high"
    );
    const scopeReady = Boolean(
      (project.project_type || permitCase.project_type) &&
      (project.description || project.title) &&
      (project.address || project.location_label)
    );
    const requirementsKnown = Boolean(
      checklist.length ||
      (Array.isArray(permitResearch.documents) && permitResearch.documents.length) ||
      (Array.isArray(permitResearch.steps) && permitResearch.steps.length)
    );
    const applicationInfoReady = Number(permitCase.readiness_score || 0) >= 60 || nonEmptyAnswerCount(permitCase.answers) >= 6;
    const packageReady = Number(permitCase.readiness_score || 0) >= 100 && requiredDocumentsReady && Boolean(requestRow.authorization_confirmed_at);
    const filingModeVerified = Boolean(requestRow.filing_mode && requestRow.filing_mode !== "unknown");
    const officiallySubmitted = Boolean(permitCase.submitted_at || permitCase.application_reference);
    const permitApproved = Boolean(permitCase.approved_at || ["approved", "inspection", "closed"].includes(String(permitCase.status || "").toLowerCase()));
    const permitClosed = Boolean(permitCase.closed_at || String(permitCase.status || "").toLowerCase() === "closed");

    const completions = [];
    for (const task of tasks) {
      if (task.assigned_to !== "concierge" || ["completed", "cancelled"].includes(String(task.status || "").toLowerCase())) continue;
      let canComplete = false;
      if (taskMatches(task, "verify jurisdiction")) canComplete = routeVerified;
      else if (taskMatches(task, "review the saved project scope")) canComplete = scopeReady;
      else if (taskMatches(task, "build the official requirements list")) canComplete = requirementsKnown;
      else if (taskMatches(task, "prepare the application information")) canComplete = applicationInfoReady;
      else if (taskMatches(task, "prepare the submission package")) canComplete = packageReady;
      else if (taskMatches(task, "confirm what project pilot may file")) canComplete = filingModeVerified;
      else if (taskMatches(task, "coordinate the official submission")) canComplete = officiallySubmitted;
      else if (taskMatches(task, "monitor and manage corrections")) canComplete = permitApproved;
      else if (taskMatches(task, "coordinate inspections and closeout")) canComplete = permitClosed;
      if (canComplete) completions.push(task.id);
    }

    if (completions.length) {
      const { error: completeError } = await service
        .from("permit_concierge_tasks")
        .update({ status: "completed", completed_at: now, updated_at: now })
        .in("id", completions);
      if (completeError) throw completeError;
      tasks = tasks.map((task) => completions.includes(task.id) ? { ...task, status: "completed", completed_at: now, updated_at: now } : task);
    }

    const firstPendingConcierge = tasks.find((task) => task.assigned_to === "concierge" && String(task.status || "").toLowerCase() === "pending");
    const hasInProgressConcierge = tasks.some((task) => task.assigned_to === "concierge" && String(task.status || "").toLowerCase() === "in_progress");
    if (firstPendingConcierge && !hasInProgressConcierge && !["closed", "cancelled"].includes(String(requestRow.status || "").toLowerCase())) {
      const { data: startedTask, error: startError } = await service
        .from("permit_concierge_tasks")
        .update({ status: "in_progress", updated_at: now })
        .eq("id", firstPendingConcierge.id)
        .select("*")
        .single();
      if (startError) throw startError;
      tasks = tasks.map((task) => task.id === startedTask.id ? startedTask : task);
    }

    let statusSource = requestRow.status;
    const caseStatus = String(permitCase.status || "").toLowerCase();
    if (permitClosed) statusSource = "closed";
    else if (caseStatus === "inspection" && !["closed", "cancelled"].includes(String(requestRow.status || "").toLowerCase())) statusSource = "inspections";
    else if (permitApproved && !["inspections", "closeout", "closed", "cancelled"].includes(String(requestRow.status || "").toLowerCase())) statusSource = "approved";
    else if (caseStatus === "correction_required" && !["approved", "inspections", "closeout", "closed", "cancelled"].includes(String(requestRow.status || "").toLowerCase())) statusSource = "corrections";
    else if (officiallySubmitted && !["corrections", "approved", "inspections", "closeout", "closed", "cancelled"].includes(String(requestRow.status || "").toLowerCase())) statusSource = "submitted";

    const derivedStatus = effectivePermitServiceStatus(statusSource, tasks);
    const summary = serviceSummaryForStatus(derivedStatus);
    const nextAction = nextActionForPermitStatus(derivedStatus);
    const requestChanged = derivedStatus !== requestRow.status || !requestRow.concierge_summary;

    const { data: updatedRequest, error: requestUpdateError } = await service
      .from("permit_concierge_requests")
      .update({
        status: derivedStatus,
        current_phase: derivedStatus,
        concierge_summary: derivedStatus !== requestRow.status ? summary : (requestRow.concierge_summary || summary),
        customer_action_reason: derivedStatus === "waiting_on_homeowner" ? requestRow.customer_action_reason : "",
        updated_at: now,
      })
      .eq("id", requestRow.id)
      .select("*")
      .single();
    if (requestUpdateError) throw requestUpdateError;

    const nextCaseStatus = permitCaseStatusForServiceStatus(derivedStatus);
    const caseActivity = Array.isArray(permitCase.activity) ? permitCase.activity : [];
    const shouldRecord = requestChanged || completions.length > 0;
    const nextActivity = shouldRecord
      ? [...caseActivity, {
          id: crypto.randomUUID(),
          at: now,
          type: "permit_service_progress",
          title: `Permit Concierge progress: ${derivedStatus.replaceAll("_", " ")}`,
          detail: completions.length
            ? `${completions.length} permit preparation task${completions.length === 1 ? " was" : "s were"} completed from the saved project information.`
            : summary,
        }].slice(-100)
      : caseActivity;

    const { data: updatedCase, error: caseUpdateError } = await service
      .from("permit_cases")
      .update({
        status: nextCaseStatus,
        next_action: nextAction,
        activity: nextActivity,
        updated_at: now,
      })
      .eq("id", permitCase.id)
      .select("*")
      .single();
    if (caseUpdateError) throw caseUpdateError;

    const targetProgress = projectProgressForPermitStatus(derivedStatus);
    const nextProjectProgress = Math.max(Number(project.progress || 0), targetProgress);
    const { data: updatedProject, error: projectUpdateError } = await service
      .from("projects")
      .update({
        progress: nextProjectProgress,
        status: projectStatusForPermitStatus(derivedStatus),
        next_step: nextAction,
        updated_at: now,
      })
      .eq("id", project.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (projectUpdateError) throw projectUpdateError;

    if (shouldRecord) {
      await service.from("permit_concierge_events").insert({
        request_id: updatedRequest.id,
        permit_case_id: updatedCase.id,
        project_id: project.id,
        user_id: user.id,
        event_type: "progress_sync",
        title: `Permit progress updated to ${permitProgressPercent(derivedStatus, tasks)}%`,
        detail: summary,
        source: "project_pilot",
        visible_to_homeowner: true,
        created_by: user.id,
        created_at: now,
      });
    }

    return NextResponse.json({
      active: true,
      progress: permitProgressPercent(derivedStatus, tasks),
      status: derivedStatus,
      request: updatedRequest,
      permitCase: updatedCase,
      project: updatedProject,
      tasks,
      autoCompleted: completions.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Permit progress could not be synchronized." }, { status: 500 });
  }
}
