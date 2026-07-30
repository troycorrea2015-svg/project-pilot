"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./contractor.css";

const SPECIALTY_OPTIONS = ["Deck", "Patio", "Fence", "Kitchen", "Bathroom", "Addition", "Roofing", "Shed", "Garage", "General Contracting"];
const COUNTY_OPTIONS = ["Sussex County", "Kent County", "New Castle County", "Wicomico County", "Worcester County", "Dorchester County", "Somerset County", "Talbot County", "Caroline County", "Queen Anne's County", "Accomack County", "Northampton County"];

const EMPTY_PROFILE = {
  business_name: "",
  contact_name: "",
  phone: "",
  website: "",
  description: "",
  specialties: [],
  service_counties: [],
  service_zip_codes: [],
  minimum_project_value: 0,
  maximum_project_value: "",
  availability: "Contact for availability",
  license_state: "DE",
  license_number: "",
  insurance_status: "Not submitted",
  verification_status: "Pending",
  active: true,
  terms_accepted_at: null,
};

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(0)}`;
}

function date(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ContractorCenterPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [matches, setMatches] = useState([]);
  const [contacts, setContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) { router.replace("/"); return; }

      const [profileResult, matchResult] = await Promise.all([
        supabase.rpc("get_my_contractor_profile"),
        supabase.from("marketplace_lead_matches").select("id, lead_request_id, match_score, match_reasons, status, fee_cents, payment_status, paid_amount_cents, offered_at, accepted_at, marketplace_lead_requests(id, project_title, project_type, project_summary, county, zip_code, budget_min, budget_max, desired_start, status)").eq("contractor_id", currentUser.id).order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;
      setUser(currentUser);
      setProfile({
        ...EMPTY_PROFILE,
        ...(profileResult.data || {}),
        contact_name: profileResult.data?.contact_name || currentUser.user_metadata?.full_name || "",
      });
      setMatches(matchResult.data || []);

      const acceptedRequestIds = (matchResult.data || []).filter((item) => item.status === "Accepted" && ["Paid", "Waived"].includes(item.payment_status)).map((item) => item.lead_request_id);
      if (acceptedRequestIds.length) {
        const { data: contactData } = await supabase.from("marketplace_lead_contacts").select("*").in("lead_request_id", acceptedRequestIds);
        setContacts(Object.fromEntries((contactData || []).map((item) => [item.lead_request_id, item])));
      }

      if (profileResult.error && !String(profileResult.error.message).includes("contractor_profiles")) setError(profileResult.error.message);
      if (matchResult.error && !String(matchResult.error.message).includes("marketplace_lead_matches")) setError(matchResult.error.message);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment === "success") setMessage("Payment received. Stripe is confirming the introduction and contact details will appear shortly. Refresh this page in a few seconds.");
    if (payment === "cancelled") {
      const matchId = new URLSearchParams(window.location.search).get("match_id");
      setMessage("Checkout was cancelled. The opportunity is still available.");
      if (matchId) resetCheckout(matchId, true);
    }
  }, []);

  const stats = useMemo(() => ({
    offered: matches.filter((item) => item.status === "Offered").length,
    accepted: matches.filter((item) => item.status === "Accepted").length,
    paid: matches.filter((item) => item.payment_status === "Paid").length,
    potential: matches.filter((item) => item.status === "Offered").reduce((sum, item) => sum + Number(item.fee_cents || 0), 0),
  }), [matches]);

  function toggleList(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    if (!profile.business_name.trim() || !profile.phone.trim() || !profile.specialties.length || !profile.service_counties.length) {
      setError("Add your business name, phone number, at least one specialty, and at least one service county.");
      setSaving(false);
      return;
    }

    if (!profile.terms_accepted_at) {
      setError("Review and accept the contractor partner terms before submitting your profile.");
      setSaving(false);
      return;
    }

    const payload = {
      business_name: profile.business_name.trim(),
      contact_name: profile.contact_name.trim(),
      phone: profile.phone.trim(),
      website: profile.website.trim(),
      description: profile.description.trim(),
      specialties: profile.specialties,
      service_counties: profile.service_counties,
      service_zip_codes: String(profile.service_zip_codes || "").split(",").map((item) => item.trim()).filter(Boolean),
      minimum_project_value: Number(profile.minimum_project_value || 0),
      maximum_project_value: profile.maximum_project_value ? Number(profile.maximum_project_value) : null,
      availability: profile.availability.trim(),
      license_state: profile.license_state.trim().toUpperCase(),
      license_number: profile.license_number.trim(),
      insurance_status: profile.insurance_status,
      active: Boolean(profile.active),
      terms_accepted_at: profile.terms_accepted_at,
    };

    const { data: savedProfile, error: profileError } = await supabase.rpc("save_my_contractor_profile", { p_profile: payload });
    await supabase.auth.updateUser({ data: { ...user.user_metadata, role: "Contractor" } });

    if (profileError) {
      setError(profileError?.message?.includes("save_my_contractor_profile") ? "Run migration 010 in Supabase before saving the contractor profile." : profileError?.message);
    } else {
      setProfile((current) => ({ ...current, ...(savedProfile || payload), verification_status: savedProfile?.verification_status || current.verification_status || "Pending" }));
      setMessage("Profile saved. Project Pilot will review your registration, license, and insurance information before showing you in Best Match results.");
    }
    setSaving(false);
  }

  async function declineLead(id) {
    setProcessingId(id);
    setError("");
    const { error: declineError } = await supabase.rpc("decline_marketplace_lead", { p_match_id: id });
    if (declineError) setError(declineError.message);
    else setMatches((current) => current.map((item) => item.id === id ? { ...item, status: "Declined" } : item));
    setProcessingId("");
  }

  async function acceptLead(match) {
    setProcessingId(match.id);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/marketplace/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData?.session?.access_token || ""}` },
      body: JSON.stringify({ matchId: match.id }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.url) {
      setError(payload.error || "Checkout could not be opened. Confirm Stripe and marketplace environment variables in Vercel.");
      setProcessingId("");
      return;
    }
    window.location.assign(payload.url);
  }

  async function resetCheckout(matchId, silent = false) {
    if (!matchId) return;
    if (!silent) setProcessingId(matchId);
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/marketplace/checkout/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData?.session?.access_token || ""}` },
      body: JSON.stringify({ matchId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || "Checkout could not be reset.");
    else setMatches((current) => current.map((item) => item.id === matchId ? { ...item, payment_status: "Unpaid", stripe_checkout_session_id: null } : item));
    if (!silent) setProcessingId("");
  }

  async function requestCredit(match) {
    const reason = window.prompt("Why should this introduction be reviewed for a credit? Examples: duplicate lead, invalid contact, outside service area.");
    if (!reason?.trim()) return;
    const details = window.prompt("Add any helpful details.") || "";
    const { error: creditError } = await supabase.rpc("request_marketplace_lead_credit", { p_match_id: match.id, p_reason: reason.trim(), p_details: details.trim() });
    if (creditError) setError(creditError.message);
    else setMessage("Credit request submitted for admin review.");
  }

  if (loading) return <main className="contractorLoading">Opening Contractor Center…</main>;

  const zipText = Array.isArray(profile.service_zip_codes) ? profile.service_zip_codes.join(", ") : profile.service_zip_codes;

  return (
    <main className="contractorPage">
      <aside className="contractorRail">
        <a href="/dashboard" className="contractorBrand"><span>P</span><strong>Project Pilot</strong></a>
        <div className="contractorIdentity"><small>CONTRACTOR CENTER</small><strong>{profile.business_name || user?.email}</strong><span>{profile.verification_status}</span></div>
        <nav><a className="active" href="#overview">Overview</a><a href="#opportunities">Opportunities</a><a href="#profile">Business Profile</a><a href="/contractors">Best Match Network</a><a href="/dashboard">User Dashboard</a><a href="/terms">Partner Terms</a></nav>
        <div className="rankingPromise"><strong>No paid placement</strong><span>Payment never raises your Best Match position.</span></div>
      </aside>

      <section className="contractorMain">
        <header className="contractorHeader" id="overview"><div><p>CONTRACTOR PARTNER WORKSPACE</p><h1>Manage your profile and qualified project opportunities.</h1><span>Joining is free. You pay only when you choose to accept a qualified homeowner introduction.</span></div><a href="/contractors">View Best Match experience</a></header>

        {message && <div className="contractorMessage">{message}</div>}
        {error && <div className="contractorError">{error}</div>}

        <section className="contractorStats">
          <article><span>New opportunities</span><strong>{stats.offered}</strong><small>Waiting for your decision</small></article>
          <article><span>Accepted</span><strong>{stats.accepted}</strong><small>Introductions unlocked</small></article>
          <article><span>Paid introductions</span><strong>{stats.paid}</strong><small>Completed checkout</small></article>
          <article><span>Open fee value</span><strong>{money(stats.potential)}</strong><small>Only charged if accepted</small></article>
        </section>

        <section className="contractorPanel" id="opportunities">
          <div className="contractorPanelHeading"><div><p>QUALIFIED OPPORTUNITIES</p><h2>Review the project before paying.</h2></div><span>Fixed fee shown on every lead</span></div>
          <div className="opportunityList">
            {matches.length ? matches.map((match) => {
              const lead = match.marketplace_lead_requests || {};
              const contact = contacts[match.lead_request_id];
              return (
                <article key={match.id} className={`opportunityCard status${match.status}`}>
                  <div className="opportunityTop"><div><span>{match.match_score}% BEST MATCH</span><h3>{lead.project_title || "Project opportunity"}</h3><p>{lead.project_type} · {lead.county || lead.zip_code || "Location available after acceptance"}</p></div><div><strong>{money(match.fee_cents)}</strong><small>introduction fee</small></div></div>
                  <p className="opportunitySummary">{lead.project_summary}</p>
                  <div className="opportunityFacts"><span>Budget: {lead.budget_max ? `$${Number(lead.budget_min || 0).toLocaleString()}–$${Number(lead.budget_max).toLocaleString()}` : "Not specified"}</span><span>Start: {lead.desired_start || "Flexible"}</span><span>Offered: {date(match.offered_at)}</span></div>
                  <div className="opportunityReasons">{(match.match_reasons || []).map((reason) => <span key={reason}>✓ {reason}</span>)}</div>

                  {contact && <div className="unlockedContact"><p>HOMEOWNER CONTACT UNLOCKED</p><strong>{contact.contact_name}</strong><a href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a>{contact.contact_phone && <a href={`tel:${contact.contact_phone}`}>{contact.contact_phone}</a>}<span>{contact.project_address}</span></div>}

                  <div className="opportunityActions">
                    {match.status === "Offered" && match.payment_status !== "Pending" && <><button className="decline" disabled={processingId === match.id} onClick={() => declineLead(match.id)}>Decline</button><button className="accept" disabled={processingId === match.id} onClick={() => acceptLead(match)}>{processingId === match.id ? "Opening checkout…" : `Accept for ${money(match.fee_cents)}`}</button></>}
                    {match.status === "Offered" && match.payment_status === "Pending" && <><span className="pendingLabel">Checkout started</span><button className="credit" disabled={processingId === match.id} onClick={() => resetCheckout(match.id)}>{processingId === match.id ? "Resetting…" : "Restart checkout"}</button></>}
                    {match.status === "Accepted" && <><span className="acceptedLabel">Accepted · {match.payment_status}</span><button className="credit" onClick={() => requestCredit(match)}>Request lead review</button></>}
                    {match.status === "Declined" && <span className="declinedLabel">Declined</span>}
                  </div>
                </article>
              );
            }) : <div className="contractorEmpty"><strong>No opportunities yet.</strong><span>Complete your profile and wait for verification. New matching projects will appear here.</span></div>}
          </div>
        </section>

        <section className="contractorPanel" id="profile">
          <div className="contractorPanelHeading"><div><p>BUSINESS PROFILE</p><h2>Help Project Pilot match the right work to you.</h2></div><span>{profile.verification_status} verification</span></div>
          <form className="contractorForm" onSubmit={saveProfile}>
            <div className="formGrid"><label>Business name<input value={profile.business_name} onChange={(event) => setProfile({ ...profile, business_name: event.target.value })} required /></label><label>Contact name<input value={profile.contact_name} onChange={(event) => setProfile({ ...profile, contact_name: event.target.value })} /></label><label>Phone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} required /></label><label>Website<input value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} placeholder="https://" /></label></div>
            <label>Business description<textarea value={profile.description} onChange={(event) => setProfile({ ...profile, description: event.target.value })} placeholder="Describe the work you do best and the customers you serve." /></label>

            <fieldset><legend>Project specialties</legend><p>Choose every category you are equipped and qualified to complete.</p><div className="choiceGrid">{SPECIALTY_OPTIONS.map((item) => <button type="button" key={item} className={profile.specialties.includes(item) ? "selected" : ""} onClick={() => toggleList("specialties", item)}>{profile.specialties.includes(item) ? "✓ " : ""}{item}</button>)}</div></fieldset>
            <fieldset><legend>Service counties</legend><p>Best Match uses these areas along with the homeowner's project location.</p><div className="choiceGrid counties">{COUNTY_OPTIONS.map((item) => <button type="button" key={item} className={profile.service_counties.includes(item) ? "selected" : ""} onClick={() => toggleList("service_counties", item)}>{profile.service_counties.includes(item) ? "✓ " : ""}{item}</button>)}</div></fieldset>

            <div className="formGrid"><label>Service ZIP codes<input value={zipText} onChange={(event) => setProfile({ ...profile, service_zip_codes: event.target.value })} placeholder="19968, 19947, 19963" /></label><label>Availability<input value={profile.availability} onChange={(event) => setProfile({ ...profile, availability: event.target.value })} placeholder="Available within 3 weeks" /></label><label>Minimum project value<input type="number" min="0" value={profile.minimum_project_value} onChange={(event) => setProfile({ ...profile, minimum_project_value: event.target.value })} /></label><label>Maximum project value<input type="number" min="0" value={profile.maximum_project_value ?? ""} onChange={(event) => setProfile({ ...profile, maximum_project_value: event.target.value })} placeholder="Leave blank for no maximum" /></label><label>License state<input value={profile.license_state} maxLength="2" onChange={(event) => setProfile({ ...profile, license_state: event.target.value })} /></label><label>License / registration number<input value={profile.license_number} onChange={(event) => setProfile({ ...profile, license_number: event.target.value })} /></label><label>Insurance status<select value={profile.insurance_status} onChange={(event) => setProfile({ ...profile, insurance_status: event.target.value })}>{["Verified", "Expired"].includes(profile.insurance_status) && <option value={profile.insurance_status}>{profile.insurance_status} (admin status)</option>}<option>Not submitted</option><option>Submitted</option></select><small>Project Pilot confirms verified or expired status after review.</small></label><label className="activeToggle"><input type="checkbox" checked={profile.active} onChange={(event) => setProfile({ ...profile, active: event.target.checked })} /><span>Accept new Best Match opportunities</span></label></div>

            <label className="termsCheck"><input type="checkbox" checked={Boolean(profile.terms_accepted_at)} onChange={(event) => setProfile({ ...profile, terms_accepted_at: event.target.checked ? new Date().toISOString() : null })} /><span>I agree to the <a href="/terms" target="_blank">Project Pilot contractor partner terms</a>, including fixed introduction fees, no guaranteed job award, and no paid ranking.</span></label>
            <button className="saveProfileButton" disabled={saving}>{saving ? "Saving profile…" : "Save contractor profile"}</button>
          </form>
        </section>
      </section>
    </main>
  );
}
