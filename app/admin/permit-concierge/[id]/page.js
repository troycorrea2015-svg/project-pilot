"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import "../../admin.css";
import "./concierge.css";

const STATUSES = [
  ["requested", "Request received"],
  ["intake_review", "Intake review"],
  ["preparing", "Preparing package"],
  ["waiting_on_homeowner", "Waiting on homeowner"],
  ["ready_for_submission", "Ready for submission"],
  ["filing", "Filing in progress"],
  ["submitted", "Submitted"],
  ["corrections", "Corrections"],
  ["approved", "Approved"],
  ["closed", "Closed"],
  ["cancelled", "Cancelled"],
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("requested");
  const [assignedTo, setAssignedTo] = useState("");
  const [summary, setSummary] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState("concierge");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    loadCase();
  }, [requestId]);

  const openHomeownerTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === "homeowner" && !["completed", "cancelled"].includes(task.status)),
    [tasks]
  );

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

    const [caseResult, projectResult, taskResult, messageResult] = await Promise.all([
      supabase.from("permit_cases").select("*").eq("id", requestData.permit_case_id).single(),
      supabase.from("projects").select("*").eq("id", requestData.project_id).single(),
      supabase.from("permit_concierge_tasks").select("*").eq("request_id", requestData.id).order("sort_order").order("created_at"),
      supabase.from("permit_concierge_messages").select("*").eq("request_id", requestData.id).order("created_at"),
    ]);

    if (caseResult.error) setError(caseResult.error.message);
    else setPermitCase(caseResult.data);
    if (projectResult.error) setError(projectResult.error.message);
    else setProject(projectResult.data);
    if (taskResult.error) setError(taskResult.error.message);
    else setTasks(taskResult.data || []);
    if (messageResult.error) setError(messageResult.error.message);
    else setMessages(messageResult.data || []);
    setLoading(false);
  }

  async function saveRequest() {
    if (!request?.id) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from("permit_concierge_requests")
      .update({
        status,
        assigned_to: assignedTo.trim(),
        concierge_summary: summary.trim(),
        internal_notes: internalNotes.trim(),
        updated_at: now,
      })
      .eq("id", request.id)
      .select("*")
      .single();

    if (updateError) setError(updateError.message);
    else {
      setRequest(data);
      setNotice("Permit Concierge case saved.");
      if (status === "waiting_on_homeowner") {
        await supabase.from("permit_cases").update({ status: "concierge_requested", next_action: openHomeownerTasks[0]?.title || "Homeowner action required", updated_at: now }).eq("id", request.permit_case_id);
      } else if (status === "submitted") {
        await supabase.from("permit_cases").update({ status: "submitted", submitted_at: permitCase?.submitted_at || now, updated_at: now }).eq("id", request.permit_case_id);
      } else if (status === "approved") {
        await supabase.from("permit_cases").update({ status: "approved", approved_at: permitCase?.approved_at || now, updated_at: now }).eq("id", request.permit_case_id);
      }
    }
    setSaving(false);
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

    if (taskError) setError(taskError.message);
    else {
      setTasks((current) => [...current, data]);
      setNewTaskTitle("");
      setNewTaskText("");
      setNewTaskDue("");
      setNotice("Task added.");
      if (newTaskOwner === "homeowner") {
        const now = new Date().toISOString();
        setStatus("waiting_on_homeowner");
        await supabase.from("permit_concierge_requests").update({ status: "waiting_on_homeowner", updated_at: now }).eq("id", request.id);
      }
    }
    setSaving(false);
  }

  async function updateTask(task, patch) {
    const next = { ...patch, updated_at: new Date().toISOString() };
    if (patch.status === "completed") next.completed_at = new Date().toISOString();
    const { data, error: taskError } = await supabase
      .from("permit_concierge_tasks")
      .update(next)
      .eq("id", task.id)
      .select("*")
      .single();
    if (taskError) setError(taskError.message);
    else setTasks((current) => current.map((item) => item.id === task.id ? data : item));
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
      setNotice("Message sent to the homeowner.");
    }
    setSaving(false);
  }

  if (loading) return <main className="adminLoading">Opening Permit Concierge case…</main>;
  if (!profile?.is_admin) return <main className="adminDenied"><div><h1>Admin access required.</h1><button onClick={() => router.push("/dashboard")}>Return to Dashboard</button></div></main>;

  return (
    <main className="conciergeAdminPage">
      <header className="conciergeAdminHeader">
        <div><a href="/admin#permits">← Permit Concierge queue</a><p>PERMIT CONCIERGE WORKBENCH</p><h1>{project?.title || "Permit case"}</h1><span>{project?.address || project?.location_label || "No address saved"} · {permitCase?.jurisdiction || "Jurisdiction review needed"}</span></div>
        <button type="button" onClick={saveRequest} disabled={saving}>{saving ? "Saving…" : "Save case"}</button>
      </header>

      {error && <div className="adminError">{error}</div>}
      {notice && <div className="adminNotice">{notice}</div>}

      <section className="conciergeAdminStats">
        <article><small>READINESS</small><strong>{Number(permitCase?.readiness_score || 0)}%</strong></article>
        <article><small>STATUS</small><strong>{STATUSES.find(([key]) => key === status)?.[1] || status}</strong></article>
        <article><small>HOMEOWNER TASKS</small><strong>{openHomeownerTasks.length}</strong></article>
        <article><small>REQUESTED</small><strong>{formatDate(request?.requested_at)}</strong></article>
      </section>

      <div className="conciergeAdminGrid">
        <section className="conciergeAdminPanel">
          <div><p>CASE CONTROL</p><h2>Assign, summarize, and move the permit forward.</h2></div>
          <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUSES.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>Assigned coordinator</span><input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} /></label>
          <label><span>Homeowner-visible summary</span><textarea rows="5" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Explain what Project Pilot is doing and what happens next." /></label>
          <label><span>Internal notes</span><textarea rows="5" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Private operating notes. Not shown to the homeowner." /></label>
          <div className="conciergeContact"><strong>Preferred contact</strong><span>{request?.preferred_contact} · {request?.contact_email}{request?.contact_phone ? ` · ${request.contact_phone}` : ""}</span><small>{request?.best_contact_time || "No preferred time"}</small></div>
          {request?.homeowner_notes && <div className="conciergeHomeownerNotes"><strong>Homeowner request</strong><p>{request.homeowner_notes}</p></div>}
        </section>

        <section className="conciergeAdminPanel">
          <div><p>APPLICATION SNAPSHOT</p><h2>Review the saved permit information.</h2></div>
          <dl className="conciergeSnapshot">
            <div><dt>Project type</dt><dd>{permitCase?.project_type || project?.project_type || "—"}</dd></div>
            <div><dt>Jurisdiction</dt><dd>{permitCase?.jurisdiction || "—"}</dd></div>
            <div><dt>Application route</dt><dd>{permitCase?.application_label || "—"}</dd></div>
            <div><dt>Reference</dt><dd>{permitCase?.application_reference || "Not submitted"}</dd></div>
            <div><dt>Government fee</dt><dd>{permitCase?.government_fee_amount == null ? "Not recorded" : `$${Number(permitCase.government_fee_amount).toFixed(2)}`}</dd></div>
            <div><dt>Next action</dt><dd>{permitCase?.next_action || "Not recorded"}</dd></div>
          </dl>
          <details><summary>Application answers</summary><pre>{JSON.stringify(permitCase?.answers || {}, null, 2)}</pre></details>
          <details><summary>Linked document map</summary><pre>{JSON.stringify(permitCase?.document_links || {}, null, 2)}</pre></details>
        </section>
      </div>

      <section className="conciergeAdminPanel">
        <div><p>SHARED TASKS</p><h2>Separate what Project Pilot handles from what the homeowner must do.</h2></div>
        <div className="conciergeTaskTable">
          {tasks.map((task) => (
            <article key={task.id}>
              <div><span className={task.assigned_to === "homeowner" ? "homeownerOwner" : "conciergeOwner"}>{task.assigned_to}</span><strong>{task.title}</strong><p>{task.plain_language}</p></div>
              <select value={task.status} onChange={(event) => updateTask(task, { status: event.target.value })}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
            </article>
          ))}
        </div>
        <div className="conciergeNewTask">
          <select value={newTaskOwner} onChange={(event) => setNewTaskOwner(event.target.value)}><option value="concierge">Project Pilot task</option><option value="homeowner">Homeowner task</option></select>
          <input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="Task title" />
          <input type="date" value={newTaskDue} onChange={(event) => setNewTaskDue(event.target.value)} />
          <textarea rows="2" value={newTaskText} onChange={(event) => setNewTaskText(event.target.value)} placeholder="Explain the task in plain English." />
          <button type="button" onClick={addTask} disabled={saving || !newTaskTitle.trim()}>Add task</button>
        </div>
      </section>

      <section className="conciergeAdminPanel">
        <div><p>HOMEOWNER COMMUNICATION</p><h2>Keep every permit update attached to the case.</h2></div>
        <div className="conciergeAdminMessages">
          {messages.map((message) => <article className={message.sender_role === "homeowner" ? "fromHomeowner" : "fromConcierge"} key={message.id}><strong>{message.sender_role === "homeowner" ? "Homeowner" : message.sender_role === "concierge" ? "Permit Concierge" : "Project Pilot"}</strong><p>{message.body}</p><small>{formatDate(message.created_at)}</small></article>)}
        </div>
        <textarea rows="4" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Send a plain-English update or request to the homeowner." />
        <button type="button" onClick={sendMessage} disabled={saving || !messageText.trim()}>Send homeowner message</button>
      </section>
    </main>
  );
}
