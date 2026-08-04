"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  buildPermitApplicationPacket,
  buildPacketHtml,
  buildPortalCsv,
  groupPacketFields,
  packetFileBase,
} from "../lib/permit-application-builder";
import styles from "./PermitApplicationBuilder.module.css";

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) return "Not generated yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not generated yet" : date.toLocaleString();
}

export default function PermitApplicationBuilder({ project, user, permitResult }) {
  const [permitCase, setPermitCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [portalProgress, setPortalProgress] = useState({});
  const [activePanel, setActivePanel] = useState("review");

  useEffect(() => {
    loadCase();
  }, [project?.id, user?.id]);

  async function loadCase() {
    if (!project?.id || !user?.id) return;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("permit_cases")
      .select("*")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError) setError(loadError.message || "Permit application data could not be opened.");
    else if (data) {
      setPermitCase(data);
      setReviewName(data.applicant_review_name || data.authorization_name || "");
      setReviewAccepted(Boolean(data.applicant_review_confirmed_at));
      setPortalProgress(data.portal_field_progress || {});
    }
    setLoading(false);
  }

  const packet = useMemo(
    () => permitCase ? buildPermitApplicationPacket({ permitCase, project, user, permitResult }) : null,
    [permitCase, project, user, permitResult]
  );
  const groupedFields = useMemo(() => groupPacketFields(packet?.fields || []), [packet]);
  const completedPortalFields = Object.values(portalProgress || {}).filter(Boolean).length;
  const portalTotal = packet?.portalFields?.length || 0;

  async function savePacket() {
    if (!permitCase?.id || !packet) return;
    if (!reviewName.trim() || !reviewAccepted) {
      setError("Enter the applicant name and confirm the review before generating the application packet.");
      return;
    }
    setSaving("packet");
    setError("");
    setNotice("");
    const generatedAt = new Date().toISOString();
    const snapshot = { ...packet, generatedAt, applicantReviewName: reviewName.trim() };

    const { data, error: updateError } = await supabase
      .from("permit_cases")
      .update({
        packet_snapshot: snapshot,
        application_packet_version: snapshot.version,
        application_packet_generated_at: generatedAt,
        application_packet_status: snapshot.ready ? "ready" : "draft",
        applicant_review_name: reviewName.trim(),
        applicant_review_confirmed_at: generatedAt,
        updated_at: generatedAt,
      })
      .eq("id", permitCase.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      const message = String(updateError.message || "");
      setError(message.includes("application_packet") || message.includes("applicant_review") ? "Permit Application Builder needs Supabase migration 015. Run the included SQL, then refresh." : message);
      setSaving("");
      return;
    }

    const { error: exportError } = await supabase.from("permit_application_exports").insert({
      permit_case_id: permitCase.id,
      project_id: project.id,
      user_id: user.id,
      export_type: "packet_snapshot",
      packet_version: snapshot.version,
      packet_snapshot: snapshot,
      created_at: generatedAt,
    });

    if (exportError) {
      setError(exportError.message.includes("permit_application_exports") ? "The packet was saved, but the export log needs migration 015. Run the included SQL." : exportError.message);
    } else {
      setNotice(snapshot.ready ? "Submission-ready application packet generated and saved." : `Draft packet generated. ${snapshot.missingFields.length} required answer(s) and ${snapshot.missingDocuments.length} required document(s) are still missing.`);
    }
    setPermitCase(data);
    setActivePanel("packet");
    setSaving("");
  }

  function downloadPacket() {
    if (!packet) return;
    downloadFile(`${packetFileBase(packet)}-permit-application.html`, buildPacketHtml(packet), "text/html;charset=utf-8");
  }

  function downloadFieldMap() {
    if (!packet) return;
    downloadFile(`${packetFileBase(packet)}-portal-field-map.csv`, buildPortalCsv(packet), "text/csv;charset=utf-8");
  }

  function downloadJson() {
    if (!packet) return;
    downloadFile(`${packetFileBase(packet)}-permit-packet.json`, JSON.stringify(packet, null, 2), "application/json;charset=utf-8");
  }

  async function copyValue(value) {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setNotice("Prepared value copied. Paste it into the matching official portal field.");
    } catch {
      setError("The browser blocked copying. Select and copy the value manually.");
    }
  }

  async function savePortalProgress(nextProgress) {
    if (!permitCase?.id) return;
    setPortalProgress(nextProgress);
    const status = Object.values(nextProgress).filter(Boolean).length >= portalTotal && portalTotal > 0 ? "portal_entry" : permitCase.application_packet_status || "draft";
    const { data, error: progressError } = await supabase
      .from("permit_cases")
      .update({ portal_field_progress: nextProgress, application_packet_status: status, updated_at: new Date().toISOString() })
      .eq("id", permitCase.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (progressError) setError(progressError.message.includes("portal_field_progress") ? "Portal progress saving needs migration 015." : progressError.message);
    else setPermitCase(data);
  }

  function togglePortalField(id) {
    const next = { ...portalProgress, [id]: !portalProgress?.[id] };
    savePortalProgress(next);
  }

  if (loading) return <section className={styles.builder}><div className={styles.loading}>Opening Permit Application Builder…</div></section>;

  if (!permitCase) {
    return (
      <section className={styles.builder}>
        <div className={styles.emptyState}>
          <p>PERMIT APPLICATION BUILDER</p>
          <h2>Start Permit Autopilot first.</h2>
          <span>Complete the permit route and application interview above. Project Pilot will then turn those answers into a reviewed application packet and assisted portal-entry workspace.</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.builder}>
      <div className={styles.hero}>
        <div>
          <p>PERMIT APPLICATION BUILDER</p>
          <h2>Answer once. Build the application. Enter the official portal with everything prepared.</h2>
          <span>Project Pilot converts the saved permit interview into a structured application packet, document manifest, and field-by-field portal entry guide.</span>
        </div>
        <div className={styles.scoreCard}><strong>{packet?.completion || 0}%</strong><span>Application package readiness</span><small>{packet?.jurisdiction}</small></div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      <div className={styles.tabRow}>
        <button type="button" className={activePanel === "review" ? styles.activeTab : ""} onClick={() => setActivePanel("review")}>1. Review application</button>
        <button type="button" className={activePanel === "packet" ? styles.activeTab : ""} onClick={() => setActivePanel("packet")}>2. Generate packet</button>
        <button type="button" className={activePanel === "portal" ? styles.activeTab : ""} onClick={() => setActivePanel("portal")}>3. Assisted portal entry</button>
      </div>

      {activePanel === "review" && (
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><small>APPLICATION REVIEW</small><h3>Review every prepared answer before the packet is generated.</h3></div><span>{packet?.missingFields.length || 0} required answer(s) missing</span></div>
          {Object.entries(groupedFields).map(([section, fields]) => (
            <section className={styles.fieldSection} key={section}>
              <h4>{section}</h4>
              <div className={styles.fieldGrid}>
                {fields.map((field) => <article className={!field.value && field.required ? styles.missingField : ""} key={`${section}-${field.key}`}><small>{field.label}{field.required ? " *" : ""}</small><strong>{field.value || "Not provided"}</strong><span>{field.source}</span></article>)}
              </div>
            </section>
          ))}
          <section className={styles.documentReview}>
            <div><small>DOCUMENT MANIFEST</small><h3>Required supporting documents</h3></div>
            <div className={styles.documentList}>{packet?.documents.map((document) => <article key={document.key}><b className={document.linked ? styles.readyDot : styles.missingDot}>{document.linked ? "✓" : "!"}</b><span><strong>{document.label}</strong><small>{document.linked ? "Linked to this permit case" : "Still required"}</small></span></article>)}</div>
          </section>
          <div className={styles.reviewConfirm}>
            <label><span>Applicant reviewing this packet</span><input value={reviewName} onChange={(event) => setReviewName(event.target.value)} placeholder="Full legal name" /></label>
            <label className={styles.checkLabel}><input type="checkbox" checked={reviewAccepted} onChange={(event) => setReviewAccepted(event.target.checked)} /><span>I reviewed the prepared information and understand that I must personally complete any required identity, certification, signature, payment, or professional-license step.</span></label>
            <button type="button" onClick={savePacket} disabled={saving === "packet"}>{saving === "packet" ? "Generating application packet…" : "Generate Permit Application Packet"}</button>
          </div>
        </div>
      )}

      {activePanel === "packet" && (
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><small>SUBMISSION PACKAGE</small><h3>Your prepared permit application package.</h3></div><span>{permitCase.application_packet_status || "Not generated"}</span></div>
          <div className={styles.packetSummary}>
            <article><small>PACKET VERSION</small><strong>{permitCase.application_packet_version || packet?.version}</strong></article>
            <article><small>LAST GENERATED</small><strong>{formatDate(permitCase.application_packet_generated_at)}</strong></article>
            <article><small>APPLICATION ROUTE</small><strong>{packet?.applicationLabel}</strong></article>
            <article><small>SUBMISSION METHOD</small><strong>{packet?.submissionMethod}</strong></article>
          </div>
          <div className={styles.downloadGrid}>
            <button type="button" onClick={downloadPacket}><strong>Download Application Packet</strong><span>Printable HTML packet with all prepared answers and document status.</span></button>
            <button type="button" onClick={downloadFieldMap}><strong>Download Portal Field Map</strong><span>CSV mapping official portal labels to Project Pilot values.</span></button>
            <button type="button" onClick={downloadJson}><strong>Download Structured Packet</strong><span>Machine-readable JSON for future form and portal integrations.</span></button>
          </div>
          <div className={styles.boundaryNote}><strong>Project Pilot prepares the application.</strong><span>The governing portal remains the official submission system unless a jurisdiction integration or authorized Permit Concierge filing route is available.</span></div>
          <button type="button" className={styles.nextButton} onClick={() => setActivePanel("portal")}>Continue to Assisted Portal Entry →</button>
        </div>
      )}

      {activePanel === "portal" && (
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><small>ASSISTED PORTAL ENTRY</small><h3>Complete the official application without rethinking every answer.</h3></div><span>{completedPortalFields} of {portalTotal} fields entered</span></div>
          <div className={styles.portalTop}>
            <div><strong>{packet?.applicationLabel}</strong><span>{packet?.jurisdiction}</span></div>
            {packet?.applicationUrl ? <a href={packet.applicationUrl} target="_blank" rel="noreferrer">Open Official Application ↗</a> : <span className={styles.noLink}>Official link needs confirmation</span>}
          </div>
          <div className={styles.portalProgress}><i style={{ width: `${portalTotal ? Math.round((completedPortalFields / portalTotal) * 100) : 0}%` }} /></div>
          <div className={styles.portalFields}>
            {packet?.portalFields.map((field) => (
              <article className={portalProgress?.[field.id] ? styles.portalDone : ""} key={field.id}>
                <label><input type="checkbox" checked={Boolean(portalProgress?.[field.id])} onChange={() => togglePortalField(field.id)} /><span>Entered</span></label>
                <div><small>{field.section}</small><strong>{field.portalLabel}{field.required ? " *" : ""}</strong><span>From: {field.projectPilotLabel}</span></div>
                <code>{field.value || "Not provided"}</code>
                <button type="button" onClick={() => copyValue(field.value)} disabled={!field.value}>Copy</button>
              </article>
            ))}
          </div>
          <div className={styles.finalActions}>
            <h4>The applicant still completes these controlled actions:</h4>
            <ul>{packet?.legalActionsRemaining.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      )}
    </section>
  );
}
