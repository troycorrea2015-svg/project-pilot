"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./page.css";

const launchChecks = [
  "Guided permit process in plain English",
  "One-image faithful remodel generation",
  "Permit Concierge for hands-on support",
  "Project planning, tasks, documents, and budgets in one place",
];

const featureBar = [
  ["AI Guidance", "Smarter answers every step of the way"],
  ["Permit Confidence", "Clear steps, fewer headaches"],
  ["Trusted Pros", "Verified contractors, stronger results"],
  ["Budget Control", "Track costs and stay on budget"],
  ["Real Results", "Manage projects from idea to approval"],
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
    return () => { active = false; };
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
    setStatus("");
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    setStatus(error ? error.message : "Password reset email sent. Check your inbox.");
  }

  if (sessionLoading) return <main className="homeLoading">Opening Project Pilot…</main>;

  return (
    <main className="homePage">
      <section className="homeShell" id="top">
        <header className="heroHeader">
          <a className="homeBrand" href="#top" aria-label="Project Pilot home">
            <Image src="/homepage-logo-approved.png" alt="Project Pilot" width={139} height={26} priority />
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

        <section className="heroPanel">
          <div className="heroCopy">
            <p className="eyebrow">YOUR HOME PROJECTS</p>
            <h1>
              Your project.
              <span> Guided from start to finish.</span>
            </h1>
            <p className="heroLead">
              AI-powered guidance for permits, planning, budgets, and the right pros — all in one launch-ready homeowner workspace.
            </p>
            <div className="heroActions">
              <a className="primaryAction" href="#access">Get Started</a>
              <a className="secondaryAction" href="#how">See How It Works</a>
            </div>
            <div className="heroTrustRow">
              <div><strong>Permit Confidence</strong><span>Guided permit steps with clear explanations</span></div>
              <div><strong>Trusted Pros</strong><span>Connect with vetted contractors</span></div>
              <div><strong>Better Outcomes</strong><span>Plan with budgets, tasks, and real next steps</span></div>
            </div>
          </div>
          <div className="heroVisual">
            <Image src="/homepage-hero-reference.png" alt="Approved hero reference" width={275} height={212} priority />
          </div>
        </section>

        <section className="previewBoard" id="solutions">
          <Image src="/homepage-preview-reference.png" alt="Approved dashboard preview reference" width={498} height={162} />
        </section>
      </section>

      <section className="featureRibbon" id="how">
        {featureBar.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <span>{copy}</span>
          </article>
        ))}
      </section>

      <section className="launchSection" id="resources">
        <div className="sectionHeading">
          <p className="eyebrow">WHY HOMEOWNERS USE PROJECT PILOT</p>
          <h2>Everything you need to move from idea to approval — without losing track of the details.</h2>
          <p>
            Project Pilot helps homeowners plan visually, understand permit requirements, organize documents, and keep the next step clear.
          </p>
        </div>
        <div className="launchGrid">
          <div className="launchChecks">
            {launchChecks.map((item) => (
              <div key={item} className="launchCheckItem">
                <span>✓</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className="launchCard">
            <span>FOUNDING HOMEOWNER LAUNCH</span>
            <strong>Built for real projects — decks, kitchens, bathrooms, additions, permits, and more.</strong>
            <p>
              Start a project today and let Project Pilot guide the plan, the visuals, the permit path, and the next action.
            </p>
            <a href="#access">Create my account</a>
          </div>
        </div>
      </section>

      <section className="pricingSection" id="pricing">
        <div>
          <p className="eyebrow">LAUNCH PRICING</p>
          <h2>Launch now and refine with real homeowners.</h2>
          <p>
            Project Pilot is ready for a controlled public launch. Permit preparation, Project Vision, and Su stay connected in one workspace while daily AI limits help protect costs.
          </p>
        </div>
        <div className="pricingCard">
          <span>FOUNDING ACCESS</span>
          <strong>$0</strong>
          <small>Invite homeowners, validate the workflow, and gather launch feedback.</small>
          <a href="#access">Open Project Pilot</a>
        </div>
      </section>

      <section className="accessSection" id="access">
        <div className="sectionHeading compact">
          <p className="eyebrow">GET STARTED</p>
          <h2>Open your Project Pilot workspace.</h2>
          <p>Create a homeowner account for launch, or sign back in to continue your projects.</p>
        </div>

        <div className="accessCard">
          <div className="authTabs">
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setStatus(""); }}>Create Account</button>
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setStatus(""); }}>Log In</button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label>
                  Full name
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
                </label>
                <label>
                  Account type
                  <select value={role} onChange={(event) => setRole(event.target.value)}>
                    <option>Homeowner</option>
                    <option>Contractor</option>
                    <option>Property Manager</option>
                    <option>Developer</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" placeholder="At least 6 characters" required />
            </label>
            {mode === "signin" && <button className="forgotButton" type="button" onClick={resetPassword}>Forgot password?</button>}
            <button className="authSubmit" type="submit" disabled={loading}>
              {loading ? "Working…" : mode === "signup" ? "Create My Account" : "Open My Projects"}
            </button>
          </form>
          {status && <p className="authStatus">{status}</p>}
          <p className="accessNote">Need help? Use the support page after sign-in or reply to your launch message.</p>
        </div>
      </section>

      <footer className="homeFooter">
        <a className="homeBrand footerBrand" href="#top" aria-label="Project Pilot home">
          <Image src="/homepage-logo-approved.png" alt="Project Pilot" width={139} height={26} />
        </a>
        <p>Plan every improvement around your home without losing track of the details.</p>
        <small>Project Pilot provides planning support, permit guidance, visual concepts, and homeowner tools. Government approvals, professional seals, and legal or licensed determinations still require the appropriate authority or professional.</small>
      </footer>
    </main>
  );
}
