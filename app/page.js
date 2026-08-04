"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./page.css";

const metrics = [
  ["Active Projects", "3", "1 new last month"],
  ["Permits in Progress", "2", "View all →"],
  ["Tasks Due Soon", "4", "View tasks →"],
  ["Budget Tracking", "$24,350", "$1,650 below target"],
];

const projects = [
  ["Kitchen Remodel", "In Progress", 68, "Submit permit application"],
  ["Deck Addition", "Planning", 42, "Finalize budget"],
  ["Bathroom Renovation", "Needs Review", 71, "Address permit comments"],
];

const contractors = ["Blue Ridge Contracting", "Hillside Builders", "Crafted Spaces"];

const launchChecks = [
  "Guided permit process in plain English",
  "One-image faithful remodel generation",
  "Permit Concierge for hands-on support",
  "Projects, tasks, documents, and budgets in one place",
];

const peopleCards = [
  {
    image: "/homepage-person-1.png",
    eyebrow: "START WITH A PLAN",
    title: "Turn a home project into a clear next step.",
    copy: "A simple workspace helps first-time users understand what to do first and what comes next.",
    cta: "Start a Project",
    href: "#access",
  },
  {
    image: "/homepage-person-2.png",
    eyebrow: "EASY FROM HOME",
    title: "Get organized from your couch, desk, or kitchen table.",
    copy: "Project Pilot is designed to feel approachable for everyday homeowners, not just industry pros.",
    cta: "Open My Workspace",
    href: "#access",
  },
  {
    image: "/homepage-person-3.png",
    eyebrow: "PLAN TOGETHER",
    title: "Compare ideas and make decisions with confidence.",
    copy: "Whether you are planning solo or with a partner, the process stays easier to follow and easier to share.",
    cta: "See How It Works",
    href: "#how",
  },
  {
    image: "/homepage-person-4.png",
    eyebrow: "RENOVATION FOCUS",
    title: "Bring your remodel decisions into one place.",
    copy: "Keep design ideas, project details, and permit steps connected so the plan stays understandable.",
    cta: "Explore Project Vision",
    href: "#resources",
  },
  {
    image: "/homepage-person-5.png",
    eyebrow: "PLAIN-ENGLISH HELP",
    title: "Prepare permits without getting lost in the wording.",
    copy: "Project Pilot helps users move through permit questions in simpler language and with better guidance.",
    cta: "Prepare a Permit",
    href: "#pricing",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Homeowner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) router.replace("/dashboard");
      else setSessionLoading(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role } },
        });
        if (error) throw error;
        if (data.session) router.push("/dashboard");
        else {
          setStatus("Account created. Check your email to confirm it, then sign in here.");
          setMode("signin");
          setPassword("");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (error) {
      setStatus(error.message || "Unable to complete that request.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!email) {
      setStatus("Enter your email first, then select Forgot password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    setStatus(error ? error.message : "Password reset email sent. Check your inbox.");
  }

  if (sessionLoading) return <main className="homeLoading">Opening Project Pilot…</main>;

  return (
    <main className="homePage">
      <header className="heroHeader">
        <a className="homeBrand" href="#top" aria-label="Project Pilot home">
          <img src="/homepage-logo-approved.png" alt="Project Pilot" />
        </a>
        <nav>
          <a href="#how">How It Works</a>
          <a href="#solutions">Solutions</a>
          <a href="#resources">Resources</a>
          <a href="#pricing">Pricing</a>
          <a href="#access">Log In</a>
        </nav>
        <a className="navCta" href="#access">Get Started</a>
      </header>

      <section className="heroPanel" id="top">
        <div className="heroCopy">
          <p className="eyebrow">YOUR HOME PROJECTS</p>
          <h1>
            Your project.
            <span>Guided from start to finish.</span>
          </h1>
          <p className="heroLead">
            AI-powered guidance for permits, planning, budgets, and the right pros — all in one homeowner workspace.
          </p>
          <div className="heroActions">
            <a className="primaryAction" href="#access">Get Started</a>
            <a className="secondaryAction" href="#how">See How It Works</a>
          </div>
          <div className="heroTrustRow">
            <div>
              <b>◇</b>
              <span>
                <strong>Permit Confidence</strong>
                <small>Guided permit steps with clear explanations</small>
              </span>
            </div>
            <div>
              <b>♙</b>
              <span>
                <strong>Trusted Pros</strong>
                <small>Connect with vetted contractors</small>
              </span>
            </div>
            <div>
              <b>▥</b>
              <span>
                <strong>Better Outcomes</strong>
                <small>Plan with budgets, tasks, and real next steps</small>
              </span>
            </div>
          </div>
        </div>
        <div className="heroVisualApproved">
          <img src="/homepage-hero-recreated-highres.png" alt="Project Pilot modern home hero" />
        </div>
      </section>

      <section className="dashboardPreview" id="solutions">
        <aside className="previewSidebar">
          <img src="/homepage-logo-approved.png" alt="Project Pilot" className="approvedSidebarLogo" />
          <nav>
            <span className="active">Dashboard</span>
            <span>My Projects</span>
            <span>Permits</span>
            <span>Find Contractors</span>
            <span>Messages</span>
            <span>Documents</span>
            <span>Payments</span>
            <span>Settings</span>
          </nav>
          <div className="previewAssistant">
            <strong>✦ Project Assistant</strong>
            <small>Ask anything</small>
          </div>
        </aside>

        <div className="previewMain">
          <header>
            <h2>Dashboard</h2>
            <button type="button">+ New Project</button>
          </header>
          <div className="metricGrid">
            {metrics.map(([label, value, note]) => (
              <article key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
                <span>{note}</span>
              </article>
            ))}
          </div>
          <div className="previewColumns">
            <section className="projectPanel">
              <div className="panelTitle">
                <h3>My Projects</h3>
                <a href="#access">View all →</a>
              </div>
              {projects.map(([title, statusLabel, progress, next], index) => (
                <article className="projectRow" key={title}>
                  <div className={`projectThumb thumb${index + 1}`} />
                  <div className="projectDetails">
                    <strong>{title}</strong>
                    <small>Austin, TX</small>
                    <div>
                      <mark>{statusLabel}</mark>
                      <span className="bar"><i style={{ width: `${progress}%` }} /></span>
                      <em>{progress}%</em>
                    </div>
                  </div>
                  <div className="projectNext">
                    <small>Next up</small>
                    <strong>{next}</strong>
                  </div>
                </article>
              ))}
            </section>
            <aside className="contractorPanel">
              <div className="panelTitle">
                <h3>Find Contractors</h3>
                <a href="/contractors">View all →</a>
              </div>
              {contractors.map((name, index) => (
                <article key={name}>
                  <div className={`contractorPhoto contractor${index + 1}`} />
                  <span>
                    <strong>{name}</strong>
                    <small>Austin, TX · ★ 4.9</small>
                  </span>
                  <button type="button">View Profile</button>
                </article>
              ))}
              <a className="browseButton" href="/contractors">Browse All Contractors</a>
            </aside>
          </div>
        </div>
      </section>

      <section className="featureRibbon" id="how">
        <article><strong>✧ AI Guidance</strong><span>Smarter answers every step of the way</span></article>
        <article><strong>▣ Permit Confidence</strong><span>Clear steps, fewer headaches</span></article>
        <article><strong>♧ Trusted Pros</strong><span>Verified contractors, stronger results</span></article>
        <article><strong>▥ Budget Control</strong><span>Track costs and stay on budget</span></article>
        <article><strong>⌂ Real Results</strong><span>Manage projects from idea to approval</span></article>
      </section>

      <section className="launchSection" id="resources">
        <div className="sectionHeading">
          <p className="eyebrow">WHY HOMEOWNERS USE PROJECT PILOT</p>
          <h2>Everything you need to move from idea to approval — without losing track of the details.</h2>
          <p>Plan visually, understand permits, organize documents, and keep the next step clear.</p>
        </div>
        <div className="launchGrid">
          <div className="launchChecks">
            {launchChecks.map((item) => (
              <div key={item}><span>✓</span><p>{item}</p></div>
            ))}
          </div>
          <div className="launchCard">
            <small>FOUNDING HOMEOWNER LAUNCH</small>
            <strong>Built for real projects — decks, kitchens, bathrooms, additions, permits, and more.</strong>
            <p>Start today and let Project Pilot guide the plan, visuals, permit path, and next action.</p>
            <a href="#access">Create my account</a>
          </div>
        </div>
      </section>

      <section className="peopleSection">
        <div className="sectionHeading">
          <p className="eyebrow">FOR EVERY KIND OF HOMEOWNER</p>
          <h2>Make the homepage feel more relatable with more people represented.</h2>
          <p>
            The house image stays at the top, while these homepage photo cards make the next actions feel more personal,
            more welcoming, and easier to understand.
          </p>
        </div>
        <div className="peopleGrid fiveCards">
          {peopleCards.map((card) => (
            <article className="personCard" key={card.title}>
              <img src={card.image} alt={card.title} />
              <div className="personCardBody">
                <small>{card.eyebrow}</small>
                <strong>{card.title}</strong>
                <p>{card.copy}</p>
                <a href={card.href}>{card.cta}</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pricingSection" id="pricing">
        <div>
          <p className="eyebrow">LAUNCH PRICING</p>
          <h2>Launch now and refine with real homeowners.</h2>
          <p>Permit preparation, Project Vision, and Su stay connected in one workspace while daily limits help protect costs.</p>
        </div>
        <div className="pricingCard">
          <span>FOUNDING ACCESS</span>
          <strong>$0</strong>
          <small>Invite homeowners, validate the workflow, and gather launch feedback.</small>
          <a href="#access">Open Project Pilot</a>
        </div>
      </section>

      <section className="accessSection" id="access">
        <div className="sectionHeading">
          <p className="eyebrow">GET STARTED</p>
          <h2>Open your Project Pilot workspace.</h2>
          <p>Create a homeowner account or sign back in to continue your projects.</p>
        </div>
        <div className="accessCard">
          <div className="authTabs">
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create Account</button>
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Log In</button>
          </div>
          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label>
                <label>Account type<select value={role} onChange={(event) => setRole(event.target.value)}><option>Homeowner</option><option>Contractor</option><option>Property Manager</option><option>Developer</option></select></label>
              </>
            )}
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" placeholder="At least 6 characters" required /></label>
            {mode === "signin" && <button className="forgotButton" type="button" onClick={resetPassword}>Forgot password?</button>}
            <button className="authSubmit" type="submit" disabled={loading}>{loading ? "Working…" : mode === "signup" ? "Create My Account" : "Open My Projects"}</button>
          </form>
          {status && <p className="authStatus">{status}</p>}
        </div>
      </section>

      <footer className="homeFooter">
        <img src="/homepage-logo-approved.png" alt="Project Pilot" />
        <p>Plan every improvement around your home without losing track of the details.</p>
        <small>
          Project Pilot provides planning support, permit guidance, visual concepts, and homeowner tools. Government approvals and professional determinations still require the appropriate authority or professional.
        </small>
      </footer>
    </main>
  );
}
