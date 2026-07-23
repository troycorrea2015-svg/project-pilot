"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./page.css";

const accountTypes = [
  {
    value: "Homeowner",
    title: "Homeowner",
    description: "Plan and manage multiple home projects, compare DIY and professional routes, and keep every project organized.",
    image: "/role-homeowner.jpg",
  },
  {
    value: "Contractor",
    title: "Contractor",
    description: "Manage client jobs, estimates, permit preparation, documents, and the next action across active work.",
    image: "/role-contractor.jpg",
  },
  {
    value: "Property Manager",
    title: "Property Manager",
    description: "Organize projects across properties, track vendors, documents, compliance, and improvement budgets.",
    image: "/role-property-manager.jpg",
  },
  {
    value: "Developer",
    title: "Developer / Investor",
    description: "Track project feasibility, planning, approvals, documents, and portfolio-level decisions.",
    image: "/category-addition.jpg",
  },
];

const categories = [
  { title: "Decks & Patios", image: "/category-deck.jpg" },
  { title: "Kitchens", image: "/category-kitchen.jpg" },
  { title: "Bathrooms", image: "/category-bathroom.jpg" },
  { title: "Additions", image: "/category-addition.jpg" },
  { title: "Fences", image: "/category-fence.jpg" },
  { title: "Sheds & Garages", image: "/category-shed.jpg" },
];

