"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./page.css";

const PROJECT_SLIDES = [
  {
    key: "kitchen",
    label: "Kitchen",
    image: "/category-kitchen.jpg",
    title: "Kitchen Remodel",
    copy: "Plan the renovation, understand permit needs, organize documents, and keep the next step clear.",
  },
  {
    key: "bathroom",
    label: "Bathroom",
    image: "/category-bathroom.jpg",
    title: "Bathroom Remodel",
    copy: "Make plumbing, electrical, ventilation, and structural requirements easier to understand.",
  },
  {
    key: "deck",
    label: "Deck",
    image: "/category-deck.jpg",
    title: "Deck & Patio",
    copy: "Work through setbacks, footing details, inspections, documents, and local permit requirements.",
  },
  {
    key: "addition",
    label: "Addition",
    image: "/category-addition.jpg",
    title: "Home Addition",
    copy: "Coordinate zoning, structural requirements, trades, permits, and project milestones in one place.",
  },
  {
    key: "shed",
    label: "Shed / Garage",
    image: "/category-shed.jpg",
    title: "Shed or Garage",
    copy: "Check size, setbacks, foundations, utilities, and whether your local authority requires a permit.",
  },
  {
    key: "fence",
    label: "Fence",
    image: "/category-fence.jpg",
    title: "Fence Project",
    copy: "Understand height, placement, property-line, zoning, and pool-barrier rules before you build.",
  },
];

const dashboardMetrics = [
  ["Active Projects", "2", "View all projects"],
  ["Permits in Progress", "1", "View permits"],
  ["Messages", "3", "Unread"],
  ["Tasks Due", "1", "View next step"],
];

const popularProjects = PROJECT_SLIDES.slice(0, 5);

