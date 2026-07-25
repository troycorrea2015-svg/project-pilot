"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const GLOSSARY = {
  permit: "A permit is official approval from a government office before certain work begins.",
  zoning: "Zoning rules control what can be built on a property and where it can be placed.",
  setback: "A setback is the minimum distance required between a project and a property line, road, or other structure.",
  inspection: "An inspection is an official review that checks whether completed work follows approved plans and safety rules.",
  jurisdiction: "The jurisdiction is the town, city, county, or state office responsible for the property and project.",
  contractor: "A contractor is a professional or company hired to perform construction, repair, or improvement work.",
  estimate: "An estimate is a planning range, not a guaranteed final price.",
};

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
    explanation: "This workspace keeps the project plan, costs, permits, contractor planning, files, and notes together.",
    next: "Start with Overview. Complete the recommended next step, then use Project Assistant whenever a term or requirement is unclear.",
    links: [
      { label: "Return to Dashboard", href: "/dashboard" },
      { label: "Open Help Center", href: "/help" },
    ],
  },
  admin: {
    title: "Admin Control Center",
    explanation: "This page summarizes accounts, projects, feedback, activity, beta financials, and areas that may need attention.",
    next: "Review open feedback and low-activity areas first. Actual beta revenue remains $0 because all access is free during testing.",
    links: [
      { label: "Return to Dashboard", href: "/dashboard" },
      { label: "Open Help Center", href: "/help" },
    ],
  },
  help: {
    title: "Help Center",
    explanation: "Use this page to learn common terms, understand each part of Project Pilot, and find the next action for your situation.",
    next: "Choose the topic closest to what is confusing. You can also type a term below for a plain-language explanation.",
    links: [{ label: "Return to Dashboard", href: "/dashboard" }],
  },
  default: {
    title: "Project Assistant",
    explanation: "Project Pilot helps organize a project from the first idea through permits, costs, work, inspections, and completion.",
    next: "Sign in to create a project, or open the Help Center for a plain-language overview.",
    links: [{ label: "Open Help Center", href: "/help" }],
  },
};

function getPageKey(pathname) {
  if (pathname?.startsWith("/project/")) return "project";
  if (pathname?.startsWith("/dashboard")) return "dashboard";
  if (pathname?.startsWith("/admin")) return "admin";
  if (pathname?.startsWith("/help")) return "help";
  return "default";
}

function answerQuestion(question, guidance) {
  const normalized = String(question || "").trim().toLowerCase();
  if (!normalized) return guidance.explanation;

  const glossaryEntry = Object.entries(GLOSSARY).find(([term]) => normalized.includes(term));
  if (glossaryEntry) return glossaryEntry[1];

  if (normalized.includes("next") || normalized.includes("what do i do") || normalized.includes("where do i start")) {
    return guidance.next;
  }

  if (normalized.includes("page") || normalized.includes("screen") || normalized.includes("what is this")) {
    return guidance.explanation;
  }

  if (normalized.includes("cost") || normalized.includes("price") || normalized.includes("budget")) {
    return "Project costs shown in Project Pilot are planning ranges. Compare the professional and do-it-yourself paths, then confirm real prices with suppliers or contractors before committing money.";
  }

  if (normalized.includes("confused") || normalized.includes("help") || normalized.includes("stuck")) {
    return `${guidance.explanation} ${guidance.next}`;
  }

  return "I can explain this page, define a project term, or show the next recommended action. Try asking about permits, zoning, setbacks, inspections, costs, or what to do next.";
}

export default function GuidanceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const guidance = useMemo(() => PAGE_GUIDANCE[getPageKey(pathname)], [pathname]);

  function usePrompt(type) {
    const response = type === "explain" ? guidance.explanation : guidance.next;
    setAnswer(response);
  }

  function submitQuestion(event) {
    event.preventDefault();
    setAnswer(answerQuestion(question, guidance));
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
        <span>P</span>
        <strong>Need help?</strong>
      </button>

      {open && (
        <section className="assistantPanel" id="project-assistant-panel" aria-label="Project Assistant">
          <header>
            <div>
              <span>P</span>
              <div>
                <small>PROJECT ASSISTANT</small>
                <strong>{guidance.title}</strong>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Project Assistant">×</button>
          </header>

          <div className="assistantBody">
            <p>I can explain unfamiliar terms and show you what to do next.</p>

            <div className="assistantQuickActions">
              <button type="button" onClick={() => usePrompt("explain")}>Explain this page</button>
              <button type="button" onClick={() => usePrompt("next")}>Show my next step</button>
            </div>

            {answer && <div className="assistantAnswer" role="status">{answer}</div>}

            <form onSubmit={submitQuestion}>
              <label htmlFor="assistant-question">Ask in your own words</label>
              <div>
                <input
                  id="assistant-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What does setback mean?"
                />
                <button type="submit">Ask</button>
              </div>
            </form>

            <nav aria-label="Project Assistant links">
              {guidance.links.map((link) => (
                <button key={link.href} type="button" onClick={() => { router.push(link.href); setOpen(false); }}>
                  {link.label} →
                </button>
              ))}
            </nav>

            <small className="assistantBetaNote">Guided beta assistance. Official offices, licensed professionals, and signed project documents remain the source of truth.</small>
          </div>
        </section>
      )}
    </>
  );
}