const steps = [
  ["01", "Describe the project", "Tell Pilot what you want to build, repair, or renovate."],
  ["02", "See the full path", "Review permit guidance, costs, documents, and the next waypoint."],
  ["03", "Choose DIY or professional", "Compare routes and move forward with fewer surprises."],
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
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

        if (data.session) {
          router.push("/dashboard");
        } else {
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
      setStatus("Enter your email address first, then select Forgot password.");
      return;
    }

    setLoading(true);
    setStatus("");
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    setStatus(error ? error.message : "Password reset email sent. Check your inbox.");
  }

  if (sessionLoading) {
    return <main className="homeLoading">Opening Project Pilot…</main>;
  }

  return (
    <main className="homePage">
      <header className="homeNav">
        <a className="homeBrand" href="#top" aria-label="Project Pilot home">
          <span>P</span>
          <div>
            <strong>Project Pilot</strong>
            <small>Plan. Verify. Build.</small>
          </div>
        </a>
        <nav>
          <a href="#projects">Projects</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#diy">DIY</a>
          <a href="#access">Sign In</a>
        </nav>
        <a className="navCta" href="#access">Get Started</a>
      </header>

      <section className="heroSection" id="top">
        <div className="heroCopy">
          <p className="eyebrow">YOUR PROJECT JOURNEY, SMARTER FROM THE START</p>
          <h1>Plan with confidence before the first tool comes out.</h1>
          <p className="heroLead">
            Project Pilot brings project planning, permit guidance, cost estimates, DIY resources, and saved progress into one welcoming workspace.
          </p>
          <div className="heroActions">
            <a href="#access" className="primaryAction">Start a Project</a>
            <a href="#how-it-works" className="secondaryAction">See How It Works</a>
          </div>
          <div className="heroBenefits">
            <span>✓ Estimated project costs</span>
            <span>✓ DIY and professional paths</span>
            <span>✓ Permit preparation</span>
            <span>✓ Saved documents and progress</span>
          </div>
        </div>

        <div className="heroPhoto">
          <img src="/home-planning-people.jpg" alt="Homeowners reviewing project plans together" fetchPriority="high" decoding="async" />
          <div className="heroPhotoLabel">
            <strong>One workspace</strong>
            <span>from the first idea to the final inspection</span>
          </div>
        </div>

        <section className="accessCard" id="access">
          <div className="pilotBadge">
            <span>P</span>
            <div>
              <strong>Welcome aboard.</strong>
              <small>Open your Project Pilot workspace</small>
            </div>
          </div>

          <div className="authTabs">
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setStatus(""); }}>Sign In</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setStatus(""); }}>Create Account</button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label>
                <fieldset className="accountTypeFieldset">
                  <legend>Choose the workspace that fits you</legend>
                  <p>Your account type changes the dashboard, recommendations, and tools you see. Homeowners can manage multiple projects.</p>
                  <div className="accountTypeGrid">
                    {accountTypes.map((item) => (
                      <button
                        type="button"
                        className={role === item.value ? "selected" : ""}
                        onClick={() => setRole(item.value)}
                        key={item.value}
                      >
                        <img src={item.image} alt="" aria-hidden="true" />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength="6" required /></label>

            {mode === "signin" && <button className="forgotButton" type="button" onClick={resetPassword}>Forgot password?</button>}

            <button className="authSubmit" type="submit" disabled={loading}>
              {loading ? "Working…" : mode === "signin" ? "Open My Projects" : "Create My Free Account"}
            </button>
          </form>

          {status && <p className="authStatus">{status}</p>}
          <p className="accessNote">Free during beta. No payment information required.</p>
        </section>
      </section>

      <section className="categorySection" id="projects">
        <div className="sectionHeading compactHeading">
          <p className="eyebrow">WHAT ARE YOU PLANNING?</p>
          <h2>Start with the project that is already on your mind.</h2>
        </div>
        <div className="categoryGrid">
          {categories.map((category) => (
            <article key={category.title}>
              <img src={category.image} alt={`${category.title} project example`} loading="lazy" decoding="async" />
              <strong>{category.title}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="howSection" id="how-it-works">
        <div className="sectionHeading">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>A clear plan instead of tabs, notes, and guesswork.</h2>
        </div>
        <div className="howGrid">
          {steps.map(([number, title, copy]) => (
            <article key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="peopleFeatureSection">
        <article>
          <img src="/home-cost-planning.jpg" alt="Property manager reviewing project costs" loading="lazy" decoding="async" />
          <div>
            <p className="eyebrow">PROJECT COST ESTIMATOR</p>
            <h2>Understand the likely range before you spend.</h2>
            <p>Compare low, expected, and high ranges with materials, labor, fees, tools, and contingency shown separately.</p>
          </div>
        </article>

        <article id="diy">
          <img src="/home-diy-builder.jpg" alt="Contractor completing an outdoor project" loading="lazy" decoding="async" />
          <div>
            <p className="eyebrow">DIY PROJECTS</p>
            <h2>Learn the project before you decide to do it yourself.</h2>
            <p>See material costs, tool allowances, planning tips, and links to step-by-step learning resources for common projects.</p>
          </div>
        </article>
      </section>

      <section className="featureSection">
        <div className="sectionHeading">
          <p className="eyebrow">EVERYTHING CONNECTED</p>
          <h2>The useful parts of project planning, together.</h2>
        </div>
        <div className="featureGrid">
          <article><strong>Mission Control</strong><p>See priorities, readiness, current stages, and the next action at a glance.</p></article>
          <article><strong>Permit Intelligence</strong><p>Organize address matching, jurisdiction questions, documents, and official links.</p></article>
          <article><strong>Cost Estimator</strong><p>Compare professional and DIY paths using a practical planning range.</p></article>
          <article><strong>DIY Resources</strong><p>Open project-specific learning links, materials, and safety reminders.</p></article>
          <article><strong>Project Binder</strong><p>Keep plans, photos, quotes, permits, receipts, and approvals with the project.</p></article>
          <article><strong>Pilot Guidance</strong><p>Return to the project without losing track of the next decision.</p></article>
        </div>
      </section>

      <section className="betaSection">
        <div>
          <p className="eyebrow">BETA ACCESS</p>
          <h2>Start free and help shape what comes next.</h2>
          <p>Project Pilot is ready for early users, product demonstrations, contractor conversations, and investor feedback.</p>
        </div>
        <a href="#access">Create Free Account</a>
      </section>

      <footer className="homeFooter">
        <a className="homeBrand" href="#top"><span>P</span><div><strong>Project Pilot</strong><small>Plan. Verify. Build.</small></div></a>
        <p>Piloting your project from concept to completion.</p>
        <small>Beta software. Permit, cost, and DIY guidance should be confirmed before work begins.</small>
      </footer>
    </main>
  );
}