export default function HomePage() {
  const permitConciergePrice = Number.parseInt(process.env.NEXT_PUBLIC_PERMIT_CONCIERGE_PRICE_CENTS || "9900", 10) / 100;
  const router = useRouter();
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Homeowner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);

  const activeSlide = useMemo(() => PROJECT_SLIDES[slideIndex], [slideIndex]);

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (referralCode) localStorage.setItem("project_pilot_referral_code", referralCode.trim().toUpperCase());
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) router.replace("/dashboard");
      else setSessionLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (sliderPaused) return undefined;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % PROJECT_SLIDES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [sliderPaused]);

  function moveSlide(direction) {
    setSlideIndex((current) => (current + direction + PROJECT_SLIDES.length) % PROJECT_SLIDES.length);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role, referral_code: localStorage.getItem("project_pilot_referral_code") || undefined } },
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
        <a className="cleanBrand" href="#top" aria-label="Project Pilot home">
          <img src="/project-pilot-header-logo.png" alt="Project Pilot" />
        </a>
        <nav>
          <a href="#how">How It Works</a>
          <a href="#projects">Projects</a>
          <a href="#pricing">Pricing</a>
          <a href="#support">Support</a>
          <a href="#access">Log In</a>
        </nav>
        <a className="navCta" href="#access">Start My Project</a>
      </header>

      <section className="heroPanel" id="top">
        <div className="heroCopy">
          <p className="eyebrow"><span>●</span> PROJECT PILOT</p>
          <h1>Your project.<span>Guided from start to finish.</span></h1>
          <p className="heroLead">Tell us what you want to build or improve. Project Pilot organizes the plan, simplifies the permit path, and keeps the next action clear from day one.</p>
          <div className="heroActions">
            <a className="primaryAction" href="#access">Get Started Free</a>
            <a className="secondaryAction" href="#how">Learn More <span>→</span></a>
          </div>
          <div className="heroTrustRow legacyTrustRow">
            <div><b>✓</b><span><strong>Permit guidance</strong><small>Clear requirements, official starting points, and the next step.</small></span></div>
            <div><b>✓</b><span><strong>Trusted Process</strong><small>Clear, organized, and homeowner-friendly from day one.</small></span></div>
            <div><b>✓</b><span><strong>Built for Homeowners</strong><small>Use it free to plan, then upgrade only if you want hands-on help.</small></span></div>
          </div>
        </div>

        <div className="houseHeroPanel" aria-label="Project Pilot homepage hero image">
          <img className="houseHeroPhoto" src="/homepage-hero-house-4-5e.jpg" alt="Bright modern home in daytime" />
        </div>
      </section>

      <section className="processSection" id="how">
        <div className="sectionHeading"><p className="eyebrow">HOW IT WORKS</p><h2>Tell us what you’re building. Project Pilot figures out the rest.</h2></div>
        <div className="processSteps">
          <article><span>1</span><strong>Tell us about the project</strong><p>Choose a project type, location, and a few details.</p></article>
          <article><span>2</span><strong>We check the requirements</strong><p>Project Pilot determines the permit route and what information or documents are actually needed.</p></article>
          <article><span>3</span><strong>Continue with only the next action</strong><p>If a plan, survey, signature, or other item is required, we explain why and help you get it.</p></article>
          <article><span>4</span><strong>Submit & track approval</strong><p>Use the free guided path or let Permit Concierge handle the administrative coordination.</p></article>
        </div>
      </section>


      <section className="homepageSliderSection" id="projects" aria-label="Project types slideshow">
        <div className="sectionHeading centerHeading">
          <p className="eyebrow">POPULAR PROJECT TYPES</p>
          <h2>See the kinds of projects Project Pilot supports.</h2>
          <p>Browse common project types and jump in with the one that matches your home goals.</p>
        </div>
        <div
          className="projectSlider showcaseSlider"
          aria-roledescription="carousel"
          aria-label="Project types Project Pilot supports"
          onMouseEnter={() => setSliderPaused(true)}
          onMouseLeave={() => setSliderPaused(false)}
        >
          <div className="slideImageWrap" key={activeSlide.key}>
            <img src={activeSlide.image} alt={`${activeSlide.title} example`} />
            <div className="slideShade" />
            <div className="slideCopy">
              <span>PROJECT TYPE</span>
              <h2>{activeSlide.title}</h2>
              <p>{activeSlide.copy}</p>
            </div>
            <button className="slideArrow slideArrowLeft" type="button" onClick={() => moveSlide(-1)} aria-label="Previous project type">‹</button>
            <button className="slideArrow slideArrowRight" type="button" onClick={() => moveSlide(1)} aria-label="Next project type">›</button>
            <div className="slideDots" aria-label="Choose a project type">
              {PROJECT_SLIDES.map((slide, index) => (
                <button key={slide.key} className={index === slideIndex ? "active" : ""} type="button" onClick={() => setSlideIndex(index)} aria-label={`Show ${slide.title}`} />
              ))}
            </div>
          </div>
          <div className="slideThumbs">
            {PROJECT_SLIDES.slice(0, 4).map((slide, index) => (
              <button key={slide.key} className={index === slideIndex ? "active" : ""} type="button" onClick={() => setSlideIndex(index)}>
                <img src={slide.image} alt="" /><span>{slide.label}</span>
              </button>
            ))}
            <button className={slideIndex >= 4 ? "active" : ""} type="button" onClick={() => setSlideIndex(4)}>
              <img src={PROJECT_SLIDES[4].image} alt="" /><span>More</span>
            </button>
          </div>
        </div>
      </section>

      <section className="valueSection">
        <div className="sectionHeading centerHeading">
          <p className="eyebrow">ONE PLACE FOR THE WHOLE PROJECT</p>
          <h2>Everything you need, without making the experience complicated.</h2>
          <p>Project Pilot handles the organization so homeowners can focus on the project instead of the paperwork.</p>
        </div>
        <div className="valueGrid">
          <article><span className="featureIcon">⌂</span><h3>Smart Project Plan</h3><p>Answer a few questions and get an organized project path with scope, budget, tasks, and next steps.</p></article>
          <article><span className="featureIcon">✓</span><h3>Permit Done Right</h3><p>We identify the likely permit route, prepare the information, and only ask you for documents your specific project needs.</p></article>
          <article><span className="featureIcon">◔</span><h3>Track Progress</h3><p>See what is finished, what is waiting, and exactly what needs your attention next.</p></article>
          <article><span className="featureIcon">♙</span><h3>Trusted Pros</h3><p>Find contractors and professionals when your project needs expertise outside Project Pilot.</p></article>
        </div>
      </section>

      <section className="dashboardPreview" aria-label="Project Pilot dashboard preview">
        <aside className="previewSidebar">
          <div className="previewLogo"><img src="/project-pilot-approved-logo.png" alt="Project Pilot" /></div>
          <nav><span className="active">Dashboard</span><span>My Project</span><span>Progress</span><span>Messages</span><span>Files</span><span>Contractors</span><span>Help</span></nav>
          <div className="previewAssistant"><strong>SU</strong><small>Ask anything about your project</small></div>
        </aside>
        <div className="previewMain">
          <header><div><small>WELCOME BACK</small><h2>Your project is moving forward.</h2></div><button type="button">+ New Project</button></header>
          <div className="metricGrid">{dashboardMetrics.map(([label, value, note]) => <article key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></article>)}</div>
          <div className="previewFocusGrid">
            <article className="nextStepCard"><span>YOUR NEXT STEP</span><h3>Review permit requirements</h3><p>We checked your project. Continue to see exactly what your jurisdiction needs from you.</p><button type="button">Continue My Project →</button></article>
            <article className="progressCard"><span>PROJECT PROGRESS</span><strong>42%</strong><div className="progressLine"><i /></div><small>Requirements ready</small></article>
          </div>
          <div className="projectPreviewRow"><img src="/category-deck.jpg" alt="" /><div><small>ACTIVE PROJECT</small><strong>Deck Addition</strong><span>Planning → Requirements → Review → Approved</span></div><a href="#access">Open Project →</a></div>
        </div>
      </section>

      <section className="pricingSection" id="pricing">
        <div className="sectionHeading"><p className="eyebrow">SIMPLE PRICING</p><h2>Use Project Pilot free. Pay only when you want us to take over the permit coordination.</h2><p>Government permit fees and any required licensed-professional services are separate because they are controlled by the jurisdiction or professional—not Project Pilot.</p></div>
        <div className="pricingCards">
          <article className="pricingCard"><span>DO IT WITH PROJECT PILOT</span><strong>$0</strong><h3>Free Self-Service</h3><p>Permit route, project questions, requirement checklist, application preparation, documents, Su guidance, planning tools, and contractor search.</p><a href="#access">Start Free</a></article>
          <article className="pricingCard featuredPricing"><span>HAVE US HANDLE IT</span><strong>${permitConciergePrice.toFixed(0)}</strong><h3>Permit Concierge</h3><p>Project Pilot coordinates the administrative permit work. You step back in only for applicant-controlled signatures, identity checks, professional documents, approvals, or government payments.</p><a href="#access">Start My Project</a></article>
        </div>
      </section>

      <section className="referralSection" id="support">
        <div><p className="eyebrow">LOYALTY THAT REWARDS SHARING</p><h2>Give $10. Get $10.</h2><p>Invite a friend to Project Pilot. They receive $10 Project Pilot credit toward their first eligible Concierge order, and you earn $10 credit after their paid order is completed.</p></div>
        <div className="referralBadge"><span>♥</span><strong>Happy project?</strong><p>Share Project Pilot with the next homeowner who needs it.</p></div>
      </section>

      <section className="accessSection" id="access">
        <div className="sectionHeading"><p className="eyebrow">START YOUR PROJECT</p><h2>Create your free Project Pilot workspace.</h2><p>No homeowner subscription is required. Start with your project and decide later if you want Permit Concierge.</p></div>
        <div className="accessCard">
          <div className="authTabs"><button className={mode === "signup" ? "active" : ""} type="button" onClick={() => { setMode("signup"); setStatus(""); }}>Create Account</button><button className={mode === "signin" ? "active" : ""} type="button" onClick={() => { setMode("signin"); setStatus(""); }}>Sign In</button></div>
          <form onSubmit={handleSubmit}>
            {mode === "signup" && <><label><span>Name</span><input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label><label><span>I’m using Project Pilot as a…</span><select value={role} onChange={(event) => setRole(event.target.value)}><option>Homeowner</option><option>Contractor</option><option>Property Manager</option><option>Project Manager</option><option>Developer / Investor</option></select></label></>}
            <label><span>Email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
            <label><span>Password</span><input required minLength="6" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
            {mode === "signin" && <button type="button" className="forgotButton" onClick={resetPassword}>Forgot password?</button>}
            <button type="submit" className="authSubmit" disabled={loading}>{loading ? "Working…" : mode === "signup" ? "Start My Project" : "Sign In"}</button>
            {status && <div className="authStatus" role="status">{status}</div>}
          </form>
        </div>
      </section>

      <footer className="homeFooter">
        <div className="footerBrand"><img src="/project-pilot-approved-logo.png" alt="Project Pilot" /></div>
        <p>Projects made easier—from the first idea through permit approval.</p>
        <small>Project Pilot provides planning, organization, permit guidance, and administrative coordination. Government approvals, legal signatures, professional seals, and licensed-professional determinations remain with the appropriate applicant, authority, or professional.</small>
        <small className="buildStamp">Homepage build 4.5F</small>
      </footer>
    </main>
  );
}
