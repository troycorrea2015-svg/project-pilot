"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import styles from "./PermitConcierge.module.css";

const SERVICE_OPTIONS = [
  ["package_review", "Review my permit package", "Check answers, documents, route, and missing information."],
  ["form_preparation", "Prepare the application details", "Organize the information so I do not have to start from scratch."],
  ["agency_coordination", "Coordinate the filing process", "Help with portal steps, agency questions, deadlines, and status."],
  ["correction_management", "Handle correction follow-up", "Translate reviewer comments and prepare the response package."],
  ["inspection_coordination", "Guide inspections", "Track inspection steps and explain what must be ready."],
];

const STATUS_COPY = {
  requested: ["Request received", "Project Pilot has the case and can begin intake review."],
  intake_review: ["Reviewing your information", "The concierge is checking the permit route, answers, and documents."],
  preparing: ["Preparing the permit package", "Project Pilot is organizing the application information and filing materials."],
  waiting_on_homeowner: ["Your action is needed", "Complete the highlighted homeowner task so the concierge can continue."],
  ready_for_submission: ["Ready for the filing step", "The package is prepared. The next step may require your portal login, signature, identity check, or payment."],
  filing: ["Filing is in progress", "The concierge is coordinating the allowed submission steps."],
  submitted: ["Application submitted", "Project Pilot is tracking the reference number, corrections, and next deadline."],
  corrections: ["Reviewer correction received", "The concierge is helping organize the response and revised documents."],
  approved: ["Permit approved", "Project Pilot can now help track inspections and closeout."],
  closed: ["Concierge case complete", "The permit record remains attached to the project."],
  cancelled: ["Concierge request cancelled", "You can continue using the guided Permit Autopilot workflow."],
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PermitConcierge({ project, user, permitCase, readiness, onPermitCaseUpdated }) {
  const [request, setRequest] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedServices, setSelectedServices] = useState([
    "package_review",
    "form_preparation",
    "agency_coordination",
  ]);
  const [preferredContact, setPreferredContact] = useState("email");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState("");
  const [bestContactTime, setBestContactTime] = useState("");
  const [homeownerNotes, setHomeownerNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    loadConcierge();
  }, [permitCase?.id, user?.id]);

  const homeownerTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === "homeowner" && !["completed", "cancelled"].includes(task.status)),
    [tasks]
  );
  const conciergeTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === "concierge" && !["completed", "cancelled"].includes(task.status)),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "completed"),
    [tasks]
  );

  async function loadConcierge() {
    if (!permitCase?.id || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    const { data: requestData, error: requestError } = await supabase
      .from("permit_concierge_requests")
      .select("*")
      .eq("permit_case_id", permitCase.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (requestError) {
      const message = String(requestError.message || "");
      setError(
        message.includes("permit_concierge_requests")
          ? "Permit Concierge needs migration 013 in Supabase. Run it once, then refresh."
          : message
      );
      setLoading(false);
      return;
    }

    setRequest(requestData || null);
    if (requestData) {
      setSelectedServices(Array.isArray(requestData.requested_services) ? requestData.requested_services : []);
      setPreferredContact(requestData.preferred_contact || "email");
      setContactEmail(requestData.contact_email || user?.email || "");
      setContactPhone(requestData.contact_phone || "");
      setBestContactTime(requestData.best_contact_time || "");
      setHomeownerNotes(requestData.homeowner_notes || "");
      setAccepted(Boolean(requestData.authorization_confirmed_at));

      const [taskResult, messageResult] = await Promise.all([
        supabase
          .from("permit_concierge_tasks")
          .select("*")
          .eq("request_id", requestData.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("permit_concierge_messages")
          .select("*")
          .eq("request_id", requestData.id)
          .order("created_at", { ascending: true }),
      ]);

      if (taskResult.error) setError(taskResult.error.message);
      else setTasks(taskResult.data || []);
      if (messageResult.error) setError(messageResult.error.message);
      else setMessages(messageResult.data || []);
    } else {
      setTasks([]);
      setMessages([]);
    }
    setLoading(false);
  }

  function toggleService(key) {
    setSelectedServices((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  async function requestConcierge() {
    if (!permitCase?.id || sending) return;
    setSending(true);
    setError("");
    setNotice("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again and retry.");

      const response = await fetch("/api/permit-concierge/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          permitCaseId: permitCase.id,
          requestedServices: selectedServices,
          preferredContact,
          contactEmail,
          contactPhone,
          bestContactTime,
          homeownerNotes,
          accepted,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Permit Concierge could not be requested.");

      setNotice("Permit Concierge is now active for this project. The case appears in the admin work queue.");
      await loadConcierge();
      if (typeof onPermitCaseUpdated === "function") {
        onPermitCaseUpdated({ ...permitCase, status: "concierge_requested", concierge_requested_at: new Date().toISOString() });
      }
    } catch (requestError) {
      setError(requestError.message || "Permit Concierge could not be requested.");
    } finally {
      setSending(false);
    }
  }

  async function completeHomeownerTask(task) {
    if (!task?.id || task.assigned_to !== "homeowner") return;
    setError("");
    const { data, error: updateError } = await supabase
      .from("permit_concierge_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", task.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) setError(updateError.message);
    else {
      setTasks((current) => current.map((item) => item.id === task.id ? data : item));
      setNotice("Homeowner task marked complete. The concierge can see the update.");
    }
  }

  async function sendMessage() {
    const body = messageText.trim();
    if (!body || !request?.id) return;
    setSending(true);
    setError("");

    const now = new Date().toISOString();
    const { data, error: messageError } = await supabase
      .from("permit_concierge_messages")
      .insert({
        request_id: request.id,
        project_id: project.id,
        user_id: user.id,
        sender_role: "homeowner",
        sender_user_id: user.id,
        body,
        visible_to_homeowner: true,
        created_at: now,
      })
      .select("*")
      .single();

    if (messageError) {
      setError(messageError.message);
    } else {
      setMessages((current) => [...current, data]);
      setMessageText("");
      await supabase
        .from("permit_concierge_requests")
        .update({ last_homeowner_message_at: now, updated_at: now })
        .eq("id", request.id);
    }
    setSending(false);
  }

  if (loading) {
    return <div className={styles.loading}>Opening Permit Concierge…</div>;
  }

  if (!request) {
    return (
      <section className={styles.conciergeCard}>
        <div className={styles.heading}>
          <div><p>PERMIT CONCIERGE</p><h3>Let Project Pilot handle the administrative work with you.</h3></div>
          <span>Human-assisted beta</span>
        </div>
        <p className={styles.intro}>
          A Project Pilot coordinator can review the package, prepare application details, organize documents, track corrections, and guide the official filing process. The homeowner only steps in for information, identity, signatures, professional approvals, or government payments that cannot legally be delegated.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        <div className={styles.serviceGrid}>
          {SERVICE_OPTIONS.map(([key, title, text]) => (
            <label className={selectedServices.includes(key) ? styles.selectedService : ""} key={key}>
              <input type="checkbox" checked={selectedServices.includes(key)} onChange={() => toggleService(key)} />
              <span><strong>{title}</strong><small>{text}</small></span>
            </label>
          ))}
        </div>

        <div className={styles.contactGrid}>
          <label><span>Preferred contact</span><select value={preferredContact} onChange={(event) => setPreferredContact(event.target.value)}><option value="email">Email</option><option value="phone">Phone</option><option value="either">Either</option></select></label>
          <label><span>Email</span><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
          <label><span>Phone</span><input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="Optional unless phone contact is selected" /></label>
          <label><span>Best contact time</span><input value={bestContactTime} onChange={(event) => setBestContactTime(event.target.value)} placeholder="Example: Weekdays after 5 PM" /></label>
        </div>

        <label className={styles.notesField}><span>What would you like us to take off your plate?</span><textarea rows="4" value={homeownerNotes} onChange={(event) => setHomeownerNotes(event.target.value)} placeholder="Example: I want help preparing the application, figuring out the plot plan, and responding to the county if they request corrections." /></label>

        <div className={styles.readinessLine}>
          <strong>{Number(readiness?.score || 0)}% permit package readiness</strong>
          <span>The concierge can still help when the package is incomplete.</span>
        </div>

        <label className={styles.authorization}>
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>I authorize Project Pilot staff to review my saved project and permit information, prepare documents and application details, communicate with me about missing items, and coordinate permitted administrative steps. I understand Project Pilot will not impersonate me, sign legal certifications, create professional seals, pay government fees, or bypass government portal requirements.</span>
        </label>

        <button type="button" className={styles.primaryButton} onClick={requestConcierge} disabled={sending}>
          {sending ? "Starting Permit Concierge…" : "Start Permit Concierge"}
        </button>
        <small className={styles.disclaimer}>This starts a human-assisted service request. It does not itself submit an application or guarantee approval.</small>
      </section>
    );
  }

  const statusCopy = STATUS_COPY[request.status] || STATUS_COPY.requested;

  return (
    <section className={styles.conciergeWorkspace}>
      <div className={styles.heading}>
        <div><p>PERMIT CONCIERGE ACTIVE</p><h3>{statusCopy[0]}</h3><span>{statusCopy[1]}</span></div>
        <b>{request.assigned_to ? `Assigned to ${request.assigned_to}` : "Awaiting assignment"}</b>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}
      {request.concierge_summary && <div className={styles.conciergeSummary}><strong>Update from your concierge</strong><p>{request.concierge_summary}</p></div>}

      <div className={styles.statusStrip}>
        <article><small>STATUS</small><strong>{statusCopy[0]}</strong></article>
        <article><small>REQUESTED</small><strong>{formatDate(request.requested_at) || "Recently"}</strong></article>
        <article><small>YOUR OPEN TASKS</small><strong>{homeownerTasks.length}</strong></article>
        <article><small>PROJECT PILOT TASKS</small><strong>{conciergeTasks.length}</strong></article>
      </div>

      {homeownerTasks.length > 0 && (
        <section className={styles.actionSection}>
          <div><p>YOUR ACTION IS NEEDED</p><h4>Complete these items so the concierge can keep moving.</h4></div>
          <div className={styles.taskList}>
            {homeownerTasks.map((task) => (
              <article key={task.id}>
                <div><strong>{task.title}</strong><p>{task.plain_language}</p>{task.due_at && <small>Due {formatDate(task.due_at)}</small>}</div>
                <button type="button" onClick={() => completeHomeownerTask(task)}>Mark complete</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className={styles.workColumns}>
        <section>
          <div className={styles.sectionHeading}><p>PROJECT PILOT IS HANDLING</p><h4>Administrative permit work</h4></div>
          <div className={styles.taskList}>
            {conciergeTasks.map((task) => (
              <article key={task.id}>
                <div><strong>{task.title}</strong><p>{task.plain_language}</p></div>
                <span>{task.status.replaceAll("_", " ")}</span>
              </article>
            ))}
            {!conciergeTasks.length && <div className={styles.empty}>No open concierge tasks.</div>}
          </div>
          {completedTasks.length > 0 && <details className={styles.completed}><summary>{completedTasks.length} completed task{completedTasks.length === 1 ? "" : "s"}</summary>{completedTasks.map((task) => <p key={task.id}>✓ {task.title}</p>)}</details>}
        </section>

        <section>
          <div className={styles.sectionHeading}><p>MESSAGE YOUR CONCIERGE</p><h4>Keep questions and updates with the permit case.</h4></div>
          <div className={styles.messageList}>
            {messages.map((message) => (
              <article className={message.sender_role === "homeowner" ? styles.homeownerMessage : styles.conciergeMessage} key={message.id}>
                <strong>{message.sender_role === "homeowner" ? "You" : message.sender_role === "concierge" ? "Permit Concierge" : "Project Pilot"}</strong>
                <p>{message.body}</p>
                <small>{formatDate(message.created_at)}</small>
              </article>
            ))}
            {!messages.length && <div className={styles.empty}>No messages yet.</div>}
          </div>
          <textarea rows="3" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Ask a question or share an update…" />
          <button type="button" className={styles.secondaryButton} onClick={sendMessage} disabled={sending || !messageText.trim()}>{sending ? "Sending…" : "Send to Permit Concierge"}</button>
        </section>
      </div>

      <div className={styles.boundary}>
        <strong>What Project Pilot can take over</strong>
        <span>Package review, form preparation, document organization, agency questions, correction coordination, deadlines, and inspection guidance.</span>
        <strong>What may still require you</strong>
        <span>Portal identity verification, legal signatures, notarization, professional drawings or seals, contractor credentials, and government payments.</span>
      </div>
    </section>
  );
}
