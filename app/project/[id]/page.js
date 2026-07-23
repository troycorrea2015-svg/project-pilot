"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import "./project.css";

export default function ProjectWorkspacePage() {
  const { id } = useParams();
  const router = useRouter();
  const bottomRef = useRef(null);
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const [{ data: projectData, error: projectError }, { data: messageData, error: messageError }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).eq("user_id", currentUser.id).single(),
      supabase.from("conversations").select("id,role,message,created_at").eq("project_id", id).eq("user_id", currentUser.id).order("created_at", { ascending: true }),
    ]);

    if (projectError || !projectData) {
      setError("This project could not be found.");
      setLoading(false);
      return;
    }
    if (messageError) setError(messageError.message);

    setProject(projectData);
    setMessages(messageData || []);
    setLoading(false);
  }

  async function sendMessage(event) {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft || sending || !user) return;

    setDraft("");
    setError("");
    setSending(true);
    const optimistic = { id: `local-${Date.now()}`, role: "user", message: cleanDraft, created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: id, message: cleanDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pilot could not respond.");

      setMessages((current) => [...current, data.message]);
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setDraft(cleanDraft);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <main className="workspaceLoading">Opening your project…</main>;
  if (!project) return <main className="workspaceLoading">{error || "Project unavailable."}</main>;

  const flightPlan = ["Concept", "Planning", "Location", "Permits", "Documents", "Construction", "Inspections", "Completion"];
  const activeStep = Math.min(Math.floor((project.progress || 5) / 13), flightPlan.length - 1);

  return (
    <main className="projectWorkspace">
      <aside className="projectRail">
        <button className="backButton" onClick={() => router.push("/dashboard")}>← Dashboard</button>
        <div className="pilotMark"><span>P</span><strong>Project Pilot</strong></div>
        <div className="projectSummary">
          <small>CURRENT PROJECT</small>
          <h1>{project.title}</h1>
          <p>{project.address || project.location_label}</p>
          <span>{project.status}</span>
        </div>
        <div className="flightPlan">
          <small>FLIGHT PLAN</small>
          {flightPlan.map((step, index) => (
            <div className={index <= activeStep ? "complete" : ""} key={step}>
              <i>{index < activeStep ? "✓" : index + 1}</i><span>{step}</span>
            </div>
          ))}
        </div>
      </aside>

      <section className="pilotPanel">
        <header className="pilotHeader">
          <div className="pilotAvatar">P</div>
          <div><p>PILOT</p><h2>Your project guide</h2></div>
          <span className="onlineStatus">Ready</span>
        </header>

        <div className="messageList">
          {!messages.length && (
            <article className="message assistant">
              <div className="messageAvatar">P</div>
              <div><strong>Pilot</strong><p>Welcome aboard. Tell me what you are planning, and I’ll help chart the clearest path from concept to completion.</p></div>
            </article>
          )}
          {messages.map((entry) => (
            <article className={`message ${entry.role === "assistant" ? "assistant" : "user"}`} key={entry.id}>
              <div className="messageAvatar">{entry.role === "assistant" ? "P" : "Y"}</div>
              <div><strong>{entry.role === "assistant" ? "Pilot" : "You"}</strong><p>{entry.message}</p></div>
            </article>
          ))}
          {sending && <article className="message assistant"><div className="messageAvatar">P</div><div><strong>Pilot</strong><p className="thinking">Charting the next step…</p></div></article>}
          <div ref={bottomRef} />
        </div>

        <div className="composerArea">
          {error && <p className="chatError">{error}</p>}
          <form onSubmit={sendMessage}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Tell Pilot about your project or ask what to do next…" maxLength={6000} rows={2} />
            <button disabled={sending || !draft.trim()} type="submit">{sending ? "Sending…" : "Send"}</button>
          </form>
          <small>Pilot provides planning guidance. Confirm official requirements with the appropriate authority or qualified professional.</small>
        </div>
      </section>
    </main>
  );
}
