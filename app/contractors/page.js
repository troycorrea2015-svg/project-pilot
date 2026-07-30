"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./contractors.css";

const DEFAULT_FORM = {
  county: "",
  zipCode: "",
  budgetMin: "",
  budgetMax: "",
  desiredStart: "",
  summary: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  projectAddress: "",
};

function money(value) {
  const number = Number(value || 0);
  return number ? `$${number.toLocaleString("en-US")}` : "Not specified";
}

function textList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function calculateMatch(contractor, project, form) {
  let score = 35;
  const reasons = [];
  const projectText = normalize(`${project?.project_type || ""} ${project?.title || ""} ${project?.description || ""}`);
  const specialties = textList(contractor.specialties);
  const specialtyMatch = specialties.find((item) => {
    const term = normalize(item);
    return term && (projectText.includes(term) || term.includes(normalize(project?.project_type)));
  });

  if (specialtyMatch) {
    score += 35;
    reasons.push(`Specializes in ${specialtyMatch}`);
  } else if (specialties.length) {
    reasons.push("Offers related project services");
  }

  const zip = normalize(form.zipCode || project?.address?.match(/\b\d{5}\b/)?.[0]);
  const county = normalize(form.county || project?.jurisdiction);
  const zipMatch = zip && textList(contractor.service_zip_codes).some((item) => normalize(item) === zip);
  const countyMatch = county && textList(contractor.service_counties).some((item) => county.includes(normalize(item)) || normalize(item).includes(county));

  if (zipMatch) {
    score += 20;
    reasons.push(`Serves ZIP code ${zip}`);
  } else if (countyMatch) {
    score += 15;
    reasons.push("Serves the project county");
  }

  const budgetMax = Number(form.budgetMax || 0);
  const minimum = Number(contractor.minimum_project_value || 0);
  const maximum = contractor.maximum_project_value == null ? Infinity : Number(contractor.maximum_project_value);
  if (budgetMax && budgetMax >= minimum && budgetMax <= maximum) {
    score += 8;
    reasons.push("Project size fits their typical range");
  }

  if (contractor.availability && !normalize(contractor.availability).includes("paused")) {
    score += 5;
    reasons.push(contractor.availability);
  }

  if (Number(contractor.response_rate || 0) >= 80) {
    score += 4;
    reasons.push("Strong response history");
  }

  if (Number(contractor.rating || 0) >= 4) {
    score += 3;
    reasons.push("Strong customer rating");
  }

  reasons.unshift("Verified Project Pilot contractor");
  return { score: Math.min(99, Math.max(50, Math.round(score))), reasons: reasons.slice(0, 4) };
}

