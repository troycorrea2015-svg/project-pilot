"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./contractors.css";

const TRADE_OPTIONS = [
  "general contractor",
  "remodeling contractor",
  "kitchen remodeling contractor",
  "bathroom remodeling contractor",
  "deck builder",
  "roofing contractor",
  "fence contractor",
  "electrician",
  "plumber",
  "HVAC contractor",
  "swimming pool contractor",
  "concrete contractor",
  "landscaping contractor",
  "solar installer",
  "land surveyor",
  "architect",
];

const VERIFY_LINKS = {
  contractorRegistry: "https://contractorregistry.delaware.gov/",
  businessLicense: "https://revenue.delaware.gov/business-license-search/",
  professionalLicense: "https://delpros.delaware.gov/oh_verifylicense",
};

function inferTrade(project) {
  const text = `${project?.project_type || ""} ${project?.title || ""} ${project?.description || ""}`.toLowerCase();
  if (/kitchen/.test(text)) return "kitchen remodeling contractor";
  if (/bath(room)?|shower|tub/.test(text)) return "bathroom remodeling contractor";
  if (/deck|porch/.test(text)) return "deck builder";
  if (/roof|shingle/.test(text)) return "roofing contractor";
  if (/fence/.test(text)) return "fence contractor";
  if (/electric|panel|wiring|outlet|lighting/.test(text)) return "electrician";
  if (/plumb|water heater|pipe|sewer/.test(text)) return "plumber";
  if (/hvac|heat pump|air condition|furnace/.test(text)) return "HVAC contractor";
  if (/pool|spa|hot tub/.test(text)) return "swimming pool contractor";
  if (/concrete|driveway|slab|foundation/.test(text)) return "concrete contractor";
  if (/landscap|patio|hardscape|yard/.test(text)) return "landscaping contractor";
  if (/solar/.test(text)) return "solar installer";
  if (/survey|property line|boundary/.test(text)) return "land surveyor";
  if (/architect|addition|new construction/.test(text)) return "general contractor";
  if (/remodel|renovat|finish|repair/.test(text)) return "remodeling contractor";
  return "general contractor";
}

function projectLocation(project) {
  return project?.address || project?.location_label || project?.jurisdiction || "Delaware";
}

function normalizeDelawareLocation(value) {
  const clean = String(value || "").trim();
  if (!clean) return "Delaware";
  if (/\b(delaware|de)\b/i.test(clean) || /\b19\d{3}\b/.test(clean)) return clean;
  return `${clean}, Delaware`;
}

