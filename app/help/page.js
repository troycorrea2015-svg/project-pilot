"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./help.css";

const TOPICS = [
  { title: "Start a project", description: "Answer a few simple questions about the work, location, budget, and whether you plan to hire help.", action: "Start from the Dashboard", href: "/dashboard" },
  { title: "Understand your Project Plan", description: "The Project Plan is the step-by-step checklist that moves the project from idea to completion.", action: "View My Projects", href: "/dashboard#projects" },
  { title: "Check permits and approvals", description: "Project Pilot helps identify the likely office, official resources, and supporting documents. Always confirm final requirements with the governing authority.", action: "Open a Project", href: "/dashboard#projects" },
  { title: "Compare project costs", description: "Use planning ranges to compare a professional route with a do-it-yourself route before requesting real quotes.", action: "Open a Project", href: "/dashboard#projects" },
  { title: "Organize files and documents", description: "Store plans, photos, estimates, approvals, contracts, receipts, and inspection records with the correct project.", action: "Open a Project", href: "/dashboard#projects" },
  { title: "Get help from Project Assistant", description: "Use the Need help? button on any page to explain the screen, define a term, or show the next step.", action: "Try the Help Button", href: "/help" },
];

const TERMS = [
  ["Permit", "Official approval that may be required before certain work starts."],
  ["Zoning", "Rules that control how property can be used and where structures may be placed."],
  ["Setback", "The minimum distance required between construction and a property line, road, or other structure."],
  ["Jurisdiction", "The government office responsible for the project location."],
  ["Inspection", "An official review that checks whether completed work follows approved plans and safety requirements."],
  ["Project Plan", "The step-by-step path for moving a project from idea to completion. Project Pilot also calls this the Flight Plan."],
  ["Project Assistant", "The guided help system that explains pages, terms, and next actions. Project Pilot also calls this Pilot."],
];

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLowerCase();

  const filteredTopics = useMemo(() => {
    if (!normalized) return TOPICS;
    return TOPICS.filter((topic) => `${topic.title} ${topic.description}`.toLowerCase().includes(normalized));
  }, [normalized]);

  const filteredTerms = useMemo(() => {
    if (!normalized) return TERMS;
    return TERMS.filter(([term, description]) => `${term} ${description}`.toLowerCase().includes(normalized));
  }, [normalized]);

  return (
    <main className="helpPage">
      <header className="helpTopbar">
        <a href="/" className="helpBrand"><span>P</span><strong>Project Pilot</strong></a>
        <nav><a href="/dashboard">My Projects</a><a className="active" href="/help">Help</a></nav>
      </header>

      <section className="helpHero">
        <div>
          <p>HELP CENTER</p>
          <h1>Clear answers without the jargon.</h1>
          <span>Search for a task or unfamiliar term. Project Assistant is also available from the Need help? button on every signed-in page.</span>
        </div>
        <label>
          <span>What do you need help with?</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try permits, setback, costs, or documents" />
        </label>
      </section>

      <section className="helpContent">
        <div className="helpSectionHeading"><p>COMMON TASKS</p><h2>Choose what you are trying to do.</h2></div>
        <div className="helpTopicGrid">
          {filteredTopics.map((topic, index) => (
            <article key={topic.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
              <button type="button" onClick={() => router.push(topic.href)}>{topic.action} →</button>
            </article>
          ))}
          {!filteredTopics.length && <div className="helpEmpty">No task matched that search. Try a shorter word or use Project Assistant.</div>}
        </div>

        <div className="helpSectionHeading termsHeading"><p>PLAIN-LANGUAGE GLOSSARY</p><h2>Common project terms explained.</h2></div>
        <div className="termList">
          {filteredTerms.map(([term, description]) => (
            <article key={term}><strong>{term}</strong><span>{description}</span></article>
          ))}
          {!filteredTerms.length && <div className="helpEmpty">No term matched that search.</div>}
        </div>
      </section>
    </main>
  );
}
