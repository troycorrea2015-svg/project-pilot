"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./page.css";

const roles = ["Homeowner", "Contractor", "Property Manager", "Developer", "Investor", "Designer"];

const audience = [
  "Homeowners",
  "Contractors",
  "Property Managers",
  "Developers",
  "Investors",
  "DIY Builders",
];

const plannerSteps = [
  ["01", "Map the idea", "Start with the project type, goals, address, and rough budget."],
  ["02", "Understand the path", "See permits, estimated costs, materials, and next steps in one place."],
  ["03", "Choose your route", "Move forward with a DIY plan or prepare to hire the right professional."],
];

const featureCards = [
  ["Mission Control", "A guided workspace that keeps the project moving from first idea to completion."],
  ["Cost Estimator", "View low, expected, and high ranges with materials, labor, permits, and contingency."],
  ["DIY Mode", "Explore material costs, tool suggestions, and training links if you want to build it yourself."],
  ["Permit Intelligence", "Organize your location, documents, and official government links before regulated work begins."],
  ["Project Binder", "Keep photos, plans, estimates, permits, and project notes connected to the same workspace."],
  ["Investor-Friendly Demo", "Show a polished product that feels approachable to users and credible to backers."],
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
          options: {
            data: { full_name: name, role },
          },
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
          <strong>Project Pilot</strong>
        </a>
        <nav>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#diy">DIY</a>
          <a href="#beta">Beta</a>
        </nav>
        <a className="navCta" href="#access">Sign In</a>
      </header>

      <section className="heroSection" id="top">
        <div className="heroCopy">
          <p className="eyebrow">PLAN SMARTER. MOVE FASTER.</p>
          <h1>Piloting your project from concept to completion.</h1>
          <p className="heroLead">
            Project Pilot keeps planning, permitting, cost guidance, and next actions together in one workspace for property owners, professionals, and DIY builders.
          </p>

          <div className="heroTrust">
            <span>Guided project setup</span>
            <span>Estimated costs and materials</span>
            <span>DIY learning links</span>
            <span>Saved project progress</span>
          </div>

          <div className="heroActionRow">
            <a href="#access" className="primaryHeroButton">Open your workspace</a>
            <a href="#how-it-works" className="secondaryHeroButton">See how it works</a>
          </div>

          <div className="heroMiniStats">
            <article>
              <strong>One place</strong>
              <span>for planning, permits, costs, and documents</span>
            </article>
            <article>
              <strong>DIY + Pro paths</strong>
              <span>so users can choose the route that fits them best</span>
            </article>
            <article>
              <strong>Beta ready</strong>
              <span>for early users, demos, and investor conversations</span>
            </article>
          </div>
        </div>

        <div className="heroVisualStack">
          <section className="accessCard" id="access">
            <div className="pilotBadge">
              <span>P</span>
              <div>
                <strong>Welcome aboard.</strong>
                <small>Sign in right from the homepage</small>
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
                  <label>I am a<select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label>
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

          <div className="heroSceneCard heroScenePrimary">
            <div className="sceneHeader">
              <p>PLANNING VISUAL</p>
              <span>Concept → completion</span>
            </div>
            <img src="/scene-planning.svg" alt="Illustration of people planning a project together" />
          </div>

          <div className="heroSceneGrid">
            <article className="heroSceneCard">
              <div className="sceneHeader"><p>COSTS</p><span>Estimate before you start</span></div>
              <img src="/scene-estimator.svg" alt="Illustration of project cost planning" />
            </article>
            <article className="heroSceneCard">
              <div className="sceneHeader"><p>DIY</p><span>Learn as you build</span></div>
              <img src="/scene-diy.svg" alt="Illustration of a DIY home improvement project" />
            </article>
          </div>
        </div>
      </section>

      <section className="valueStrip">
        <p>Built for</p>
        {audience.map((item) => <span key={item}>{item}</span>)}
      </section>

      <section className="howSection" id="how-it-works">
        <div className="sectionHeading">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>One guided path instead of scattered tabs, guesswork, and lost notes.</h2>
        </div>

        <div className="plannerTimeline">
          {plannerSteps.map(([number, title, copy]) => (
            <article key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="imageFeatureSection" id="diy">
        <div className="imageFeatureCopy">
          <p className="eyebrow">DIY + PROFESSIONAL PATHS</p>
          <h2>Choose the route that fits your project.</h2>
          <p>
            Some users want to hire help. Others want to do the work themselves. Project Pilot supports both with cost guidance, material planning, and a clearer next step.
          </p>
          <ul>
            <li>Compare professional and DIY estimates</li>
            <li>See material cost breakdowns before buying</li>
            <li>Open trusted learning links for self-guided projects</li>
            <li>Keep documents and decisions in the same workspace</li>
          </ul>
        </div>
        <div className="imageFeatureVisual">
          <img src="/scene-diy.svg" alt="DIY project illustration" />
        </div>
      </section>

      <section className="featuresSection" id="features">
        <div className="sectionHeading">
          <p className="eyebrow">SPRINT 2.6 FEATURES</p>
          <h2>A more inviting beta experience with practical planning tools.</h2>
        </div>
        <div className="featureGrid">
          {featureCards.map(([title, copy], index) => (
            <article key={title}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricingSection" id="beta">
        <div>
          <p className="eyebrow">BETA ACCESS</p>
          <h2>Start free and help shape the final product.</h2>
          <p>
            Beta users can explore the workspace, create projects, review cost guidance, test DIY planning, and help validate the experience before public launch.
          </p>
        </div>
        <div className="pricingCard">
          <span>BETA</span>
          <strong>$0</strong>
          <small>during early access</small>
          <a href="#access">Create Free Account</a>
        </div>
      </section>

      <footer className="homeFooter">
        <a className="homeBrand" href="#top"><span>P</span><strong>Project Pilot</strong></a>
        <p>Piloting your project from concept to completion.</p>
        <small>Beta software. Permit guidance, cost guidance, and DIY education should always be confirmed before work begins.</small>
      </footer>
    </main>
  );
}
