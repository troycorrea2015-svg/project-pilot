"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { readAssistantStream } from "../lib/assistant-stream";

const PAGE_GUIDANCE = {
  dashboard: {
    title: "Your Dashboard",
    explanation: "This dashboard shows what is happening, what Project Pilot is doing, and whether anything needs you. Su automatically uses your most recently active project when you ask from here.",
    next: "Check the Current Project Status card first. If it says nothing is needed from you, you can leave the permit work with Project Pilot and wait for the next update.",
    links: [
      { label: "Go to My Projects", href: "/dashboard#projects" },
      { label: "Open Help Center", href: "/help" },
    ],
  },
  project: {
    title: "Your Project",
    explanation: "This workspace keeps everything for one project together, but you do not need to learn every tool. Su can guide the project one step at a time.",
    next: "Ask Su what to do next. When a specific tool is needed, Su can give you a Take me there button.",
    links: [
      { label: "Return to Dashboard", href: "/dashboard" },
      { label: "Open Help Center", href: "/help" },
    ],
  },
  admin: {
    title: "Admin Control Center",
    explanation: "This page summarizes accounts, projects, feedback, activity, financials, marketplace activity, and areas that may need attention.",
    next: "Review open feedback, low-activity areas, accepted introductions, contractor verification, and actual revenue first.",
    links: [
      { label: "Return to Dashboard", href: "/dashboard" },
      { label: "Open Help Center", href: "/help" },
    ],
  },
  contractors: {
    title: "Local Contractors",
    explanation: "This page helps you search for nearby businesses around the saved project location. Local results are not automatically Project Pilot partners or verified contractors.",
    next: "Confirm the project and location, browse nearby options, and use the available Delaware registration or license checks before hiring.",
    links: [
      { label: "Return to Dashboard", href: "/dashboard" },
      { label: "Open Help Center", href: "/help" },
    ],
  },
  contractor: {
    title: "Contractor Center",
    explanation: "This page keeps your partner profile, verification status, and qualified homeowner opportunities together.",
    next: "Complete your business profile first, then review each anonymized opportunity and fixed fee before accepting or declining.",
    links: [
      { label: "Open Best Match Network", href: "/contractors" },
      { label: "Read Partner Terms", href: "/terms" },
    ],
  },
  help: {
    title: "Help Center",
    explanation: "Use this page to learn common terms, understand each part of Project Pilot, and find the next action for your situation.",
    next: "Choose the topic closest to what is confusing, or ask Su a focused question below.",
    links: [{ label: "Return to Dashboard", href: "/dashboard" }],
  },
  default: {
    title: "Project Assistant",
    explanation: "Project Pilot helps organize a project from the first idea through permits, costs, work, inspections, and completion.",
    next: "Sign in and open a saved project so Su can use the actual project details in the answer.",
    links: [{ label: "Open Help Center", href: "/help" }],
  },
};

function getPageKey(pathname) {
  if (pathname?.startsWith("/project/")) return "project";
  if (pathname?.startsWith("/dashboard")) return "dashboard";
  if (pathname?.startsWith("/admin")) return "admin";
  if (pathname?.startsWith("/contractors")) return "contractors";
  if (pathname?.startsWith("/contractor")) return "contractor";
  if (pathname?.startsWith("/help")) return "help";
  return "default";
}

