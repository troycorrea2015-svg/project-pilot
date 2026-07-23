"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./page.css";

const roles = ["Homeowner", "Contractor", "Property Manager", "Developer", "Investor"];

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
          <a href="#pricing">Pricing</a>
        </nav>
        <a className="navCta" href="#access">Get Started</a>
      </header>

      <section className="heroSection" id="top">
        <div className="heroCopy">
          <p className="eyebrow">A CLEARER COURSE FOR EVERY PROJECT</p>
          <h1>Piloting your project from concept to completion.</h1>
          <p className="heroLead">
            Plan smarter, keep decisions organized, and move every stage forward in one guided workspace built for homeowners and professionals.
          </p>

          <div className="heroTrust">
            <span>✓ Guided project setup</span>
            <span>✓ Saved progress and conversations</span>
            <span>✓ A clear Flight Plan for every project</span>
          </div>

          <div className="flightPreview" aria-label="Project flight plan preview">
            {[
              ["01", "Concept", "Define the work"],
              ["02", "Planning", "Organize details"],
              ["03", "Permits", "Prepare the path"],
              ["04", "Completion", "Close the project"],
            ].map(([number, title, detail], index) => (
              <div className="flightStep" key={title}>
                <span>{number}</span>
                <div><strong>{title}</strong><small>{detail}</small></div>
                {index < 3 && <i>→</i>}
              </div>
            ))}
          </div>
        </div>

        <section className="accessCard" id="access">
          <div className="pilotBadge"><span>P</span><div><strong>Welcome aboard.</strong><small>Access your Project Pilot workspace</small></div></div>

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
      </section>

      <section className="valueStrip">
        <p>Built for</p><span>Homeowners</span><span>Contractors</span><span>Property Managers</span><span>Developers</span><span>Investors</span>
      </section>

      <section className="howSection" id="how-it-works">
        <div className="sectionHeading"><p className="eyebrow">HOW IT WORKS</p><h2>One guided path instead of scattered notes, links, and guesswork.</h2></div>
        <div className="howGrid">
          <article><span>1</span><h3>Tell Pilot what you are planning.</h3><p>Start with your idea, property, timeline, and priorities.</p></article>
          <article><span>2</span><h3>Build your Flight Plan.</h3><p>Turn the idea into clear stages, next steps, and project milestones.</p></article>
          <article><span>3</span><h3>Keep everything moving.</h3><p>Return anytime to continue the project without losing context.</p></article>
        </div>
      </section>

      <section className="featuresSection" id="features">
        <div className="sectionHeading"><p className="eyebrow">BETA FEATURES</p><h2>The essentials for a convincing project command center.</h2></div>
        <div className="featureGrid">
          <article><b>01</b><h3>Pilot Workspace</h3><p>A guided place to turn an early idea into a defined project.</p></article>
          <article><b>02</b><h3>Persistent Projects</h3><p>Progress, messages, and next steps remain available when you return.</p></article>
          <article><b>03</b><h3>Flight Plan</h3><p>A branded roadmap showing where the project stands and what comes next.</p></article>
          <article><b>04</b><h3>Permit Path</h3><p>A growing foundation for jurisdiction-aware research and official resources.</p></article>
          <article><b>05</b><h3>Project Binder</h3><p>A central home for plans, estimates, photos, contracts, and inspections.</p></article>
          <article><b>06</b><h3>Professional Ready</h3><p>Designed to scale from a single home project to a professional portfolio.</p></article>
        </div>
      </section>

      <section className="pricingSection" id="pricing">
        <div><p className="eyebrow">BETA ACCESS</p><h2>Start free. Help shape what comes next.</h2><p>Beta users receive early access to the Project Pilot workspace while the permit intelligence, visualization, and professional network continue expanding.</p></div>
        <div className="pricingCard"><span>BETA</span><strong>$0</strong><small>during early access</small><a href="#access">Create Free Account</a></div>
      </section>

      <footer className="homeFooter">
        <a className="homeBrand" href="#top"><span>P</span><strong>Project Pilot</strong></a>
        <p>Piloting your project from concept to completion.</p>
        <small>Beta software. Permit guidance must be confirmed with the governing authority.</small>
      </footer>
    </main>
  );
}
