"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import "../../admin.css";
import "./concierge.css";
import {
  effectivePermitServiceStatus,
  permitProgressPercent,
  nextActionForPermitStatus,
  permitCaseStatusForServiceStatus,
  projectProgressForPermitStatus,
  projectStatusForPermitStatus,
  serviceSummaryForStatus,
  projectPilotWorkForPermitStatus,
  homeownerActionSummary,
  nextCheckpointForPermitStatus,
  nextUpdateExpectationForPermitStatus,
} from "../../../../lib/permit-progress";

const STATUSES = [
  ["requested", "Request received"],
  ["intake_review", "Intake review"],
  ["preparing", "Preparing application"],
  ["waiting_on_homeowner", "Waiting on homeowner"],
  ["ready_for_submission", "Ready for submission"],
  ["filing", "Filing / portal coordination"],
  ["submitted", "Submitted"],
  ["corrections", "Corrections"],
  ["approved", "Approved"],
  ["inspections", "Inspections"],
  ["closeout", "Closeout"],
  ["closed", "Closed"],
  ["cancelled", "Cancelled"],
];

const FILING_MODES = [
  ["unknown", "Needs verification"],
  ["coordinator_allowed", "Coordinator may file where authorized"],
  ["applicant_required", "Applicant must complete filing"],
  ["mixed", "Mixed / some applicant-controlled steps"],
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function PermitConciergeAdminCase() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id;
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [request, setRequest] = useState(null);
  const [permitCase, setPermitCase] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [authorizations, setAuthorizations] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [playbook, setPlaybook] = useState(null);
  const [permitOrder, setPermitOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [status, setStatus] = useState("requested");
  const [assignedTo, setAssignedTo] = useState("");
  const [summary, setSummary] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyUrl, setAgencyUrl] = useState("");
  const [filingMode, setFilingMode] = useState("unknown");
  const [customerActionReason, setCustomerActionReason] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState("concierge");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [messageText, setMessageText] = useState("");
  const [correctionNotice, setCorrectionNotice] = useState("");
  const [correctionSummary, setCorrectionSummary] = useState("");
  const [correctionDue, setCorrectionDue] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");

  useEffect(() => {
    loadCase();
  }, [requestId]);

  const openHomeownerTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === "homeowner" && !["completed", "cancelled"].includes(task.status)),
    [tasks]
  );
  const openConciergeTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === "concierge" && !["completed", "cancelled"].includes(task.status)),
    [tasks]
  );

  async function addEvent(title, detail, eventType = "update", visible = true) {
    if (!request?.id) return;
    await supabase.from("permit_concierge_events").insert({
      request_id: request.id,
      permit_case_id: request.permit_case_id,
      project_id: request.project_id,
      user_id: request.user_id,
      event_type: eventType,
      title,
      detail,
      source: "permit_concierge",
      visible_to_homeowner: visible,
      created_by: user?.id || null,
    });
  }

  async function emailCustomer(subject, message) {
    if (!request?.id || !message) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      await fetch("/api/admin/permit-service/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: request.id, subject, message }),
      });
    } catch {
      // In-app status and timeline remain authoritative when email is unavailable.
    }
  }

  async function syncProjectPermitState(nextStatus, nextActionOverride = "") {
    if (!project?.id) return;
    const nextAction = nextActionOverride || nextActionForPermitStatus(nextStatus);
    const progress = Math.max(Number(project.progress || 0), projectProgressForPermitStatus(nextStatus));
    const { data } = await supabase
      .from("projects")
      .update({
        progress,
        status: projectStatusForPermitStatus(nextStatus),
        next_step: nextAction,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .select("*")
      .single();
    if (data) setProject(data);
  }

  async function loadCase() {
    if (!requestId) return;
    setLoading(true);
    setError("");

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    if (!currentUser) {
      router.replace("/");
      return;
    }
    setUser(currentUser);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,full_name,is_admin")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (!profileData?.is_admin) {
      setProfile(profileData || null);
      setLoading(false);
      return;
    }
    setProfile(profileData);

    const { data: requestData, error: requestError } = await supabase
      .from("permit_concierge_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !requestData) {
      setError(requestError?.message || "Permit Concierge request not found.");
      setLoading(false);
      return;
    }

    setRequest(requestData);
    setStatus(requestData.status || "requested");
    setAssignedTo(requestData.assigned_to || profileData.full_name || currentUser.email || "");
    setSummary(requestData.concierge_summary || "");
    setInternalNotes(requestData.internal_notes || "");
    setAgencyName(requestData.agency_name || "");
    setAgencyUrl(requestData.agency_url || "");
    setFilingMode(requestData.filing_mode || "unknown");
    setCustomerActionReason(requestData.customer_action_reason || "");

    const [caseResult, projectResult, taskResult, messageResult, eventResult, authResult, correctionResult, inspectionResult, orderResult] = await Promise.all([
      supabase.from("permit_cases").select("*").eq("id", requestData.permit_case_id).single(),
      supabase.from("projects").select("*").eq("id", requestData.project_id).single(),
      supabase.from("permit_concierge_tasks").select("*").eq("request_id", requestData.id).order("sort_order").order("created_at"),
      supabase.from("permit_concierge_messages").select("*").eq("request_id", requestData.id).order("created_at"),
      supabase.from("permit_concierge_events").select("*").eq("request_id", requestData.id).order("created_at", { ascending: false }),
      supabase.from("permit_service_authorizations").select("*").eq("request_id", requestData.id).order("accepted_at", { ascending: false }),
      supabase.from("permit_concierge_corrections").select("*").eq("request_id", requestData.id).order("round_number", { ascending: false }),
      supabase.from("permit_concierge_inspections").select("*").eq("request_id", requestData.id).order("created_at"),
      supabase.from("permit_service_orders").select("*").eq("request_id", requestData.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (caseResult.error) setError(caseResult.error.message);
    else setPermitCase(caseResult.data);
    if (projectResult.error) setError(projectResult.error.message);
    else setProject(projectResult.data);
    if (taskResult.error) setError(taskResult.error.message);
    else setTasks(taskResult.data || []);
    if (messageResult.error) setError(messageResult.error.message);
    else setMessages(messageResult.data || []);
    if (!eventResult.error) setEvents(eventResult.data || []);
    if (!authResult.error) setAuthorizations(authResult.data || []);
    if (!correctionResult.error) setCorrections(correctionResult.data || []);
    if (!inspectionResult.error) setInspections(inspectionResult.data || []);
    if (!orderResult.error) setPermitOrder(orderResult.data || null);

    if (caseResult.data) {
      const jurisdictionKey = String(caseResult.data.jurisdiction || "").toLowerCase().trim();
      const projectType = String(caseResult.data.project_type || "general").toLowerCase().trim() || "general";
      if (jurisdictionKey) {
        const { data: exactPlaybook } = await supabase
          .from("permit_jurisdiction_playbooks")
          .select("*")
          .eq("jurisdiction_key", jurisdictionKey)
          .eq("project_type", projectType)
          .eq("status", "verified")
          .maybeSingle();
        setPlaybook(exactPlaybook || null);
      }
    }
    setLoading(false);
  }

  async function refundPermitService() {
    if (!permitOrder?.id || permitOrder.status !== "paid") return;
    const confirmed = window.confirm("Refund the full Permit Concierge coordination fee and cancel this paid service case? Only use this before substantive permit coordination has moved beyond intake.");
    if (!confirmed) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch("/api/admin/permit-service/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: permitOrder.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Refund could not be issued.");
      setNotice(`Refund issued${payload.stripeRefundId ? ` · ${payload.stripeRefundId}` : ""}.`);
      await loadCase();
    } catch (refundError) {
      setError(refundError.message || "Refund could not be issued.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRequest() {
    if (!request?.id) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const previousStatus = request.status;

    const { data, error: updateError } = await supabase
      .from("permit_concierge_requests")
      .update({
        status,
        current_phase: status,
        assigned_to: assignedTo.trim(),
        concierge_summary: summary.trim(),
        internal_notes: internalNotes.trim(),
        agency_name: agencyName.trim(),
        agency_url: agencyUrl.trim(),
        filing_mode: filingMode,
        customer_action_reason: status === "waiting_on_homeowner" ? customerActionReason.trim() : "",
        service_completed_at: status === "closed" ? now : request.service_completed_at,
        updated_at: now,
      })
      .eq("id", request.id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setRequest(data);
    setNotice("Full-service permit case saved.");

    const casePatch = { updated_at: now };
    if (status === "waiting_on_homeowner") {
      casePatch.status = "concierge_requested";
      casePatch.next_action = openHomeownerTasks[0]?.title || customerActionReason || "Homeowner action required";
    } else if (status === "submitted") {
      casePatch.status = "submitted";
      casePatch.submitted_at = permitCase?.submitted_at || now;
      casePatch.next_action = "Project Pilot is monitoring the permit for agency updates.";
    } else if (status === "corrections") {
      casePatch.status = "correction_required";
      casePatch.next_action = "Project Pilot is preparing the correction response.";
    } else if (status === "approved") {
      casePatch.status = "approved";
      casePatch.approved_at = permitCase?.approved_at || now;
      casePatch.next_action = "Project Pilot is checking inspection and closeout requirements.";
    } else if (status === "inspections") {
      casePatch.status = "inspection";
      casePatch.next_action = "Project Pilot is coordinating required inspections.";
    } else if (status === "closed") {
      casePatch.status = "closed";
      casePatch.closed_at = permitCase?.closed_at || now;
      casePatch.next_action = "Permit process complete.";
    } else {
      casePatch.status = "concierge_requested";
      casePatch.next_action = "Project Pilot is handling the permit workflow.";
    }
    await supabase.from("permit_cases").update(casePatch).eq("id", request.permit_case_id);
    await syncProjectPermitState(status, casePatch.next_action);

    if (previousStatus !== status) {
      const statusLabel = STATUSES.find(([key]) => key === status)?.[1] || status;
      const customerMessage = summary.trim() || serviceSummaryForStatus(status);
      await addEvent(`Permit status: ${statusLabel}`, customerMessage, "status_change", true);
      await emailCustomer(`Project Pilot permit update — ${statusLabel}`, `${customerMessage}\n\nNext checkpoint: ${nextCheckpointForPermitStatus(status)}.`);
    }
    setSaving(false);
    await loadCase();
  }

  async function addTask() {
    const title = newTaskTitle.trim();
    if (!title || !request?.id) return;
    setSaving(true);
    setError("");

    const { data, error: taskError } = await supabase
      .from("permit_concierge_tasks")
      .insert({
        request_id: request.id,
        project_id: request.project_id,
        user_id: request.user_id,
        assigned_to: newTaskOwner,
        title,
        plain_language: newTaskText.trim(),
        due_at: newTaskDue ? new Date(`${newTaskDue}T17:00:00`).toISOString() : null,
        status: "pending",
        sort_order: tasks.length * 10 + 10,
      })
      .select("*")
      .single();

    if (taskError) {
      setError(taskError.message);
    } else {
      setTasks((current) => [...current, data]);
      setNewTaskTitle("");
      setNewTaskText("");
      setNewTaskDue("");
      setNotice("Task added.");
      if (newTaskOwner === "homeowner") {
        const now = new Date().toISOString();
        setStatus("waiting_on_homeowner");
        setCustomerActionReason(newTaskText.trim() || title);
        await supabase.from("permit_concierge_requests").update({ status: "waiting_on_homeowner", customer_action_reason: newTaskText.trim() || title, updated_at: now }).eq("id", request.id);
        const actionMessage = newTaskText.trim() || title;
        await addEvent("Homeowner action required", actionMessage, "homeowner_action", true);
        await emailCustomer("Action needed for your Project Pilot permit", `${actionMessage}${newTaskDue ? `\n\nRequested by: ${newTaskDue}.` : ""}`);
      }
    }
    setSaving(false);
  }

  async function updateTask(task, patch) {
    const now = new Date().toISOString();
    const next = { ...patch, updated_at: now };
    if (patch.status === "completed") next.completed_at = now;
    const { data, error: taskError } = await supabase
      .from("permit_concierge_tasks")
      .update(next)
      .eq("id", task.id)
      .select("*")
      .single();
    if (taskError) {
      setError(taskError.message);
      return;
    }

    let updatedTasks = tasks.map((item) => (item.id === task.id ? data : item));

    if (patch.status === "completed" && task.assigned_to === "concierge") {
      const nextPending = updatedTasks
        .filter((item) => item.assigned_to === "concierge" && item.status === "pending")
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0];
      const hasInProgress = updatedTasks.some((item) => item.assigned_to === "concierge" && item.status === "in_progress");
      if (nextPending && !hasInProgress) {
        const { data: startedTask } = await supabase
          .from("permit_concierge_tasks")
          .update({ status: "in_progress", updated_at: now })
          .eq("id", nextPending.id)
          .select("*")
          .single();
        if (startedTask) updatedTasks = updatedTasks.map((item) => item.id === startedTask.id ? startedTask : item);
      }
    }

    setTasks(updatedTasks);
    const nextStatus = effectivePermitServiceStatus(request?.status, updatedTasks);
    const nextSummary = serviceSummaryForStatus(nextStatus);
    const nextAction = nextActionForPermitStatus(nextStatus);

    const { data: nextRequest } = await supabase
      .from("permit_concierge_requests")
      .update({
        status: nextStatus,
        current_phase: nextStatus,
        concierge_summary: nextSummary,
        customer_action_reason: nextStatus === "waiting_on_homeowner" ? request?.customer_action_reason || "" : "",
        updated_at: now,
      })
      .eq("id", request.id)
      .select("*")
      .single();
    if (nextRequest) {
      setRequest(nextRequest);
      setStatus(nextRequest.status);
      setSummary(nextRequest.concierge_summary || "");
    }

    const caseStatus = permitCaseStatusForServiceStatus(nextStatus);
    await supabase.from("permit_cases").update({ status: caseStatus, next_action: nextAction, updated_at: now }).eq("id", request.permit_case_id);
    await syncProjectPermitState(nextStatus, nextAction);
    await addEvent(
      patch.status === "completed" ? `Completed: ${task.title}` : `Task updated: ${task.title}`,
      nextSummary,
      "task_progress",
      true
    );
    setNotice(patch.status === "completed" ? "Task completed and permit progress advanced." : "Task updated.");
    await loadCase();
  }

  async function sendMessage() {
    const body = messageText.trim();
    if (!body || !request?.id) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const { data, error: messageError } = await supabase
      .from("permit_concierge_messages")
      .insert({
        request_id: request.id,
        project_id: request.project_id,
        user_id: request.user_id,
        sender_role: "concierge",
        sender_user_id: user.id,
        body,
        visible_to_homeowner: true,
        created_at: now,
      })
      .select("*")
      .single();

    if (messageError) setError(messageError.message);
    else {
      setMessages((current) => [...current, data]);
      setMessageText("");
      await supabase.from("permit_concierge_requests").update({ last_concierge_message_at: now, updated_at: now }).eq("id", request.id);
      await addEvent("Update from Permit Concierge", body, "message", true);
      await emailCustomer("New Project Pilot permit update", body);
      setNotice("Message sent to the homeowner and email notification queued when configured.");
    }
    setSaving(false);
  }

  async function addCorrection() {
    if (!correctionNotice.trim() || !request?.id) return;
    setSaving(true);
    const roundNumber = Math.max(0, ...corrections.map((item) => Number(item.round_number || 0))) + 1;
    const { error: correctionError } = await supabase.from("permit_concierge_corrections").insert({
      request_id: request.id,
      permit_case_id: request.permit_case_id,
      project_id: request.project_id,
      user_id: request.user_id,
      round_number: roundNumber,
      notice_text: correctionNotice.trim(),
      plain_language_summary: correctionSummary.trim(),
      status: "reviewing",
      due_at: correctionDue ? new Date(`${correctionDue}T17:00:00`).toISOString() : null,
      visible_to_homeowner: true,
    });
    if (correctionError) {
      setError(correctionError.message);
    } else {
      await supabase.from("permit_concierge_requests").update({ status: "corrections", current_phase: "corrections", updated_at: new Date().toISOString() }).eq("id", request.id);
      const correctionMessage = correctionSummary.trim() || "The permit authority sent review comments. Project Pilot is reviewing them and preparing the response.";
      await addEvent(`Correction round ${roundNumber} received`, correctionMessage, "correction", true);
      await emailCustomer("Permit review update — Project Pilot is handling corrections", `${correctionMessage}\n\nYou only need to act if Project Pilot sends you a specific applicant-controlled request.`);
      setCorrectionNotice("");
      setCorrectionSummary("");
      setCorrectionDue("");
      setNotice("Correction round added.");
      await loadCase();
    }
    setSaving(false);
  }

  async function updateCorrectionStatus(item, nextStatus) {
    if (!item?.id) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const patch = { status: nextStatus, updated_at: now };
    if (nextStatus === "resubmitted") patch.resubmitted_at = now;
    if (nextStatus === "resolved") patch.resolved_at = now;
    const { error: updateError } = await supabase.from("permit_concierge_corrections").update(patch).eq("id", item.id);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    await addEvent(`Correction round ${item.round_number}: ${nextStatus.replaceAll("_", " ")}`, item.plain_language_summary || item.notice_text || "Correction workflow updated.", "correction_progress", true);
    if (["resubmitted", "resolved"].includes(nextStatus)) {
      const remaining = corrections.filter((entry) => entry.id !== item.id && !["resubmitted", "resolved"].includes(entry.status));
      if (!remaining.length) {
        await supabase.from("permit_concierge_requests").update({ status: "submitted", current_phase: "submitted", concierge_summary: serviceSummaryForStatus("submitted"), updated_at: now }).eq("id", request.id);
        await supabase.from("permit_cases").update({ status: "submitted", next_action: nextActionForPermitStatus("submitted"), updated_at: now }).eq("id", request.permit_case_id);
        await syncProjectPermitState("submitted", nextActionForPermitStatus("submitted"));
      }
    }
    setNotice("Correction status updated and permit progress synchronized.");
    setSaving(false);
    await loadCase();
  }

  async function updateInspectionStatus(item, nextStatus) {
    if (!item?.id) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("permit_concierge_inspections").update({ status: nextStatus, updated_at: now }).eq("id", item.id);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    const inspectionStatusMessage = item.result_notes || `Inspection status changed to ${nextStatus.replaceAll("_", " ")}.`;
    await addEvent(`Inspection ${item.inspection_type}: ${nextStatus.replaceAll("_", " ")}`, inspectionStatusMessage, "inspection_progress", true);
    if (["passed", "failed"].includes(nextStatus)) await emailCustomer(`Inspection ${nextStatus === "passed" ? "passed" : "needs follow-up"} — ${item.inspection_type}`, inspectionStatusMessage);
    const nextInspections = inspections.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus } : entry);
    const allFinished = nextInspections.length > 0 && nextInspections.every((entry) => ["passed", "not_required", "cancelled"].includes(entry.status));
    const nextCaseStatus = allFinished ? "closeout" : "inspections";
    await supabase.from("permit_concierge_requests").update({ status: nextCaseStatus, current_phase: nextCaseStatus, concierge_summary: serviceSummaryForStatus(nextCaseStatus), updated_at: now }).eq("id", request.id);
    await supabase.from("permit_cases").update({ status: "inspection", next_action: nextActionForPermitStatus(nextCaseStatus), updated_at: now }).eq("id", request.permit_case_id);
    await syncProjectPermitState(nextCaseStatus, nextActionForPermitStatus(nextCaseStatus));
    setNotice(allFinished ? "All inspections are finished. The permit is ready for final closeout." : "Inspection status updated.");
    setSaving(false);
    await loadCase();
  }

  async function addInspection() {
    if (!inspectionType.trim() || !request?.id) return;
    setSaving(true);
    const { error: inspectionError } = await supabase.from("permit_concierge_inspections").insert({
      request_id: request.id,
      permit_case_id: request.permit_case_id,
      project_id: request.project_id,
      user_id: request.user_id,
      inspection_type: inspectionType.trim(),
      agency_name: agencyName.trim(),
      status: inspectionDate ? "scheduled" : "ready_to_schedule",
      scheduled_at: inspectionDate ? new Date(inspectionDate).toISOString() : null,
      visible_to_homeowner: true,
    });
    if (inspectionError) {
      setError(inspectionError.message);
    } else {
      await supabase.from("permit_concierge_requests").update({ status: "inspections", current_phase: "inspections", updated_at: new Date().toISOString() }).eq("id", request.id);
      const inspectionMessage = inspectionDate ? `${inspectionType.trim()} inspection scheduled for ${formatDate(inspectionDate)}.` : `${inspectionType.trim()} inspection is ready to schedule.`;
      await addEvent(`Inspection: ${inspectionType.trim()}`, inspectionMessage, "inspection", true);
      if (inspectionDate) await emailCustomer("Project Pilot inspection update", inspectionMessage);
      setInspectionType("");
      setInspectionDate("");
      setNotice("Inspection added.");
      await loadCase();
    }
    setSaving(false);
  }

  if (loading) return <main className="adminLoading">Opening full-service permit case…</main>;
  if (!profile?.is_admin) return <main className="adminDenied"><div><h1>Admin access required.</h1><button onClick={() => router.push("/dashboard")}>Return to Dashboard</button></div></main>;

  const adminEffectiveStatus = effectivePermitServiceStatus(status, tasks);
  const adminPermitProgress = permitProgressPercent(adminEffectiveStatus, tasks);
  const customerViewWork = projectPilotWorkForPermitStatus(adminEffectiveStatus, tasks);
  const customerViewAction = homeownerActionSummary(tasks, adminEffectiveStatus);
  const customerViewCheckpoint = nextCheckpointForPermitStatus(adminEffectiveStatus);
  const customerViewNextUpdate = nextUpdateExpectationForPermitStatus(adminEffectiveStatus, tasks);

  return (
    <main className="conciergeAdminPage">
      <header className="conciergeAdminHeader">
        <div>
          <a href="/admin#permits">← Permit operations queue</a>
          <p>FULL-SERVICE PERMIT WORKBENCH</p>
          <h1>{request?.case_number || project?.title || "Permit case"}</h1>
          <span>{project?.title || "Untitled project"} · {project?.address || project?.location_label || "No address saved"}</span>
        </div>
        <button type="button" onClick={saveRequest} disabled={saving}>{saving ? "Saving…" : "Save case"}</button>
      </header>

      {error && <div className="adminError">{error}</div>}
      {notice && <div className="adminNotice">{notice}</div>}

      <section className="conciergeAdminStats">
        <article><small>PERMIT PROGRESS</small><strong>{adminPermitProgress}%</strong></article>
        <article><small>STATUS</small><strong>{STATUSES.find(([key]) => key === adminEffectiveStatus)?.[1] || adminEffectiveStatus}</strong></article>
        <article><small>CUSTOMER ACTIONS</small><strong>{openHomeownerTasks.length}</strong></article>
        <article><small>PROJECT PILOT TASKS</small><strong>{openConciergeTasks.length}</strong></article>
        <article><small>PAYMENT</small><strong>{request?.payment_status === "paid" ? `$${(Number(request?.service_fee_cents || 0) / 100).toFixed(0)} Paid` : (request?.payment_status || "—")}</strong></article>
      </section>

      <section className={`permitOpsBanner ${openHomeownerTasks.length ? "needsCustomer" : "handling"}`}>
        <strong>{openHomeownerTasks.length ? "Customer action is blocking the case" : "Project Pilot owns the next action"}</strong>
        <span>{openHomeownerTasks.length ? customerActionReason || openHomeownerTasks[0]?.plain_language || openHomeownerTasks[0]?.title : summary || "Keep the case moving until a government-controlled applicant step is required."}</span>
      </section>

      <section className="customerExperiencePreview">
        <div className="customerExperienceHeading"><div><p>CUSTOMER EXPERIENCE PREVIEW</p><h2>What the homeowner understands right now.</h2></div><span>{openHomeownerTasks.length ? "Action needed from customer" : "Nothing needed from customer"}</span></div>
        <div className="customerExperienceGrid">
          <article><small>PROJECT PILOT IS DOING</small><strong>{customerViewWork}</strong></article>
          <article className={openHomeownerTasks.length ? "previewNeedsAction" : "previewClear"}><small>HOMEOWNER NEEDS TO DO</small><strong>{customerViewAction}</strong></article>
          <article><small>NEXT CHECKPOINT</small><strong>{customerViewCheckpoint}</strong></article>
          <article><small>NEXT UPDATE EXPECTATION</small><strong>{customerViewNextUpdate}</strong></article>
        </div>
        <p className="customerExperienceRule">If this preview is vague, stale, or asks the homeowner to understand permit jargon, update the case summary/tasks before leaving the workbench.</p>
      </section>

      <div className="conciergeAdminGrid">
        <section className="conciergeAdminPanel">
          <div><p>CASE CONTROL</p><h2>Operate the permit from intake through closeout.</h2></div>
          <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUSES.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>Assigned coordinator</span><input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} /></label>
          <label><span>Homeowner-visible update</span><textarea rows="4" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Tell the customer what Project Pilot is handling right now." /></label>
          {status === "waiting_on_homeowner" && <label><span>Why the customer must act</span><textarea rows="3" value={customerActionReason} onChange={(event) => setCustomerActionReason(event.target.value)} placeholder="Example: County portal requires the applicant to log in and sign the certification." /></label>}
          <label><span>Internal notes</span><textarea rows="5" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Private operating notes. Not shown to the homeowner." /></label>
        </section>

        <section className="conciergeAdminPanel">
          <div><p>OFFICIAL FILING ROUTE</p><h2>Verify before you promise who can submit.</h2></div>
          <label><span>Agency / permit authority</span><input value={agencyName} onChange={(event) => setAgencyName(event.target.value)} placeholder="County, town, state office…" /></label>
          <label><span>Official portal / application URL</span><input value={agencyUrl} onChange={(event) => setAgencyUrl(event.target.value)} placeholder="https://…" /></label>
          <label><span>Filing mode</span><select value={filingMode} onChange={(event) => setFilingMode(event.target.value)}>{FILING_MODES.map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          <div className={`playbookStatus ${playbook ? "verified" : "missing"}`}>
            <strong>{playbook ? "✓ Verified jurisdiction playbook found" : "! No verified playbook found"}</strong>
            <span>{playbook ? `${playbook.jurisdiction_label} · ${playbook.project_type}` : "Verify the jurisdiction, official sources, filing authority, required applicant actions, and document list before submitting or promising full filing."}</span>
          </div>
          {agencyUrl && <a href={agencyUrl} target="_blank" rel="noreferrer">Open official permit portal ↗</a>}
        </section>

        <section className="conciergeAdminPanel">
          <div><p>PAYMENT + AUTHORIZATION</p><h2>Service purchase and customer authorization.</h2></div>
          <dl className="conciergeSnapshot">
            <div><dt>Payment</dt><dd>{request?.payment_status || "—"}</dd></div>
            <div><dt>Base price</dt><dd>{permitOrder?.metadata?.base_price_cents ? `$${(Number(permitOrder.metadata.base_price_cents) / 100).toFixed(2)}` : (request?.service_fee_cents ? `$${(Number(request.service_fee_cents) / 100).toFixed(2)}` : "$0.00")}</dd></div>
            <div><dt>Project Pilot credit</dt><dd>{Number(permitOrder?.metadata?.credit_applied_cents || 0) > 0 ? `-$${(Number(permitOrder.metadata.credit_applied_cents) / 100).toFixed(2)}` : "$0.00"}</dd></div>
            <div><dt>Amount charged</dt><dd>{request?.service_fee_cents ? `$${(Number(request.service_fee_cents) / 100).toFixed(2)}` : "$0.00"}</dd></div>
            <div><dt>Paid at</dt><dd>{formatDate(request?.paid_at)}</dd></div>
            <div><dt>Stripe order</dt><dd>{permitOrder?.status || "—"}</dd></div>
          </dl>
          {permitOrder?.status === "paid" && ["requested", "intake_review"].includes(request?.status) && <button type="button" onClick={refundPermitService} disabled={saving}>Refund before substantive work</button>}
          <div><p>AUTHORIZATION</p><h2>What the customer authorized.</h2></div>
          {authorizations.length ? authorizations.map((auth) => <article className="authorizationRecord" key={auth.id}><strong>{auth.signer_name}</strong><span>{auth.signer_email}</span><small>Accepted {formatDate(auth.accepted_at)} · version {auth.authorization_version}</small><details><summary>Authorized scopes</summary><pre>{JSON.stringify(auth.scopes || {}, null, 2)}</pre></details></article>) : <div className="adminEmpty">No current authorization record. Do not perform full-service filing work until authorization is recorded.</div>}
        </section>

        <section className="conciergeAdminPanel">
          <div><p>APPLICATION SNAPSHOT</p><h2>Saved permit information.</h2></div>
          <dl className="conciergeSnapshot">
            <div><dt>Project type</dt><dd>{permitCase?.project_type || project?.project_type || "—"}</dd></div>
            <div><dt>Jurisdiction</dt><dd>{permitCase?.jurisdiction || "Needs verification"}</dd></div>
            <div><dt>Application route</dt><dd>{permitCase?.application_label || "—"}</dd></div>
            <div><dt>Government reference</dt><dd>{permitCase?.application_reference || "Not submitted"}</dd></div>
            <div><dt>Government fee</dt><dd>{permitCase?.government_fee_amount == null ? "Not recorded" : `$${Number(permitCase.government_fee_amount).toFixed(2)}`}</dd></div>
            <div><dt>Next action</dt><dd>{permitCase?.next_action || "Project Pilot operating review"}</dd></div>
          </dl>
        </section>
      </div>

      <section className="conciergeAdminPanel permitOpsFull">
        <div><p>WORK QUEUE</p><h2>Project Pilot tasks vs. customer-controlled actions.</h2></div>
        <div className="conciergeTaskCreate">
          <select value={newTaskOwner} onChange={(event) => setNewTaskOwner(event.target.value)}><option value="concierge">Project Pilot</option><option value="homeowner">Homeowner</option></select>
          <input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="Task title" />
          <input value={newTaskDue} onChange={(event) => setNewTaskDue(event.target.value)} type="date" />
          <textarea rows="2" value={newTaskText} onChange={(event) => setNewTaskText(event.target.value)} placeholder="Explain the task in plain language." />
          <button type="button" onClick={addTask} disabled={saving || !newTaskTitle.trim()}>Add task</button>
        </div>
        <div className="conciergeAdminTaskList">
          {tasks.map((task) => <article key={task.id}><div><small>{task.assigned_to === "homeowner" ? "CUSTOMER" : "PROJECT PILOT"}</small><strong>{task.title}</strong><p>{task.plain_language}</p>{task.due_at && <span>Due {formatDate(task.due_at)}</span>}</div><select value={task.status} onChange={(event) => updateTask(task,{ status:event.target.value })}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></article>)}
        </div>
      </section>

      <div className="conciergeAdminGrid">
        <section className="conciergeAdminPanel">
          <div><p>CORRECTIONS</p><h2>Turn reviewer comments into a managed response.</h2></div>
          <label><span>Government correction notice</span><textarea rows="4" value={correctionNotice} onChange={(event) => setCorrectionNotice(event.target.value)} placeholder="Paste or summarize the reviewer comments." /></label>
          <label><span>Plain-English customer summary</span><textarea rows="3" value={correctionSummary} onChange={(event) => setCorrectionSummary(event.target.value)} placeholder="What Project Pilot is doing about it." /></label>
          <label><span>Response due date</span><input type="date" value={correctionDue} onChange={(event) => setCorrectionDue(event.target.value)} /></label>
          <button type="button" onClick={addCorrection} disabled={saving || !correctionNotice.trim()}>Add correction round</button>
          <div className="permitOpsRecords">{corrections.map((item) => <article key={item.id}><strong>Round {item.round_number}</strong><p>{item.plain_language_summary || item.notice_text}</p><small>{formatDate(item.received_at)}</small><select value={item.status} onChange={(event) => updateCorrectionStatus(item, event.target.value)} disabled={saving}><option value="received">Received</option><option value="reviewing">Reviewing</option><option value="waiting_on_homeowner">Waiting on homeowner</option><option value="response_ready">Response ready</option><option value="resubmitted">Resubmitted</option><option value="resolved">Resolved</option></select></article>)}</div>
        </section>

        <section className="conciergeAdminPanel">
          <div><p>INSPECTIONS + CLOSEOUT</p><h2>Track the permit after approval too.</h2></div>
          <label><span>Inspection type</span><input value={inspectionType} onChange={(event) => setInspectionType(event.target.value)} placeholder="Footing, framing, final…" /></label>
          <label><span>Scheduled date/time</span><input type="datetime-local" value={inspectionDate} onChange={(event) => setInspectionDate(event.target.value)} /></label>
          <button type="button" onClick={addInspection} disabled={saving || !inspectionType.trim()}>Add inspection</button>
          <div className="permitOpsRecords">{inspections.map((item) => <article key={item.id}><strong>{item.inspection_type}</strong><p>{item.result_notes || item.homeowner_preparation || "No result notes yet."}</p><small>{item.scheduled_at ? formatDate(item.scheduled_at) : "Not scheduled"}</small><select value={item.status} onChange={(event) => updateInspectionStatus(item, event.target.value)} disabled={saving}><option value="not_ready">Not ready</option><option value="ready_to_schedule">Ready to schedule</option><option value="scheduled">Scheduled</option><option value="passed">Passed</option><option value="failed">Failed / correction</option><option value="not_required">Not required</option><option value="cancelled">Cancelled</option></select></article>)}</div>
        </section>
      </div>

      <section className="conciergeAdminPanel permitOpsFull">
        <div><p>CUSTOMER COMMUNICATION</p><h2>Keep every permit update attached to the case.</h2></div>
        <div className="conciergeAdminMessages">{messages.map((message) => <article className={message.sender_role === "homeowner" ? "fromHomeowner" : "fromConcierge"} key={message.id}><strong>{message.sender_role === "homeowner" ? "Homeowner" : message.sender_role === "concierge" ? "Permit Concierge" : "Project Pilot"}</strong><p>{message.body}</p><small>{formatDate(message.created_at)}</small></article>)}</div>
        <textarea rows="3" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Send a clear status update or request only what the homeowner must personally do." />
        <button type="button" onClick={sendMessage} disabled={saving || !messageText.trim()}>Send update</button>
      </section>

      <section className="conciergeAdminPanel permitOpsFull">
        <div><p>AUDIT TIMELINE</p><h2>What happened and when.</h2></div>
        <div className="permitOpsTimeline">{events.map((event) => <article key={event.id}><small>{formatDate(event.created_at)}</small><div><strong>{event.title}</strong><p>{event.detail}</p><span>{event.visible_to_homeowner ? "Visible to homeowner" : "Internal"}</span></div></article>)}{!events.length && <div className="adminEmpty">No permit operations timeline events yet.</div>}</div>
      </section>
    </main>
  );
}