export default function ContractorsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user || null;

      if (!currentUser) {
        const contractorResult = await supabase.rpc("list_public_contractors");
        if (!mounted) return;
        setContractors(Array.isArray(contractorResult.data) ? contractorResult.data : []);
        if (contractorResult.error) setError(contractorResult.error.message?.includes("list_public_contractors") ? "The contractor network database update has not been installed yet." : contractorResult.error.message);
        setLoading(false);
        return;
      }

      const [profileResult, projectResult, contractorResult, requestResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, role").eq("id", currentUser.id).single(),
        supabase.from("projects").select("id, title, project_type, description, address, location_label, jurisdiction").eq("user_id", currentUser.id).order("updated_at", { ascending: false }),
        supabase.rpc("list_public_contractors"),
        supabase.rpc("get_my_marketplace_requests"),
      ]);

      if (!mounted) return;
      setUser(currentUser);
      setProfile(profileResult.data || null);
      setProjects(projectResult.data || []);
      setContractors(Array.isArray(contractorResult.data) ? contractorResult.data : []);
      setRequests(Array.isArray(requestResult.data) ? requestResult.data : []);
      const requestedProject = new URLSearchParams(window.location.search).get("project") || "";
      const firstProject = requestedProject || projectResult.data?.[0]?.id || "";
      setSelectedProjectId(firstProject);
      setForm((current) => ({
        ...current,
        contactName: profileResult.data?.full_name || currentUser.user_metadata?.full_name || "",
        contactEmail: currentUser.email || "",
      }));
      if (contractorResult.error && !String(contractorResult.error.message).includes("list_public_contractors")) setError(contractorResult.error.message);
      if (requestResult.error && !String(requestResult.error.message).includes("get_my_marketplace_requests")) setError(requestResult.error.message);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [router]);

  const selectedProject = useMemo(() => projects.find((item) => item.id === selectedProjectId) || null, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) return;
    setForm((current) => ({
      ...current,
      summary: current.summary || selectedProject.description || `I would like quotes and availability for ${selectedProject.title}.`,
      zipCode: current.zipCode || selectedProject.address?.match(/\b\d{5}\b/)?.[0] || "",
      county: current.county || selectedProject.jurisdiction || "",
      projectAddress: current.projectAddress || selectedProject.address || "",
    }));
    setSelected([]);
    setSuccess("");
  }, [selectedProjectId]);

  const matches = useMemo(() => contractors.map((contractor) => ({
    ...contractor,
    match: calculateMatch(contractor, selectedProject, form),
  })).sort((a, b) => b.match.score - a.match.score), [contractors, selectedProject, form.county, form.zipCode, form.budgetMax]);

  function toggleContractor(id) {
    setError("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        setError("Choose no more than three contractors so each introduction remains valuable.");
        return current;
      }
      return [...current, id];
    });
  }

  async function submitRequest(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedProject) { setError("Choose a project first."); return; }
    if (!selected.length) { setError("Choose at least one Best Match contractor."); return; }
    if (form.summary.trim().length < 10) { setError("Add a little more detail about the project."); return; }

    setSubmitting(true);
    const selectedMatches = matches.filter((item) => selected.includes(item.user_id)).map((item) => ({
      contractor_id: item.user_id,
      score: item.match.score,
      reasons: item.match.reasons,
    }));

    const { data, error: requestError } = await supabase.rpc("create_marketplace_lead", {
      p_project_id: selectedProject.id,
      p_matches: selectedMatches,
      p_project_summary: form.summary.trim(),
      p_county: form.county.trim(),
      p_zip_code: form.zipCode.trim(),
      p_budget_min: Number(form.budgetMin || 0),
      p_budget_max: form.budgetMax ? Number(form.budgetMax) : null,
      p_desired_start: form.desiredStart.trim(),
      p_contact_name: form.contactName.trim(),
      p_contact_email: form.contactEmail.trim(),
      p_contact_phone: form.contactPhone.trim(),
      p_project_address: form.projectAddress.trim(),
    });

    if (requestError) {
      setError(requestError.message?.includes("create_marketplace_lead")
        ? "The contractor network database update has not been installed yet. Run migration 010, then try again."
        : requestError.message);
      setSubmitting(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    fetch("/api/marketplace/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData?.session?.access_token || ""}` },
      body: JSON.stringify({ leadRequestId: data }),
    }).catch(() => null);

    const { data: refreshedRequests } = await supabase.rpc("get_my_marketplace_requests");
    if (Array.isArray(refreshedRequests)) setRequests(refreshedRequests);
    setSuccess("Your request was sent. Contractors will review the project before deciding whether to accept the introduction.");
    setSelected([]);
    setSubmitting(false);
  }

  if (loading) return <main className="marketplaceLoading">Finding verified contractors…</main>;

  if (normalize(profile?.role).includes("contractor")) {
    return (
      <main className="marketplacePage compactMarketplace">
        <header className="marketplaceTopbar"><a href="/dashboard" className="marketplaceBrand"><span>P</span><strong>Project Pilot</strong></a><a href="/contractor" className="primaryLink">Open Contractor Center</a></header>
        <section className="contractorRedirect"><p>CONTRACTOR ACCOUNT</p><h1>Your leads and business profile are in Contractor Center.</h1><span>Best Match placement is earned from project fit, verification, service area, availability, and performance. It cannot be purchased.</span><button onClick={() => router.push("/contractor")}>Open Contractor Center</button></section>
      </main>
    );
  }

  return (
    <main className="marketplacePage">
      <header className="marketplaceTopbar">
        <a href="/dashboard" className="marketplaceBrand"><span>P</span><strong>Project Pilot</strong></a>
        <nav>{user ? <a href="/dashboard">Dashboard</a> : <a href="/#access">Sign In</a>}<a href="/help">Help</a><a href="/terms">How introductions work</a></nav>
      </header>

      <section className="marketplaceHero">
        <div><p>BEST MATCH CONTRACTOR NETWORK</p><h1>Find professionals who fit the project—not whoever paid for placement.</h1><span>Project Pilot compares specialty, service area, verification, availability, typical project size, and performance. Contractors cannot buy a higher position.</span></div>
        <aside><strong>{matches.length}</strong><span>verified contractors available in the current network</span></aside>
      </section>

      <section className="marketplaceWorkspace">
        <aside className="requestBuilder">
          <div className="sectionTitle"><p>YOUR PROJECT</p><h2>Tell contractors what you need.</h2></div>
          {!user ? (
            <div className="emptyState"><strong>Create a free homeowner account to request introductions.</strong><span>You can browse verified contractors now. After signing in, Project Pilot uses your project details to calculate personalized Best Matches.</span><button onClick={() => router.push("/#access")}>Create Account or Sign In</button></div>
          ) : !projects.length ? (
            <div className="emptyState"><strong>Create a project first.</strong><span>Project Pilot uses the project details to calculate Best Matches.</span><button onClick={() => router.push("/dashboard")}>Go to Dashboard</button></div>
          ) : (
            <form onSubmit={submitRequest}>
              <label>Project<select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
              <label>Project summary<textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="What do you want completed? Include size, condition, and important details." required /></label>
              <div className="formSplit"><label>County<input value={form.county} onChange={(event) => setForm({ ...form, county: event.target.value })} placeholder="Sussex County" /></label><label>ZIP code<input value={form.zipCode} onChange={(event) => setForm({ ...form, zipCode: event.target.value })} placeholder="19968" /></label></div>
              <div className="formSplit"><label>Budget minimum<input type="number" min="0" value={form.budgetMin} onChange={(event) => setForm({ ...form, budgetMin: event.target.value })} placeholder="5000" /></label><label>Budget maximum<input type="number" min="0" value={form.budgetMax} onChange={(event) => setForm({ ...form, budgetMax: event.target.value })} placeholder="15000" /></label></div>
              <label>When would you like to start?<input value={form.desiredStart} onChange={(event) => setForm({ ...form, desiredStart: event.target.value })} placeholder="Within 30 days" /></label>

              <div className="contactBlock"><p>CONTACT DETAILS</p><span>These are released only after a contractor accepts the introduction.</span><label>Name<input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} required /></label><label>Email<input type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} required /></label><label>Phone<input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></label><label>Project address<input value={form.projectAddress} onChange={(event) => setForm({ ...form, projectAddress: event.target.value })} /></label></div>

              <div className="selectedSummary"><strong>{selected.length} of 3 selected</strong><span>Contractors see the fixed introduction fee before accepting. Homeowners are not charged.</span></div>
              {error && <div className="marketplaceError">{error}</div>}
              {success && <div className="marketplaceSuccess">{success}</div>}
              <button className="requestButton" disabled={submitting || !selected.length}>{submitting ? "Sending request…" : "Request introductions"}</button>
            </form>
          )}
        </aside>

        <section className="matchResults">
          <div className="resultsHeading"><div><p>{selectedProject ? "BEST MATCHES" : "VERIFIED CONTRACTORS"}</p><h2>{selectedProject ? "Choose up to three contractors." : "Browse professionals serving the Delmarva region."}</h2></div><span>Ranking is independent of payment.</span></div>
          {!matches.length ? (
            <div className="noMatches"><strong>No verified contractors are available yet.</strong><span>Project Pilot is onboarding professional partners. Your project remains saved while the network grows.</span></div>
          ) : matches.map((contractor) => {
            const checked = selected.includes(contractor.user_id);
            return (
              <article key={contractor.user_id} className={`matchCard ${checked ? "selected" : ""}`}>
                <div className={`matchScore ${selectedProject ? "" : "publicScore"}`}><strong>{selectedProject ? `${contractor.match.score}%` : "✓"}</strong><span>{selectedProject ? "Best Match" : "Verified"}</span></div>
                <div className="matchInfo">
                  <div className="verifiedLine"><span>VERIFIED</span>{contractor.rating > 0 && <b>{Number(contractor.rating).toFixed(1)} ★</b>}</div>
                  <h3>{contractor.business_name}</h3>
                  <p>{contractor.description || "Verified contractor serving Project Pilot customers."}</p>
                  <div className="matchReasons">{contractor.match.reasons.map((reason) => <span key={reason}>✓ {reason}</span>)}</div>
                  <div className="contractorFacts"><span>{textList(contractor.specialties).slice(0, 4).join(" · ") || "General contracting"}</span><span>{contractor.minimum_project_value || contractor.maximum_project_value ? `${money(contractor.minimum_project_value)}–${contractor.maximum_project_value ? money(contractor.maximum_project_value) : "No maximum"}` : "All project sizes"}</span></div>
                </div>
                <button type="button" onClick={() => user ? toggleContractor(contractor.user_id) : router.push("/#access")}>{user ? (checked ? "Selected ✓" : "Choose contractor") : "Sign in to request"}</button>
              </article>
            );
          })}
        </section>
      </section>

      <section className="homeownerRequests">
        <div className="resultsHeading"><div><p>MY INTRODUCTION REQUESTS</p><h2>Track the contractors you selected.</h2></div><span>Homeowners are never charged</span></div>
        {!user ? (
          <div className="noMatches"><strong>Your requests will be tracked here after you sign in.</strong><span>Create a project, select up to three contractors, and follow each introduction from request to acceptance.</span></div>
        ) : !requests.length ? (
          <div className="noMatches"><strong>No introduction requests yet.</strong><span>Choose a project and up to three Best Match contractors above.</span></div>
        ) : (
          <div className="requestStatusList">
            {requests.map((request) => (
              <article className="requestStatusCard" key={request.id}>
                <div className="requestStatusTop"><div><small>{request.project_type || "PROJECT"}</small><h3>{request.project_title}</h3><span>{request.county || request.zip_code || "Project location"} · {new Date(request.created_at).toLocaleDateString("en-US")}</span></div><b>{request.status}</b></div>
                <p>{request.project_summary}</p>
                <div className="requestMatchStatuses">
                  {(request.matches || []).map((match) => (
                    <div key={match.id}>
                      <span><strong>{match.business_name || "Contractor"}</strong><small>{match.match_score}% Best Match</small></span>
                      <b className={`requestState state${match.status}`}>{match.status === "Accepted" && ["Paid", "Waived"].includes(match.payment_status) ? "Accepted — contractor can contact you" : match.payment_status === "Refunded" ? "Introduction refunded" : match.payment_status === "Credited" ? "Introduction credited" : match.status}</b>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