export default function ContractorsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [trade, setTrade] = useState("general contractor");
  const [location, setLocation] = useState("Delaware");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY || "";

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user || null;
      if (!mounted) return;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const { data, error: projectError } = await supabase
        .from("projects")
        .select("id,title,project_type,description,address,location_label,jurisdiction,updated_at")
        .eq("user_id", currentUser.id)
        .order("updated_at", { ascending: false });

      if (!mounted) return;
      if (projectError) setError(projectError.message);

      const list = Array.isArray(data) ? data : [];
      setProjects(list);

      const requestedProject = new URLSearchParams(window.location.search).get("project") || "";
      const selectedId = list.some((item) => item.id === requestedProject)
        ? requestedProject
        : list[0]?.id || "";

      setSelectedProjectId(selectedId);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (!selectedProject) return;
    setTrade(inferTrade(selectedProject));
    setLocation(projectLocation(selectedProject));
  }, [selectedProject]);

  const searchLocation = normalizeDelawareLocation(location);
  const searchQuery = `${trade} near ${searchLocation}`;
  const encodedQuery = encodeURIComponent(searchQuery);
  const embedUrl = embedKey
    ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(embedKey)}&q=${encodedQuery}`
    : "";
  const fullMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  if (loading) {
    return <main className="contractorLoading">Opening local contractor search…</main>;
  }

  if (!user) {
    return (
      <main className="contractorPage">
        <header className="contractorTopbar">
          <a href="/" className="contractorBrand"><img src="/project-pilot-lockup-light.svg" alt="Project Pilot" /></a>
        </header>
        <section className="signInPanel">
          <p>LOCAL CONTRACTORS</p>
          <h1>Sign in to search around your Project Pilot property.</h1>
          <span>Project Pilot uses your saved project type and location to make the contractor search more useful on the first try.</span>
          <button type="button" onClick={() => router.push("/#access")}>Sign In</button>
        </section>
      </main>
    );
  }

  return (
    <main className="contractorPage">
      <header className="contractorTopbar">
        <a href="/dashboard" className="contractorBrand"><img src="/project-pilot-lockup-light.svg" alt="Project Pilot" /></a>
        <nav><a href="/dashboard">Dashboard</a><a href="/support">Help</a></nav>
      </header>

      <section className="contractorHero">
        <div>
          <p>FIND LOCAL PROFESSIONALS</p>
          <h1>Real local contractors, right inside Project Pilot.</h1>
          <span>Project Pilot automatically builds a Google Maps search around the work and location saved in your project. Businesses shown do not need to be Project Pilot partners.</span>
        </div>
        <div className="freeBadge"><strong>$0 map usage</strong><span>Google Maps Embed</span></div>
      </section>

      <section className="contractorWorkspace">
        <aside className="contractorControls">
          <div className="controlHeading">
            <p>SEARCH DETAILS</p>
            <h2>Project Pilot starts with your project.</h2>
          </div>

          {projects.length ? (
            <>
              <label>
                Project
                <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              </label>

              <label>
                Professional needed
                <select value={trade} onChange={(event) => setTrade(event.target.value)}>
                  {TRADE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>

              <label>
                Search location
                <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Georgetown, DE 19947" />
              </label>

              <div className="queryPreview">
                <small>SEARCHING FOR</small>
                <strong>{searchQuery}</strong>
              </div>

              <a className="fullMapsButton" href={fullMapsUrl} target="_blank" rel="noreferrer">Open Full Google Maps Results ↗</a>

              <button className="backProjectButton" type="button" onClick={() => selectedProject && router.push(`/project/${selectedProject.id}`)}>
                Back to Project
              </button>
            </>
          ) : (
            <div className="emptyControl">
              <strong>Create a project first.</strong>
              <span>Once you have a project, Project Pilot can automatically search around its location and project type.</span>
              <button type="button" onClick={() => router.push("/dashboard")}>Go to Dashboard</button>
            </div>
          )}

          {error && <p className="contractorError">{error}</p>}
        </aside>

        <section className="mapPanel">
          <div className="mapHeading">
            <div><p>LOCAL RESULTS</p><h2>Browse the area without leaving Project Pilot.</h2></div>
            <span>Google Maps</span>
          </div>

          {!projects.length ? (
            <div className="mapPlaceholder"><strong>No project selected yet.</strong><span>Create a project to start local contractor search.</span></div>
          ) : !embedKey ? (
            <div className="mapPlaceholder setupNeeded">
              <strong>One free Google setup step remains.</strong>
              <span>Add <code>NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY</code> in Vercel after enabling the free Maps Embed API.</span>
            </div>
          ) : (
            <div className="mapFrameWrap">
              <iframe
                key={embedUrl}
                title={`Google Maps results for ${searchQuery}`}
                src={embedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </section>
      </section>

      <section className="verificationSection">
        <div className="verificationIntro">
          <p>VERIFY BEFORE YOU HIRE</p>
          <h2>Project Pilot keeps the official Delaware checks one click away.</h2>
          <span>Google results are discovery tools. Use the official state resources below to verify registration or licensing before choosing a professional.</span>
        </div>
        <div className="verificationGrid">
          <a href={VERIFY_LINKS.contractorRegistry} target="_blank" rel="noreferrer"><strong>Construction Contractor Registry</strong><span>Check Delaware contractor registration ↗</span></a>
          <a href={VERIFY_LINKS.businessLicense} target="_blank" rel="noreferrer"><strong>Business License Search</strong><span>Check Delaware business licensing ↗</span></a>
          <a href={VERIFY_LINKS.professionalLicense} target="_blank" rel="noreferrer"><strong>DELPROS License Verification</strong><span>Check regulated professional licenses ↗</span></a>
        </div>
      </section>

      <section className="contractorDisclaimer">
        <strong>About these results</strong>
        <p>Businesses displayed through Google Maps are third-party listings and are not automatically affiliated with, endorsed by, sponsored by, or verified by Project Pilot. Homeowners should independently verify licensing or registration, insurance, references, availability, estimates, contracts, and suitability before hiring.</p>
      </section>
    </main>
  );
}
