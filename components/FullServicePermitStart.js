"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import styles from "./FullServicePermitStart.module.css";

const STATUS_COPY = {
  requested: ["Project Pilot has your permit", "We are starting jurisdiction and application review."],
  intake_review: ["Project Pilot is reviewing your project", "We are verifying the permit route and identifying everything the application needs."],
  preparing: ["Project Pilot is preparing the application", "Your forms, answers, and supporting documents are being organized."],
  waiting_on_homeowner: ["One action needs you", "Complete the highlighted item and Project Pilot will continue from there."],
  ready_for_submission: ["Your permit package is ready", "Project Pilot is confirming the official submission step and any applicant-controlled requirements."],
  filing: ["Project Pilot is handling the filing step", "The allowed submission and agency coordination steps are in progress."],
  submitted: ["Your application is submitted", "Project Pilot is monitoring the case for reviewer updates, corrections, and deadlines."],
  corrections: ["Project Pilot is handling a correction round", "We are organizing the reviewer comments and the response/resubmission work."],
  approved: ["Your permit is approved", "Project Pilot is moving into inspection and completion tracking."],
  inspections: ["Project Pilot is coordinating inspections", "We are tracking what must be ready, scheduled, passed, and closed out."],
  closeout: ["Project Pilot is closing out the permit", "Final approvals and completion records are being organized."],
  closed: ["Permit process complete", "The permit history and final records remain attached to this project."],
  cancelled: ["Full-service permit handling stopped", "The saved permit information remains in Project Pilot."],
};

const LAUNCH_PRICE_CENTS = Number.parseInt(process.env.NEXT_PUBLIC_PERMIT_CONCIERGE_PRICE_CENTS || "9900", 10);

