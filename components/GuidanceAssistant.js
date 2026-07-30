"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const PAGE_GUIDANCE = {
  dashboard: {
    title: "Your Dashboard",
    explanation: "This page shows your projects, the next recommended action, recent activity, and the tools available for your account type.",
    next: "Choose Continue Project if you already started one, or Start a New Project to create a guided plan.",
    links: [
      { label: "Go to My Projects", href: "/dashboard#projects" },
      { label: "Open Help Center", href: "/help" },
    ],
  },
  project: {
    title: "Your Project",
    explanation: "This workspace keeps the project plan, costs, permits, contractor planning, files, notes, Project Vision, and conversation together.",
    next: "Open Project Assistant and ask about your specific saved project, or continue the recommended next step shown in the workspace.",
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
    title: "Best Match Contractors",
    explanation: "This page ranks verified contractors by project fit, service area, availability, project size, and performance. Contractors cannot pay for a higher position.",
    next: "Choose a saved project, add missing details, and select up to three contractors for an introduction request.",
    links: [
      { label: "Return to Dashboard", href: "/dashboard" },
      { label: "Read How Introductions Work", href: "/terms" },
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
  const [error, setError] = useState("");

  const guidance = useMemo(() => PAGE_GUIDANCE[getPageKey(pathname)], [pathname]);

  async function askSu(prompt) {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");

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
        },
        body: JSON.stringify({
          projectId: projectIdFromPath(pathname),
          pagePath: pathname,
          message: cleanPrompt,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Su could not respond.");
      setAnswer(payload?.message?.message || "Su could not prepare an answer.");
    } catch (requestError) {
      setError(requestError.message || "Su could not respond.");
    } finally {
      setLoading(false);
    }
  }

  function submitQuestion(event) {
    event.preventDefault();
    askSu(question);
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
        <strong>Need help?</strong>
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
            <p>Ask about this page or your saved project. Su will use available project details instead of a canned response.</p>

            <div className="assistantQuickActions">
              <button type="button" onClick={() => askSu("Explain this page using my saved account or project context. Tell me what matters most right now.")} disabled={loading}>Explain this page</button>
              <button type="button" onClick={() => askSu("What is my single best next step here, based on my saved project progress?")} disabled={loading}>Show my next step</button>
            </div>

            {loading && <div className="assistantAnswer" role="status">Su is reviewing the saved context…</div>}
            {answer && !loading && <div className="assistantAnswer" role="status">{answer}</div>}
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
