"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import "./project.css";

const stages = [
  ["Concept", "Define the project goal and scope."],
  ["Planning", "Capture budget, timeline, and responsibilities."],
  ["Location", "Confirm the project property and jurisdiction."],
  ["Permits", "Research approvals, forms, and official requirements."],
  ["Documents", "Collect plans, estimates, photos, and contracts."],
  ["Construction", "Track work, decisions, and project changes."],
  ["Inspections", "Prepare for required reviews and corrections."],
  ["Completion", "Close permits and organize final records."],
];

export default function ProjectWorkspacePage() {
  const { id } = useParams();
  const router = useRouter();
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadWorkspace(); }, [id]);
  useEffect(() => { if (activeTab === "pilot") bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending, activeTab]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    if (!currentUser) { router.push("/"); return; }
    setUser(currentUser);

    const [projectResult, messageResult, documentResult] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).eq("user_id", currentUser.id).single(),
      supabase.from("conversations").select("id,role,message,created_at").eq("project_id", id).eq("user_id", currentUser.id).order("created_at", { ascending: true }),
      supabase.from("project_documents").select("*").eq("project_id", id).eq("user_id", currentUser.id).order("created_at", { ascending: false }),
    ]);

    if (projectResult.error || !projectResult.data) {
      setError("This project could not be found.");
      setLoading(false);
      return;
    }
    setProject(projectResult.data);
    setNoteDraft(projectResult.data.notes || "");
    setMessages(messageResult.data || []);
    setDocuments(documentResult.data || []);
    setLoading(false);
  }

  async function sendMessage(event) {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft || sending || !user) return;
    setDraft(""); setError(""); setSending(true);
    const optimistic = { id: `local-${Date.now()}`, role: "user", message: cleanDraft, created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData?.session?.access_token}` },
        body: JSON.stringify({ projectId: id, message: cleanDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pilot could not respond.");
      setMessages((current) => [...current, data.message]);
      if (data.project) setProject(data.project);
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setDraft(cleanDraft);
    } finally { setSending(false); }
  }

  async function saveNotes() {
    setSaving(true); setError("");
    const { data, error: saveError } = await supabase.from("projects")
      .update({ notes: noteDraft, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id).select().single();
    if (saveError) setError(saveError.message); else setProject(data);
    setSaving(false);
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (file.size > 15 * 1024 * 1024) { setError("Files must be 15 MB or smaller."); return; }
    setUploading(true); setError("");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${user.id}/${id}/${Date.now()}-${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from("project-documents").upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data, error: recordError } = await supabase.from("project_documents").insert({
        project_id: id, user_id: user.id, file_name: file.name, file_path: filePath, file_type: file.type, file_size: file.size,
      }).select().single();
      if (recordError) throw recordError;
      setDocuments((current) => [data, ...current]);
      if ((project.progress || 0) < 55) {
        const { data: updated } = await supabase.from("projects").update({ progress: 55, status: "Documents", next_step: "Review permit requirements and confirm the project course" }).eq("id", id).select().single();
        if (updated) setProject(updated);
      }
    } catch (uploadError) { setError(uploadError.message); }
    setUploading(false);
  }

  async function openDocument(document) {
    const { data, error: signedError } = await supabase.storage.from("project-documents").createSignedUrl(document.file_path, 60);
    if (signedError) setError(signedError.message); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteDocument(document) {
    if (!window.confirm(`Remove ${document.file_name}?`)) return;
    const { error: storageError } = await supabase.storage.from("project-documents").remove([document.file_path]);
    if (storageError) { setError(storageError.message); return; }
    await supabase.from("project_documents").delete().eq("id", document.id).eq("user_id", user.id);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
  }

  const activeStep = useMemo(() => Math.min(Math.floor((project?.progress || 5) / 13), stages.length - 1), [project]);
  const setupItems = useMemo(() => [
    ["Project type", project?.project_type], ["Description", project?.description], ["Location", project?.address],
    ["Project role", project?.project_role], ["Timeline", project?.target_timeline], ["Budget", project?.budget ? `$${Number(project.budget).toLocaleString()}` : ""],
  ], [project]);
  const setupCount = setupItems.filter(([, value]) => value).length;

  if (loading) return <main className="workspaceLoading">Opening your project…</main>;
  if (!project) return <main className="workspaceLoading">{error || "Project unavailable."}</main>;

  return (
    <main className="projectWorkspace">
      <aside className="projectRail">
        <button className="backButton" onClick={() => router.push("/dashboard")}>← Dashboard</button>
        <div className="pilotMark"><span>P</span><strong>Project Pilot</strong></div>
        <div className="projectSummary">
          <small>CURRENT PROJECT</small><h1>{project.title}</h1><p>{project.address || project.location_label}</p><span>{project.status}</span>
        </div>
        <nav className="workspaceNav">
          {[['overview','Command Center'],['pilot','Pilot'],['flight','Flight Plan'],['documents','Project Binder'],['notes','Notes']].map(([key,label]) => (
            <button className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)} key={key}>{label}</button>
          ))}
        </nav>
        <div className="railProgress"><small>PROJECT READINESS</small><strong>{project.progress || 0}%</strong><div><span style={{ width: `${project.progress || 0}%` }} /></div></div>
      </aside>

      <section className="workspaceMain">
        <header className="workspaceHeader">
          <div><p>PROJECT WORKSPACE</p><h2>{project.title}</h2><span>{project.next_step}</span></div>
          <button onClick={() => setActiveTab("pilot")}>Continue with Pilot</button>
        </header>
        {error && <div className="workspaceError">{error}</div>}

        {activeTab === "overview" && (
          <div className="workspaceContent overviewContent">
            <section className="commandHero">
              <div><p>YOUR NEXT WAYPOINT</p><h1>{project.next_step}</h1><span>Pilot is building a clear record of your project while you move through each stage.</span><button onClick={() => setActiveTab("pilot")}>Continue Project Setup</button></div>
              <div className="readinessRing" style={{ '--progress': `${project.progress || 0}%` }}><strong>{project.progress || 0}%</strong><span>ready</span></div>
            </section>
            <section className="workspaceCards">
              <article><p>SETUP CHECK</p><h3>{setupCount} of 6 details captured</h3><div className="checkList">{setupItems.map(([label,value]) => <div className={value ? "done" : ""} key={label}><span>{value ? "✓" : "○"}</span><strong>{label}</strong><small>{value || "Still needed"}</small></div>)}</div></article>
              <article><p>FLIGHT PLAN</p><h3>Current stage: {stages[activeStep][0]}</h3><div className="miniFlight">{stages.slice(0,5).map(([label],index) => <div className={index <= activeStep ? "done" : ""} key={label}><span>{index < activeStep ? "✓" : index + 1}</span><small>{label}</small></div>)}</div><button onClick={() => setActiveTab("flight")}>View Full Flight Plan</button></article>
              <article><p>PROJECT BINDER</p><h3>{documents.length} document{documents.length === 1 ? "" : "s"} saved</h3><span>Keep plans, permits, estimates, photos, contracts, and inspection records attached to this project.</span><button onClick={() => setActiveTab("documents")}>Open Project Binder</button></article>
              <article><p>PERMIT INTELLIGENCE</p><h3>Jurisdiction research is in beta.</h3><span>Official permit and zoning requirements must still be confirmed with the governing authority.</span><button disabled>Expanded Coverage Coming Soon</button></article>
            </section>
          </div>
        )}

        {activeTab === "pilot" && (
          <div className="pilotPanel">
            <header className="pilotHeader"><div className="pilotAvatar">P</div><div><p>PILOT</p><h2>Guided project setup</h2></div><span className="onlineStatus">Free guided mode</span></header>
            <div className="messageList">
              {!messages.length && <article className="message assistant"><div className="messageAvatar">P</div><div><strong>Pilot</strong><p>Welcome aboard. Let’s start with the project itself. What are you planning to build, repair, or renovate?</p></div></article>}
              {messages.map((entry) => <article className={`message ${entry.role === "assistant" ? "assistant" : "user"}`} key={entry.id}><div className="messageAvatar">{entry.role === "assistant" ? "P" : "Y"}</div><div><strong>{entry.role === "assistant" ? "Pilot" : "You"}</strong><p>{entry.message}</p></div></article>)}
              {sending && <article className="message assistant"><div className="messageAvatar">P</div><div><strong>Pilot</strong><p className="thinking">Charting the next step…</p></div></article>}
              <div ref={bottomRef} />
            </div>
            <div className="composerArea"><form onSubmit={sendMessage}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Tell Pilot about your project…" rows={2}/><button disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send"}</button></form><small>Guided beta mode saves your answers without paid AI usage.</small></div>
          </div>
        )}

        {activeTab === "flight" && (
          <div className="workspaceContent"><div className="sectionIntro"><p>YOUR FLIGHT PLAN</p><h1>A clear course from concept to completion.</h1><span>Each waypoint shows what the project needs before moving forward.</span></div><div className="fullFlightPlan">{stages.map(([label,description],index) => <article className={index < activeStep ? "complete" : index === activeStep ? "current" : ""} key={label}><div>{index < activeStep ? "✓" : index + 1}</div><span><small>{index < activeStep ? "COMPLETED" : index === activeStep ? "CURRENT WAYPOINT" : "UPCOMING"}</small><h3>{label}</h3><p>{description}</p></span></article>)}</div></div>
        )}

        {activeTab === "documents" && (
          <div className="workspaceContent"><div className="sectionIntro splitIntro"><div><p>PROJECT BINDER</p><h1>Every important file in one place.</h1><span>Upload PDFs, plans, photos, estimates, contracts, or notes up to 15 MB.</span></div><button onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : "+ Add Document"}</button><input ref={fileRef} type="file" hidden onChange={uploadDocument} accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx" /></div>{!documents.length ? <div className="emptyBinder"><strong>No documents added yet.</strong><span>Add a plan, photo, estimate, or project file to start the binder.</span><button onClick={() => fileRef.current?.click()}>Upload First Document</button></div> : <div className="documentGrid">{documents.map((document) => <article key={document.id}><div className="fileIcon">{document.file_type?.includes("image") ? "IMG" : document.file_type?.includes("pdf") ? "PDF" : "FILE"}</div><h3>{document.file_name}</h3><p>{(document.file_size / 1024 / 1024).toFixed(2)} MB · {new Date(document.created_at).toLocaleDateString()}</p><div><button onClick={() => openDocument(document)}>Open</button><button className="deleteFile" onClick={() => deleteDocument(document)}>Remove</button></div></article>)}</div>}</div>
        )}

        {activeTab === "notes" && (
          <div className="workspaceContent"><div className="sectionIntro"><p>PROJECT NOTES</p><h1>Keep decisions and reminders attached to the project.</h1><span>These notes save to your account and remain available when you return.</span></div><div className="notesEditor"><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add project decisions, questions, contacts, measurements, or reminders…"/><div><small>{noteDraft.length} characters</small><button onClick={saveNotes} disabled={saving}>{saving ? "Saving…" : "Save Notes"}</button></div></div></div>
        )}
      </section>
    </main>
  );
}