function money(cents) {
  const amount = Number(cents || LAUNCH_PRICE_CENTS || 0) / 100;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function FullServicePermitStart({
  project,
  user,
  existingPermitCase = null,
  compact = false,
  onOpenAssistant,
  onOpenDetails,
}) {
  const [permitCase, setPermitCase] = useState(existingPermitCase);
  const [request, setRequest] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signerName, setSignerName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
  const [contactPhone, setContactPhone] = useState("");
  const [homeownerNotes, setHomeownerNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [availableCreditCents, setAvailableCreditCents] = useState(0);

  useEffect(() => {
    if (existingPermitCase?.id) setPermitCase(existingPermitCase);
  }, [existingPermitCase?.id]);

  useEffect(() => {
    loadCase();
  }, [project?.id, user?.id, existingPermitCase?.id]);

  const homeownerTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === "homeowner" && !["completed", "cancelled"].includes(task.status)),
    [tasks]
  );
  const conciergeTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === "concierge" && !["completed", "cancelled"].includes(task.status)),
    [tasks]
  );
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);

  async function loadCase() {
    if (!project?.id || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        const referralResponse = await fetch("/api/referrals/status", { headers: { Authorization: `Bearer ${token}` } });
        if (referralResponse.ok) {
          const referralPayload = await referralResponse.json();
          setAvailableCreditCents(Number(referralPayload.balanceCents || 0));
        }
      }
    } catch {
      // Loyalty status should never block the permit workspace.
    }

    let currentCase = existingPermitCase || null;
    if (!currentCase) {
      const { data: caseData, error: caseError } = await supabase
        .from("permit_cases")
        .select("*")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (caseError && !String(caseError.message || "").includes("permit_cases")) {
        setError(caseError.message);
      }
      currentCase = caseData || null;
    }
    setPermitCase(currentCase);

    const { data: requestData, error: requestError } = await supabase
      .from("permit_concierge_requests")
      .select("*")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (requestError) {
      const message = String(requestError.message || "");
      if (message.includes("permit_concierge_requests")) {
        setError("Permit Concierge is not installed yet. Run RUN_THIS_IN_SUPABASE_4_2_UPGRADE.sql in Supabase, then refresh.");
      } else {
        setError(message);
      }
      setLoading(false);
      return;
    }

    setRequest(requestData || null);
    if (!requestData) {
      setTasks([]);
      setMessages([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const [taskResult, messageResult, eventResult, authorizationResult] = await Promise.all([
      supabase.from("permit_concierge_tasks").select("*").eq("request_id", requestData.id).order("sort_order").order("created_at"),
      supabase.from("permit_concierge_messages").select("*").eq("request_id", requestData.id).order("created_at"),
      supabase.from("permit_concierge_events").select("*").eq("request_id", requestData.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("permit_service_authorizations").select("signer_name, signer_email, accepted_at").eq("request_id", requestData.id).order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    setContactPhone(requestData.contact_phone || "");
    setHomeownerNotes(requestData.homeowner_notes || "");
    if (authorizationResult.data?.signer_name) {
      setSignerName(authorizationResult.data.signer_name);
      setAccepted(true);
    }

    if (taskResult.error) setError(taskResult.error.message);
    else setTasks(taskResult.data || []);
    if (messageResult.error) setError(messageResult.error.message);
    else setMessages(messageResult.data || []);
    if (!eventResult.error) setEvents(eventResult.data || []);
    setLoading(false);
  }

  async function startFullService() {
    if (!project?.id || sending) return;
    setSending(true);
    setError("");
    setNotice("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again and retry.");

      const response = await fetch("/api/permit-service/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          signerName,
          contactEmail: user.email,
          contactPhone,
          homeownerNotes,
          accepted,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Full-service permit handling could not be started.");

      if (payload.alreadyActive) {
        setNotice("Full-Service Permit Concierge is already active for this project.");
        await loadCase();
      } else if (payload.url) {
        setNotice("Opening secure checkout…");
        window.location.assign(payload.url);
      } else {
        throw new Error("Secure checkout could not be opened.");
      }
    } catch (startError) {
      setError(startError.message || "Full-service permit handling could not be started.");
    } finally {
      setSending(false);
    }
  }

  async function completeHomeownerTask(task) {
    if (!task?.id || task.assigned_to !== "homeowner") return;
    setError("");
    const now = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from("permit_concierge_tasks")
      .update({ status: "completed", completed_at: now, updated_at: now })
      .eq("id", task.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTasks((current) => current.map((item) => (item.id === task.id ? data : item)));
    setNotice("Done. Project Pilot can see that you completed the required action.");
  }

  async function sendMessage() {
    const body = messageText.trim();
    if (!body || !request?.id || sending) return;
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
      await supabase.from("permit_concierge_requests").update({ last_homeowner_message_at: now, updated_at: now }).eq("id", request.id);
    }
    setSending(false);
  }

  if (loading) return <section className={styles.loading}>Opening full-service permits…</section>;

  const serviceIsActive = Boolean(request && ["paid", "waived"].includes(request.payment_status || "waived") && request.service_started_at);
  const servicePrice = serviceIsActive ? (request?.service_fee_cents || LAUNCH_PRICE_CENTS) : LAUNCH_PRICE_CENTS;

  if (!serviceIsActive) {
    const checkoutStarted = Boolean(request);
    const paidFormOpen = checkoutStarted || showCheckout;
    return (
      <section className={`${styles.startCard} ${compact ? styles.compact : ""}`}>
        <div className={styles.choiceHeading}>
          <p>YOUR PERMIT, YOUR CHOICE</p>
          <h2>Do it with Project Pilot for free—or have us handle the administrative work.</h2>
          <span>Either way, your project stays in the same workspace. You can start free and upgrade only if you decide the permit process is taking too much of your time.</span>
        </div>

        <div className={styles.serviceChoices}>
          <article className={styles.freeChoice}>
            <div className={styles.choicePrice}><span>SELF-SERVICE</span><strong>$0</strong><small>Always available</small></div>
            <h3>I’ll do it with Project Pilot</h3>
            <p>Project Pilot gives you the permit route, guided questions, application packet, checklist, document organization, Su guidance, and status tracking.</p>
            <ul>
              <li>Find the likely permit authority</li>
              <li>Build your permit-ready information</li>
              <li>Use the application builder and checklist</li>
              <li>Keep every permit document with the project</li>
            </ul>
            <button className={styles.freeButton} type="button" onClick={() => onOpenDetails?.()}>Continue Free →</button>
            <small>No subscription. Upgrade later without starting over.</small>
          </article>

          <article className={styles.conciergeChoice}>
            <div className={styles.choicePrice}><span>PERMIT CONCIERGE</span><strong>{money(servicePrice)}</strong><small>One-time Project Pilot fee</small></div>
            <h3>Have Project Pilot handle it</h3>
            <p>You give us the project information. Project Pilot handles the administrative permit workflow and only brings you back in when the agency legally or practically requires you.</p>
            <ul>
              <li>Verify jurisdiction and requirements</li>
              <li>Prepare and organize the application package</li>
              <li>Coordinate permitted filing and agency follow-up</li>
              <li>Manage corrections, inspections, and closeout tracking</li>
            </ul>
            <button className={styles.primaryButton} type="button" onClick={() => setShowCheckout(true)}>Have Project Pilot Handle It — {money(servicePrice)} →</button>
            <small>{availableCreditCents > 0 ? `You have ${money(availableCreditCents)} in Project Pilot credit. Eligible credit applies automatically at checkout.` : "Referral credits are applied automatically at checkout when available."}</small>
          </article>
        </div>

        {paidFormOpen && (
          <div className={styles.checkoutPanel}>
            <div className={styles.startHeading}>
              <div>
                <p>PERMIT CONCIERGE</p>
                <h2>{checkoutStarted ? "Finish checkout and we’ll take it from here." : "A few details, then Project Pilot takes over."}</h2>
                <span>We save this authorization with your project. After secure checkout, your case moves directly into the Permit Concierge work queue.</span>
              </div>
              <b>{money(LAUNCH_PRICE_CENTS)} base{availableCreditCents > 0 ? ` · ${money(availableCreditCents)} credit available` : ""}</b>
            </div>

            <div className={styles.takeoverGrid}>
              <article><strong>1</strong><span><b>Verify</b><small>Jurisdiction, approvals, forms, and filing route.</small></span></article>
              <article><strong>2</strong><span><b>Prepare</b><small>Application answers, documents, and submission package.</small></span></article>
              <article><strong>3</strong><span><b>Coordinate</b><small>Filing steps, agency updates, corrections, and resubmission.</small></span></article>
              <article><strong>4</strong><span><b>Finish</b><small>Inspections, final approval, and closeout record.</small></span></article>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {notice && <div className={styles.notice}>{notice}</div>}

            <div className={styles.startForm}>
              <label>
                <span>Homeowner/applicant name</span>
                <input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Full legal name" />
              </label>
              <label>
                <span>Phone number <small>(optional)</small></span>
                <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="Best number for permit questions" />
              </label>
              <label className={styles.notesField}>
                <span>Anything Project Pilot should know? <small>(optional)</small></span>
                <textarea rows="3" value={homeownerNotes} onChange={(event) => setHomeownerNotes(event.target.value)} placeholder="Example: I already have a contractor, or I need help figuring out the site plan." />
              </label>
            </div>

            <label className={styles.authorization}>
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span>
                I authorize Project Pilot to review my saved project/property information, research the permit route, prepare application information and documents, communicate and coordinate with agencies where permitted, enter or submit information where permitted and authorized, manage correction workflow, and coordinate inspections/closeout. I understand a government or professional may still require my own login, identity verification, signature, notarization, professional seal/credential, or payment, and Project Pilot will not impersonate me or bypass those requirements.
              </span>
            </label>

            <button className={styles.primaryButton} type="button" onClick={startFullService} disabled={sending || !signerName.trim() || !accepted}>
              {sending ? "Opening Secure Checkout…" : `${checkoutStarted ? "Continue Secure Checkout" : "Start Permit Concierge"} — ${money(servicePrice)} →`}
            </button>
            <small className={styles.boundaryText}>Project Pilot credit is applied automatically before Stripe checkout. Government permit fees, design/engineering, licensed-professional work, and other third-party charges remain separate. We keep your involvement to applicant-controlled actions such as required signatures, identity checks, direct government payments, or professional documents.</small>
          </div>
        )}
      </section>
    );
  }

  const status = STATUS_COPY[request.status] || STATUS_COPY.requested;
  const needsCustomer = homeownerTasks.length > 0 || request.status === "waiting_on_homeowner";

  return (
    <section className={`${styles.activeCard} ${needsCustomer ? styles.customerNeeded : styles.projectPilotHandling} ${compact ? styles.compact : ""}`}>
      <div className={styles.statusHero}>
        <div className={styles.statusIcon}>{needsCustomer ? "!" : "✓"}</div>
        <div>
          <p>{needsCustomer ? "YOUR ACTION IS NEEDED" : "PROJECT PILOT IS HANDLING THIS"}</p>
          <h2>{needsCustomer ? "One step needs you before we can continue." : status[0]}</h2>
          <span>{needsCustomer ? request.customer_action_reason || status[1] : status[1]}</span>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}
      {request.concierge_summary && <div className={styles.summary}><strong>Latest update</strong><p>{request.concierge_summary}</p></div>}

      <div className={styles.caseStats}>
        <article><small>CASE</small><strong>{request.case_number || "Permit case"}</strong></article>
        <article><small>STATUS</small><strong>{String(request.status || "requested").replaceAll("_", " ")}</strong></article>
        <article><small>JURISDICTION</small><strong>{request.agency_name || permitCase?.jurisdiction || project?.jurisdiction || "Being verified"}</strong></article>
        <article><small>COORDINATOR</small><strong>{request.assigned_to || "Assignment pending"}</strong></article>
      </div>

      {homeownerTasks.length > 0 && (
        <section className={styles.customerActions}>
          <div><p>ONLY THINGS WE NEED FROM YOU</p><h3>Complete these and Project Pilot will keep moving.</h3></div>
          <div className={styles.taskList}>
            {homeownerTasks.map((task) => (
              <article key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.plain_language}</p>
                  {task.due_at && <small>Due {formatDate(task.due_at)}</small>}
                </div>
                <button type="button" onClick={() => completeHomeownerTask(task)}>I completed this</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className={styles.actionRow}>
        {typeof onOpenAssistant === "function" && <button type="button" className={styles.secondaryButton} onClick={onOpenAssistant}>Ask Su about this case</button>}
        {typeof onOpenDetails === "function" && <button type="button" className={styles.secondaryButton} onClick={onOpenDetails}>See permit details</button>}
        {request.agency_url && <a className={styles.secondaryLink} href={request.agency_url} target="_blank" rel="noreferrer">Official permit portal ↗</a>}
      </div>

      <details className={styles.details}>
        <summary>What Project Pilot is working on</summary>
        <div className={styles.taskList}>
          {conciergeTasks.map((task) => (
            <article key={task.id}>
              <div><strong>{task.title}</strong><p>{task.plain_language}</p></div>
              <span className={styles.taskStatus}>{String(task.status || "pending").replaceAll("_", " ")}</span>
            </article>
          ))}
          {!conciergeTasks.length && <p className={styles.empty}>No open Project Pilot tasks.</p>}
        </div>
        {completedTasks.length > 0 && <p className={styles.completedCount}>✓ {completedTasks.length} permit task{completedTasks.length === 1 ? "" : "s"} completed</p>}
      </details>

      <details className={styles.details}>
        <summary>Permit messages</summary>
        <div className={styles.messageList}>
          {messages.map((message) => (
            <article className={message.sender_role === "homeowner" ? styles.homeownerMessage : styles.conciergeMessage} key={message.id}>
              <strong>{message.sender_role === "homeowner" ? "You" : message.sender_role === "concierge" ? "Permit Concierge" : "Project Pilot"}</strong>
              <p>{message.body}</p>
              <small>{formatDate(message.created_at)}</small>
            </article>
          ))}
          {!messages.length && <p className={styles.empty}>No permit messages yet.</p>}
        </div>
        <div className={styles.messageComposer}>
          <textarea rows="3" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Ask the permit coordinator a question…" />
          <button type="button" onClick={sendMessage} disabled={sending || !messageText.trim()}>{sending ? "Sending…" : "Send message"}</button>
        </div>
      </details>

      {events.length > 0 && (
        <details className={styles.details}>
          <summary>Permit timeline</summary>
          <div className={styles.timeline}>
            {events.map((event) => <article key={event.id}><small>{formatDate(event.created_at)}</small><div><strong>{event.title}</strong><p>{event.detail}</p></div></article>)}
          </div>
        </details>
      )}

      <div className={styles.boundaryBar}>
        <strong>Project Pilot keeps working unless a controlled step requires you.</strong>
        <span>Typical applicant-controlled steps include personal portal login, identity verification, legal signature/notarization, licensed-professional documents, and government payment.</span>
      </div>
    </section>
  );
}
