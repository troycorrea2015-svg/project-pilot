"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  buildPermitBlueprint,
  calculatePermitReadiness,
  questionIsRequired,
  statusLabel,
} from "../lib/permit-autopilot";
import styles from "./PermitAutopilot.module.css";

const STEPS = [
  ["route", "1", "Permit Route"],
  ["interview", "2", "Application Interview"],
  ["documents", "3", "Documents"],
  ["review", "4", "Review & Authorize"],
  ["track", "5", "Submit & Track"],
];

function clean(value, maximum = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appendActivity(current, event) {
  const existing = Array.isArray(current) ? current : [];
  return [
    ...existing,
    {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      ...event,
    },
  ].slice(-100);
}

export default function PermitAutopilot({ project, user, permitResult, onOpenDocuments }) {
  const [permitCase, setPermitCase] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeStep, setActiveStep] = useState("route");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [answers, setAnswers] = useState({});
  const [documentLinks, setDocumentLinks] = useState({});
  const [authorizationName, setAuthorizationName] = useState("");
  const [authorizationChecked, setAuthorizationChecked] = useState(false);
  const [applicationReference, setApplicationReference] = useState("");
  const [governmentFeeAmount, setGovernmentFeeAmount] = useState("");
  const [governmentFeeStatus, setGovernmentFeeStatus] = useState("unknown");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDue, setNextActionDue] = useState("");
  const [correctionText, setCorrectionText] = useState("");
  const [correctionLoading, setCorrectionLoading] = useState(false);

  const blueprint = useMemo(
    () => buildPermitBlueprint({ project, permitResult, user }),
    [project, permitResult, user]
  );
  const readiness = useMemo(
    () => calculatePermitReadiness({
      permitCase: permitCase ? { ...permitCase, answers, document_links: documentLinks } : null,
      blueprint,
    }),
    [permitCase, answers, documentLinks, blueprint]
  );

  useEffect(() => {
    loadPermitCase();
  }, [project?.id, user?.id]);

  async function loadPermitCase() {
    if (!project?.id || !user?.id) return;
    setLoading(true);
    setError("");

    const [caseResult, documentResult] = await Promise.all([
      supabase
        .from("permit_cases")
        .select("*")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("project_documents")
        .select("id,file_name,file_type,created_at")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (caseResult.error) {
      const message = String(caseResult.error.message || "");
      setError(
        message.includes("permit_cases")
          ? "Permit Autopilot needs the Sprint 3.1 Supabase migration. Run migration 012, then refresh this project."
          : message
      );
    } else if (caseResult.data) {
      setPermitCase(caseResult.data);
      setAnswers(caseResult.data.answers || {});
      setDocumentLinks(caseResult.data.document_links || {});
      setAuthorizationName(caseResult.data.authorization_name || "");
      setAuthorizationChecked(Boolean(caseResult.data.authorization_confirmed_at));
      setApplicationReference(caseResult.data.application_reference || "");
      setGovernmentFeeAmount(caseResult.data.government_fee_amount ?? "");
      setGovernmentFeeStatus(caseResult.data.government_fee_status || "unknown");
      setNextAction(caseResult.data.next_action || "");
      setNextActionDue(caseResult.data.next_action_due || "");
    }

    if (!documentResult.error) setDocuments(documentResult.data || []);
    setLoading(false);
  }

  async function startAutopilot() {
    if (!permitResult) {
      setError("Run the permit check first so Project Pilot can match the responsible authority and official application route.");
      return;
    }

    setSaving("start");
    setError("");
    setNotice("");
    const now = new Date().toISOString();
    const initialAnswers = {
      ...blueprint.prefilledAnswers,
      applicant_email: blueprint.prefilledAnswers.applicant_email || user?.email || "",
    };
    const activity = appendActivity([], {
      type: "created",
      title: "Permit Autopilot started",
      detail: `Project routed to ${blueprint.jurisdiction}.`,
    });

    const { data, error: insertError } = await supabase
      .from("permit_cases")
      .insert({
        project_id: project.id,
        user_id: user.id,
        project_type: blueprint.projectType,
        jurisdiction: blueprint.jurisdiction,
        jurisdiction_confidence: blueprint.jurisdictionConfidence,
        application_url: blueprint.applicationUrl,
        application_label: blueprint.applicationLabel,
        submission_method: blueprint.submissionMethod,
        status: "collecting",
        answers: initialAnswers,
        checklist: blueprint.checklist,
        document_links: {},
        inspections: blueprint.inspections,
        corrections: [],
        activity,
        readiness_score: 0,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setPermitCase(data);
      setAnswers(initialAnswers);
      setDocumentLinks({});
      setActiveStep("interview");
      setNotice("Permit Autopilot created the application interview and document checklist for this project.");
    }
    setSaving("");
  }

  async function updateCase(patch, successMessage = "Permit case updated.") {
    if (!permitCase?.id) return null;
    setSaving("case");
    setError("");
    const update = { ...patch, updated_at: new Date().toISOString() };
    const { data, error: updateError } = await supabase
      .from("permit_cases")
      .update(update)
      .eq("id", permitCase.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      setSaving("");
      return null;
    }

    setPermitCase(data);
    if (data.answers) setAnswers(data.answers);
    if (data.document_links) setDocumentLinks(data.document_links);
    setNotice(successMessage);
    setSaving("");
    return data;
  }

  async function saveInterview() {
    const computed = calculatePermitReadiness({
      permitCase: { ...permitCase, answers, document_links: documentLinks },
      blueprint,
    });
    const status = computed.missingAnswers.length ? "collecting" : "ready_for_review";
    const activity = appendActivity(permitCase.activity, {
      type: "interview",
      title: "Application interview saved",
      detail: computed.missingAnswers.length
        ? `${computed.missingAnswers.length} required answer${computed.missingAnswers.length === 1 ? " remains" : "s remain"}.`
        : "All currently required application answers are complete.",
    });
    const updated = await updateCase(
      { answers, readiness_score: computed.score, status, activity },
      "Application answers saved."
    );
    if (updated) setActiveStep("documents");
  }

  async function saveDocumentLinks() {
    const computed = calculatePermitReadiness({
      permitCase: { ...permitCase, answers, document_links: documentLinks },
      blueprint,
    });
    const activity = appendActivity(permitCase.activity, {
      type: "documents",
      title: "Document checklist updated",
      detail: computed.missingDocuments.length
        ? `${computed.missingDocuments.length} required document${computed.missingDocuments.length === 1 ? " remains" : "s remain"}.`
        : "All currently required documents are linked.",
    });
    const updated = await updateCase(
      { document_links: documentLinks, readiness_score: computed.score, activity },
      "Permit document checklist saved."
    );
    if (updated) setActiveStep("review");
  }

  async function authorizePacket() {
    const typedName = clean(authorizationName, 200);
    if (!authorizationChecked || typedName.length < 3) {
      setError("Confirm the authorization statement and type the applicant's full name.");
      return;
    }
    if (readiness.missingAnswers.length || readiness.missingDocuments.length) {
      setError("Complete the required answers and link the required documents before authorization.");
      return;
    }

    const now = new Date().toISOString();
    const activity = appendActivity(permitCase.activity, {
      type: "authorization",
      title: "Homeowner authorized the permit package",
      detail: `Authorized by ${typedName}.`,
    });
    const updated = await updateCase(
      {
        authorization_name: typedName,
        authorization_confirmed_at: now,
        status: "authorized",
        readiness_score: 100,
        packet_snapshot: buildPacketSnapshot(typedName),
        activity,
      },
      "Permit package authorized and ready for guided submission."
    );
    if (updated) setActiveStep("track");
  }

  function buildPacketSnapshot(authorizedBy = permitCase?.authorization_name || "") {
    return {
      generated_at: new Date().toISOString(),
      project: {
        title: project?.title || "Untitled project",
        type: project?.project_type || blueprint.projectType,
        address: project?.address || project?.location_label || "",
        description: project?.description || "",
        budget: project?.budget || null,
      },
      jurisdiction: blueprint.jurisdiction,
      application: {
        label: blueprint.applicationLabel,
        url: blueprint.applicationUrl,
        method: blueprint.submissionMethod,
      },
      answers,
      document_links: documentLinks,
      checklist: blueprint.checklist,
      inspections: permitCase?.inspections || blueprint.inspections,
      fees: {
        amount: governmentFeeAmount || permitCase?.government_fee_amount || null,
        status: governmentFeeStatus || permitCase?.government_fee_status || "unknown",
      },
      next_action: nextAction || permitCase?.next_action || "",
      next_action_due: nextActionDue || permitCase?.next_action_due || "",
      authorization: {
        name: authorizedBy,
        confirmed_at: permitCase?.authorization_confirmed_at || new Date().toISOString(),
      },
    };
  }

  function openPermitPacket() {
    const snapshot = permitCase?.packet_snapshot || buildPacketSnapshot();
    const linkedDocuments = blueprint.checklist.map((item) => {
      const documentId = documentLinks[item.key];
      const document = documents.find((entry) => entry.id === documentId);
      return { ...item, fileName: document?.file_name || "Not linked" };
    });
    const answerRows = blueprint.questions.map((question) => [question.label, answers[question.key] || "Not provided"]);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Permit Packet - ${escapeHtml(project?.title)}</title><style>
      body{font-family:Arial,sans-serif;color:#1d2b3f;margin:0;background:#eef3f8}main{max-width:900px;margin:24px auto;background:#fff;padding:40px;box-shadow:0 10px 30px #ccd5df}h1{font-size:30px;margin:0 0 6px}h2{margin-top:30px;border-bottom:2px solid #d9e4f2;padding-bottom:8px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}.box{padding:12px;background:#f5f8fc;border:1px solid #dce5ef;border-radius:8px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #e3e9f0;vertical-align:top}th{width:38%;color:#53647a}.notice{padding:14px;background:#fff8e8;border:1px solid #ecd18b;border-radius:8px}.footer{margin-top:30px;font-size:11px;color:#68778c}@media print{body{background:#fff}main{box-shadow:none;margin:0;max-width:none}.noPrint{display:none}}</style></head><body><main>
      <button class="noPrint" onclick="window.print()">Print / Save as PDF</button>
      <h1>Project Pilot Permit Preparation Packet</h1><p>Prepared ${escapeHtml(formatDate(snapshot.generated_at))}</p>
      <div class="notice"><strong>Important:</strong> This packet organizes homeowner-provided information and official starting points. It is not a government approval, professional seal, or substitute for the responsible authority's current requirements.</div>
      <h2>Project and route</h2><div class="meta">
        <div class="box"><strong>Project</strong><br>${escapeHtml(project?.title || "Untitled project")}</div>
        <div class="box"><strong>Property</strong><br>${escapeHtml(project?.address || project?.location_label || "Not provided")}</div>
        <div class="box"><strong>Authority</strong><br>${escapeHtml(blueprint.jurisdiction)}</div>
        <div class="box"><strong>Application route</strong><br>${escapeHtml(blueprint.applicationLabel)}</div>
      </div>
      <h2>Application interview</h2><table>${answerRows.map(([label,value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
      <h2>Document checklist</h2><table>${linkedDocuments.map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.fileName)}</td></tr>`).join("")}</table>
      <h2>Anticipated inspections</h2><table>${(permitCase?.inspections || blueprint.inspections).map((item) => `<tr><th>${escapeHtml(item.name)}</th><td>${escapeHtml(item.status || "not_scheduled")}${item.scheduled_at ? ` - ${escapeHtml(item.scheduled_at)}` : ""}</td></tr>`).join("")}</table>
      <h2>Fees and next action</h2><table><tr><th>Government fee</th><td>${escapeHtml(governmentFeeAmount || permitCase?.government_fee_amount || "Not recorded")} (${escapeHtml(governmentFeeStatus || permitCase?.government_fee_status || "unknown")})</td></tr><tr><th>Next action</th><td>${escapeHtml(nextAction || permitCase?.next_action || "Not recorded")}</td></tr><tr><th>Due date</th><td>${escapeHtml(nextActionDue || permitCase?.next_action_due || "Not recorded")}</td></tr></table>
      <h2>Authorization</h2><p>Authorized by <strong>${escapeHtml(permitCase?.authorization_name || authorizationName || "Not authorized")}</strong> on ${escapeHtml(formatDate(permitCase?.authorization_confirmed_at))}.</p>
      <p class="footer">Project Pilot does not impersonate the applicant, sign professional certifications, or guarantee acceptance. The applicant must review all information and complete any identity, signature, notarization, payment, or licensed-professional steps required by the authority.</p>
      </main></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const packetWindow = window.open(url, "_blank");
    if (packetWindow) packetWindow.opener = null;
    if (!packetWindow) setError("Your browser blocked the permit packet window. Allow pop-ups for Project Pilot and try again.");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function requestConcierge() {
    const activity = appendActivity(permitCase.activity, {
      type: "concierge",
      title: "Permit Concierge review requested",
      detail: "The case is waiting for a Project Pilot administrator to review the prepared package and available submission route.",
    });
    await updateCase(
      { concierge_requested_at: new Date().toISOString(), status: "concierge_requested", activity },
      "Permit Concierge review requested. This does not submit the application yet."
    );
  }

  async function markSubmitted() {
    if (!permitCase?.authorization_confirmed_at) {
      setError("Authorize the permit package before marking it submitted.");
      return;
    }
    const reference = clean(applicationReference, 200);
    if (!reference) {
      setError("Enter the application or confirmation number supplied by the permit portal.");
      return;
    }
    const now = new Date().toISOString();
    const activity = appendActivity(permitCase.activity, {
      type: "submission",
      title: "Permit application marked submitted",
      detail: `Reference: ${reference}`,
    });
    await updateCase(
      { status: "submitted", submitted_at: now, application_reference: reference, activity },
      "Submission recorded. Project Pilot will keep the application reference and next actions together."
    );
  }

  async function setCaseStatus(status, detail) {
    const activity = appendActivity(permitCase.activity, {
      type: "status",
      title: `Permit status changed to ${statusLabel(status)}`,
      detail: detail || "Status updated by the homeowner.",
    });
    const patch = { status, activity };
    if (status === "approved") patch.approved_at = new Date().toISOString();
    if (status === "closed") patch.closed_at = new Date().toISOString();
    await updateCase(patch, `Permit status updated to ${statusLabel(status)}.`);
  }

  async function saveFeesAndNextAction() {
    const amount = governmentFeeAmount === "" ? null : Number(governmentFeeAmount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setError("Enter a valid government fee amount or leave it blank.");
      return;
    }
    const paidAt = governmentFeeStatus === "paid" ? (permitCase.government_fee_paid_at || new Date().toISOString()) : null;
    const activity = appendActivity(permitCase.activity, {
      type: "fees",
      title: "Permit fees and next action updated",
      detail: `${governmentFeeStatus === "paid" ? "Government fee marked paid" : `Fee status: ${governmentFeeStatus}`}.${nextAction ? ` Next action: ${nextAction}` : ""}`,
    });
    await updateCase({
      government_fee_amount: amount,
      government_fee_status: governmentFeeStatus,
      government_fee_paid_at: paidAt,
      next_action: clean(nextAction, 1000),
      next_action_due: nextActionDue || null,
      activity,
    }, "Permit fees and next action saved.");
  }

  async function analyzeCorrection() {
    const noticeText = clean(correctionText, 7000);
    if (noticeText.length < 20) {
      setError("Paste the correction notice or reviewer comments before asking Su to prepare a response.");
      return;
    }
    setCorrectionLoading(true);
    setError("");
    setNotice("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again and retry.");
      const response = await fetch("/api/permit-autopilot/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caseId: permitCase.id, correctionText: noticeText }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Su could not analyze the correction notice.");
      const correction = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        notice: noticeText,
        explanation: result.explanation,
        action_items: result.actionItems || [],
        response_draft: result.responseDraft,
        professional_review: result.professionalReview || "",
        status: "open",
      };
      const corrections = [...(permitCase.corrections || []), correction];
      const activity = appendActivity(permitCase.activity, {
        type: "correction",
        title: "Correction notice analyzed by Su",
        detail: result.explanation,
      });
      await updateCase(
        { corrections, status: "correction_required", activity },
        "Su translated the correction notice and prepared the response steps."
      );
      setCorrectionText("");
    } catch (correctionError) {
      setError(correctionError.message || "Su could not analyze the correction notice.");
    } finally {
      setCorrectionLoading(false);
    }
  }

  async function updateInspection(inspectionId, patch) {
    const inspections = (permitCase.inspections || blueprint.inspections).map((item) =>
      item.id === inspectionId ? { ...item, ...patch } : item
    );
    const allPassed = inspections.length > 0 && inspections.every((item) => item.status === "passed");
    const activity = appendActivity(permitCase.activity, {
      type: "inspection",
      title: "Inspection plan updated",
      detail: allPassed ? "All listed inspections are marked passed." : "Inspection status or schedule changed.",
    });
    await updateCase(
      { inspections, status: allPassed ? "closed" : "inspection", activity, ...(allPassed ? { closed_at: new Date().toISOString() } : {}) },
      allPassed ? "All listed inspections passed. The permit case is ready to close." : "Inspection plan saved."
    );
  }

  if (loading) {
    return <section className={styles.loading}>Opening Permit Autopilot…</section>;
  }

  return (
    <section className={styles.autopilot}>
      <header className={styles.hero}>
        <div>
          <p>SPRINT 3.1 · PERMIT AUTOPILOT</p>
          <h2>Project Pilot prepares the permit process with the homeowner.</h2>
          <span>Match the authority, collect the application answers, organize documents, prepare a review packet, guide submission, translate corrections, and track inspections.</span>
        </div>
        {permitCase ? (
          <div className={styles.scoreCard}>
            <strong>{readiness.score}%</strong>
            <span>Permit readiness</span>
            <small>{statusLabel(permitCase.status)}</small>
          </div>
        ) : (
          <button type="button" onClick={startAutopilot} disabled={saving === "start" || !permitResult}>
            {saving === "start" ? "Building permit workflow…" : "Start Permit Autopilot"}
          </button>
        )}
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      {!permitResult && !permitCase && (
        <div className={styles.needsRoute}>
          <strong>Permit route needed first.</strong>
          <span>Use the Permit Check below to confirm the property address and responsible authority. Then start Permit Autopilot.</span>
        </div>
      )}

      {permitCase && (
        <>
          <nav className={styles.steps} aria-label="Permit Autopilot steps">
            {STEPS.map(([key, number, label]) => (
              <button
                type="button"
                key={key}
                className={activeStep === key ? styles.activeStep : ""}
                onClick={() => setActiveStep(key)}
              >
                <span>{number}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </nav>

          {activeStep === "route" && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}><div><p>PERMIT ROUTE</p><h3>Who handles this project?</h3></div><span>{String(blueprint.jurisdictionConfidence).toUpperCase()} MATCH</span></div>
              <div className={styles.routeGrid}>
                <article><small>GOVERNING AUTHORITY</small><strong>{blueprint.jurisdiction}</strong><p>{permitResult?.jurisdictionReason || "Confirm the responsible office before final submission."}</p></article>
                <article><small>OFFICIAL APPLICATION</small><strong>{blueprint.applicationLabel}</strong><p>{blueprint.submissionMethod}</p>{blueprint.applicationUrl && <a href={blueprint.applicationUrl} target="_blank" rel="noreferrer">Open official application ↗</a>}</article>
                <article><small>PROJECT TYPE</small><strong>{project?.project_type || blueprint.projectType}</strong><p>Permit Autopilot created a project-specific interview, document checklist, and anticipated inspection path.</p></article>
              </div>
              <div className={styles.boundaryNote}><strong>What Project Pilot can do</strong><span>Prepare, organize, check, draft, guide, and track. The homeowner or authorized professional still completes identity verification, signatures, government payments, seals, and portal steps required by the authority.</span></div>
              <button type="button" className={styles.primaryButton} onClick={() => setActiveStep("interview")}>Continue to application interview</button>
            </div>
          )}

          {activeStep === "interview" && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}><div><p>GUIDED APPLICATION INTERVIEW</p><h3>Answer once. Reuse across the permit package.</h3></div><span>{readiness.missingAnswers.length} required answers left</span></div>
              <div className={styles.questionGrid}>
                {blueprint.questions.map((question) => {
                  const required = questionIsRequired(question, answers);
                  return (
                    <label key={question.key} className={question.type === "textarea" ? styles.fullField : ""}>
                      <span>{question.label}{required ? " *" : ""}</span>
                      {question.type === "textarea" ? (
                        <textarea rows="4" value={answers[question.key] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))} />
                      ) : question.type === "select" ? (
                        <select value={answers[question.key] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}>
                          <option value="">Choose one</option>{question.options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      ) : question.type === "yesno" ? (
                        <select value={answers[question.key] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}>
                          <option value="">Choose one</option><option>Yes</option><option>No</option><option>Not sure</option>
                        </select>
                      ) : (
                        <input type={question.type || "text"} value={answers[question.key] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))} />
                      )}
                    </label>
                  );
                })}
              </div>
              <button type="button" className={styles.primaryButton} onClick={saveInterview} disabled={Boolean(saving)}>Save answers and continue</button>
            </div>
          )}

          {activeStep === "documents" && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}><div><p>DOCUMENT COMPLETENESS CHECK</p><h3>Link every required file to the application package.</h3></div><span>{readiness.missingDocuments.length} documents left</span></div>
              <div className={styles.documentList}>
                {blueprint.checklist.map((item) => (
                  <div key={item.key} className={documentLinks[item.key] ? styles.documentReady : styles.documentMissing}>
                    <span>{documentLinks[item.key] ? "✓" : "○"}</span>
                    <div><strong>{item.label}</strong><small>{item.source}{item.required ? " · Required" : " · Optional"}</small></div>
                    <select value={documentLinks[item.key] || ""} onChange={(event) => setDocumentLinks((current) => ({ ...current, [item.key]: event.target.value }))}>
                      <option value="">Not linked</option>
                      {documents.map((document) => <option key={document.id} value={document.id}>{document.file_name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className={styles.documentActions}>
                <button type="button" className={styles.secondaryButton} onClick={onOpenDocuments}>Upload or manage project documents</button>
                <button type="button" className={styles.primaryButton} onClick={saveDocumentLinks} disabled={Boolean(saving)}>Save document checklist</button>
              </div>
            </div>
          )}

          {activeStep === "review" && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}><div><p>REVIEW & AUTHORIZE</p><h3>Approve the prepared information before submission.</h3></div><span>{readiness.score}% ready</span></div>
              <div className={styles.readinessGrid}>
                <article><strong>{readiness.missingAnswers.length ? "Needs answers" : "Complete"}</strong><span>Application interview</span><small>{readiness.missingAnswers.length ? readiness.missingAnswers.map((item) => item.label).slice(0, 3).join(" · ") : "All required answers are present."}</small></article>
                <article><strong>{readiness.missingDocuments.length ? "Needs files" : "Complete"}</strong><span>Document package</span><small>{readiness.missingDocuments.length ? readiness.missingDocuments.map((item) => item.label).slice(0, 3).join(" · ") : "All required files are linked."}</small></article>
                <article><strong>{blueprint.jurisdiction}</strong><span>Matched authority</span><small>{blueprint.applicationLabel}</small></article>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={openPermitPacket}>Preview / print permit preparation packet</button>
              <label className={styles.authorizationCheck}>
                <input type="checkbox" checked={authorizationChecked} onChange={(event) => setAuthorizationChecked(event.target.checked)} />
                <span>I reviewed the information and authorize Project Pilot to prepare and organize this permit package. I understand Project Pilot will not impersonate me, create professional seals, pay government fees, or submit without an allowed workflow and my approval.</span>
              </label>
              <label className={styles.authorizationName}><span>Type the applicant's full name</span><input value={authorizationName} onChange={(event) => setAuthorizationName(event.target.value)} /></label>
              <button type="button" className={styles.primaryButton} onClick={authorizePacket} disabled={Boolean(saving)}>Authorize permit package</button>
            </div>
          )}

          {activeStep === "track" && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}><div><p>SUBMIT, CORRECT & INSPECT</p><h3>Keep the entire approval process in one place.</h3></div><span>{statusLabel(permitCase.status)}</span></div>

              <div className={styles.submissionGrid}>
                <article>
                  <small>GUIDED SUBMISSION</small><h4>{blueprint.applicationLabel}</h4><p>Open the official portal or form, use the prepared packet, complete any required identity/signature/payment steps, then save the confirmation number here.</p>
                  {blueprint.applicationUrl && <a href={blueprint.applicationUrl} target="_blank" rel="noreferrer">Open official application ↗</a>}
                  <label><span>Application / confirmation number</span><input value={applicationReference} onChange={(event) => setApplicationReference(event.target.value)} /></label>
                  <button type="button" className={styles.primaryButton} onClick={markSubmitted}>Mark submitted</button>
                </article>
                <article>
                  <small>PERMIT CONCIERGE</small><h4>Ask Project Pilot to review the package.</h4><p>This creates a review request. It does not claim that Project Pilot can file in a jurisdiction without the required authorization or agency workflow.</p>
                  <button type="button" className={styles.secondaryButton} onClick={requestConcierge}>Request concierge review</button>
                  {permitCase.concierge_requested_at && <span className={styles.timestamp}>Requested {formatDate(permitCase.concierge_requested_at)}</span>}
                </article>
              </div>

              <section className={styles.feeSection}>
                <div><p>FEES & NEXT ACTION</p><h4>Keep the money and deadline visible.</h4></div>
                <div className={styles.feeGrid}>
                  <label><span>Government fee amount</span><input type="number" min="0" step="0.01" value={governmentFeeAmount} onChange={(event) => setGovernmentFeeAmount(event.target.value)} /></label>
                  <label><span>Fee status</span><select value={governmentFeeStatus} onChange={(event) => setGovernmentFeeStatus(event.target.value)}><option value="unknown">Unknown</option><option value="quoted">Quoted / due</option><option value="paid">Paid</option><option value="waived">Waived</option></select></label>
                  <label className={styles.fullField}><span>Next required action</span><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Example: Upload revised footing detail" /></label>
                  <label><span>Action due date</span><input type="date" value={nextActionDue} onChange={(event) => setNextActionDue(event.target.value)} /></label>
                </div>
                <button type="button" className={styles.secondaryButton} onClick={saveFeesAndNextAction}>Save fees and next action</button>
              </section>

              <div className={styles.statusActions}>
                <button type="button" onClick={() => setCaseStatus("submitted")}>Submitted</button>
                <button type="button" onClick={() => setCaseStatus("correction_required")}>Correction requested</button>
                <button type="button" onClick={() => setCaseStatus("approved")}>Approved</button>
                <button type="button" onClick={() => setCaseStatus("inspection")}>Inspections underway</button>
                <button type="button" onClick={() => setCaseStatus("closed")}>Closed</button>
              </div>

              <section className={styles.correctionSection}>
                <div><p>SU CORRECTION ASSISTANT</p><h4>Paste the reviewer comments. Su translates them into action.</h4></div>
                <textarea rows="5" value={correctionText} onChange={(event) => setCorrectionText(event.target.value)} placeholder="Paste the correction notice, plan-review comments, or missing-information request here…" />
                <button type="button" className={styles.primaryButton} onClick={analyzeCorrection} disabled={correctionLoading}>{correctionLoading ? "Su is preparing the response…" : "Explain and prepare response"}</button>
                <div className={styles.correctionCards}>
                  {[...(permitCase.corrections || [])].reverse().map((correction) => (
                    <article key={correction.id}>
                      <header><strong>{formatDate(correction.created_at)}</strong><span>{correction.status || "open"}</span></header>
                      <p><b>What the reviewer means:</b> {correction.explanation}</p>
                      <div><b>Action items</b><ol>{(correction.action_items || []).map((item) => <li key={item}>{item}</li>)}</ol></div>
                      {correction.professional_review && <p><b>Professional review:</b> {correction.professional_review}</p>}
                      <details><summary>Draft response to the permit office</summary><pre>{correction.response_draft}</pre></details>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.inspectionSection}>
                <div><p>INSPECTION COORDINATION</p><h4>Schedule, prepare, and record each required inspection.</h4></div>
                {(permitCase.inspections || blueprint.inspections).map((inspection) => (
                  <div className={styles.inspectionRow} key={inspection.id}>
                    <strong>{inspection.name}</strong>
                    <select value={inspection.status || "not_scheduled"} onChange={(event) => updateInspection(inspection.id, { status: event.target.value })}>
                      <option value="not_scheduled">Not scheduled</option><option value="scheduled">Scheduled</option><option value="passed">Passed</option><option value="failed">Failed / correction</option><option value="not_required">Not required</option>
                    </select>
                    <input type="date" value={inspection.scheduled_at || ""} onChange={(event) => updateInspection(inspection.id, { scheduled_at: event.target.value, status: event.target.value ? "scheduled" : inspection.status })} />
                  </div>
                ))}
              </section>

              <section className={styles.activitySection}>
                <div><p>APPLICATION HISTORY</p><h4>Every major permit action stays attached to the project.</h4></div>
                <div>{[...(permitCase.activity || [])].reverse().map((event) => <article key={event.id}><span>{formatDate(event.at)}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div></article>)}</div>
              </section>
            </div>
          )}
        </>
      )}
    </section>
  );
}