function projectIdFromPath(pathname) {
  const match = String(pathname || "").match(/^\/project\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export default function GuidanceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [navigation, setNavigation] = useState(null);
  const [contextProjectId, setContextProjectId] = useState("");
  const [error, setError] = useState("");

  const guidance = useMemo(() => PAGE_GUIDANCE[getPageKey(pathname)], [pathname]);

  function followNavigation(item) {
    if (!item?.href) return;
    setOpen(false);
    router.push(item.href);
  }

  async function askSu(prompt) {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setPendingAction(null);
    setNavigation(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        setAnswer(`${guidance.explanation} ${guidance.next}`);
        return;
      }

      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          projectId: projectIdFromPath(pathname) || contextProjectId,
          pagePath: pathname,
          message: cleanPrompt,
          stream: true,
        }),
      });

      const payload = await readAssistantStream(response, {
        onDelta: (delta) => setAnswer((current) => current + delta),
      });

      setAnswer(payload?.message?.message || "Su could not prepare an answer.");
      setPendingAction(payload?.action || null);
      setNavigation(payload?.navigation || null);
      if (payload?.project?.id) setContextProjectId(payload.project.id);
      if (payload?.navigation?.auto && payload.navigation.href) {
        window.setTimeout(() => followNavigation(payload.navigation), 300);
      }
    } catch (requestError) {
      setError(requestError.message || "Su could not respond.");
    } finally {
      setLoading(false);
    }
  }

  function submitQuestion(event) {
    event.preventDefault();
    const prompt = question;
    setQuestion("");
    askSu(prompt);
  }

  async function applyPendingAction() {
    if (!pendingAction || applying) return;

    setApplying(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Sign in before Su changes a project.");

      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: projectIdFromPath(pathname) || contextProjectId,
          pagePath: pathname,
          confirmAction: pendingAction,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Su could not apply that change.");

      setAnswer(payload?.message?.message || "Su updated the project.");
      setPendingAction(null);
      setNavigation(payload?.navigation || null);
      if (!payload?.navigation) window.setTimeout(() => window.location.reload(), 900);
    } catch (actionError) {
      setError(actionError.message || "Su could not apply that change.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="assistantLauncher"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="project-assistant-panel"
      >
        <span>S</span>
        <strong>Ask Su</strong>
      </button>

      {open && (
        <section className="assistantPanel" id="project-assistant-panel" aria-label="Su Project Assistant">
          <header>
            <div>
              <span>S</span>
              <div>
                <small>SU · PROJECT ASSISTANT</small>
                <strong>{guidance.title}</strong>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Project Assistant">×</button>
          </header>

          <div className="assistantBody">
            <p>Tell Su what you are trying to do. Su can explain the next step, update approved project details, and give you a direct button to the Project Pilot screen you need.</p>

            <div className="assistantQuickActions">
              <button type="button" onClick={() => askSu("What is Project Pilot doing for my active project right now? Use my saved project and permit status. Tell me whether anything is waiting on me.")} disabled={loading}>What’s happening?</button>
              <button type="button" onClick={() => askSu("Do I personally need to do anything right now for my active project or permit? If not, tell me that clearly and tell me what Project Pilot is doing next.")} disabled={loading}>Do I need to do anything?</button>
              <button type="button" onClick={() => askSu("What is my single best next step here, based on my saved project progress? Tell me the exact Project Pilot section where I should do it.")} disabled={loading}>Show my next step</button>
            </div>

            {loading && !answer && <div className="assistantAnswer" role="status">Su is reviewing the saved context…</div>}
            {answer && <div className="assistantAnswer" role="status">{answer}{loading ? <span aria-hidden="true"> ▍</span> : null}</div>}
            {pendingAction && !loading && (
              <div
                role="group"
                aria-label="Proposed Project Assistant action"
                style={{ marginTop: 10, padding: 12, border: "1px solid #b9ccef", borderRadius: 12, background: "#f4f8ff" }}
              >
                <small style={{ display: "block", color: "#2f6df6", fontWeight: 900, letterSpacing: ".08em" }}>SU CAN DO THIS FOR YOU</small>
                <strong style={{ display: "block", marginTop: 6, color: "#173056", lineHeight: 1.35 }}>{pendingAction.summary}</strong>
                <p style={{ margin: "7px 0 0", color: "#617792", fontSize: 12, lineHeight: 1.5 }}>Nothing changes until you approve it.</p>
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <button
                    type="button"
                    onClick={applyPendingAction}
                    disabled={applying}
                    style={{ flex: 1, minHeight: 38, border: 0, borderRadius: 9, background: "#2f6df6", color: "white", fontWeight: 850, cursor: "pointer" }}
                  >
                    {applying ? "Applying…" : "Apply changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction(null)}
                    disabled={applying}
                    style={{ minHeight: 38, padding: "0 12px", border: "1px solid #cbd7e7", borderRadius: 9, background: "white", color: "#435773", fontWeight: 800, cursor: "pointer" }}
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}
            {navigation && !loading && (
              <div className="assistantAnswer" style={{ marginTop: 10, border: "1px solid #b9ccef", background: "#f4f8ff" }}>
                <strong style={{ display: "block", color: "#173056" }}>{navigation.label}</strong>
                <span style={{ display: "block", marginTop: 5, color: "#617792", fontSize: 12, lineHeight: 1.45 }}>{navigation.description}</span>
                <button
                  type="button"
                  onClick={() => followNavigation(navigation)}
                  style={{ width: "100%", minHeight: 40, marginTop: 10, border: 0, borderRadius: 9, background: "#2f6df6", color: "white", fontWeight: 850, cursor: "pointer" }}
                >
                  Take me there →
                </button>
              </div>
            )}
            {error && <div className="assistantAnswer" role="alert">{error}</div>}

            <form onSubmit={submitQuestion}>
              <label htmlFor="assistant-question">Ask in your own words</label>
              <div>
                <input
                  id="assistant-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What should I do next for this roof project?"
                />
                <button type="submit" disabled={loading || !question.trim()}>{loading ? "…" : "Ask"}</button>
              </div>
            </form>

            <nav aria-label="Project Assistant links">
              {guidance.links.map((link) => (
                <button key={link.href} type="button" onClick={() => { router.push(link.href); setOpen(false); }}>
                  {link.label} →
                </button>
              ))}
            </nav>

            <small className="assistantBetaNote">Su provides planning guidance, not legal, engineering, permitting, or contracting approval. Official offices, licensed professionals, inspections, and signed documents remain the source of truth.</small>
          </div>
        </section>
      )}
    </>
  );
}
