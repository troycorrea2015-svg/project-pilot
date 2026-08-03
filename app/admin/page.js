"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./admin.css";

const EMPTY_SUMMARY = {
  total_accounts: 0,
  new_accounts_7d: 0,
  new_accounts_30d: 0,
  active_accounts_30d: 0,
  total_projects: 0,
  active_projects: 0,
  completed_projects: 0,
  total_feedback: 0,
  open_feedback: 0,
  total_events: 0,
  account_breakdown: [],
  project_type_breakdown: [],
};

const EMPTY_MARKETPLACE = {
  contractor_profiles: 0,
  verified_contractors: 0,
  pending_contractors: 0,
  lead_requests: 0,
  open_leads: 0,
  lead_offers: 0,
  accepted_leads: 0,
  paid_leads: 0,
  actual_revenue_cents: 0,
  pending_fee_value_cents: 0,
  credit_requests: 0,
};

const EMPTY_LAUNCH_HEALTH = {
  siteUrlConfigured: false,
  serviceRoleConfigured: false,
  stripeConfigured: false,
  webhookConfigured: false,
  paymentsEnabled: false,
  emailConfigured: false,
  mode: "Not configured",
};

function number(value) { return Number(value || 0).toLocaleString("en-US"); }
function money(cents) { return `$${(Number(cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString("en-US") : "—"; }

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [marketplace, setMarketplace] = useState(EMPTY_MARKETPLACE);
  const [launchHealth, setLaunchHealth] = useState(EMPTY_LAUNCH_HEALTH);
  const [feedback, setFeedback] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [credits, setCredits] = useState([]);
  const [permitCases, setPermitCases] = useState([]);
  const [conciergeRequests, setConciergeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadAdmin() {
      setLoading(true);
      setError("");
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) { router.replace("/"); return; }
      if (!mounted) return;
      setUser(currentUser);

      const { data: profileData, error: profileError } = await supabase.from("profiles").select("id, full_name, role, is_admin").eq("id", currentUser.id).maybeSingle();
      if (!mounted) return;
      if (profileError || !profileData) {
        setError("Your profile or administrator setup is incomplete. Run migrations 009 and 010 in Supabase.");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      if (!profileData.is_admin) { setLoading(false); return; }

      const { data: sessionData } = await supabase.auth.getSession();
      const healthRequest = fetch("/api/marketplace/health", {
        headers: { Authorization: `Bearer ${sessionData?.session?.access_token || ""}` },
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        return { data, error: response.ok ? null : new Error(data.error || "Launch status could not be loaded.") };
      }).catch((healthError) => ({ data: null, error: healthError }));

      const results = await Promise.all([
        supabase.rpc("admin_dashboard_summary"),
        supabase.rpc("admin_marketplace_summary"),
        supabase.from("beta_feedback").select("id, category, message, rating, page_path, status, admin_notes, created_at, user_id").order("created_at", { ascending: false }).limit(100),
        supabase.rpc("admin_contractor_directory"),
        supabase.from("marketplace_lead_credits").select("id, reason, details, status, admin_notes, created_at, contractor_id, lead_match_id").order("created_at", { ascending: false }).limit(100),
        supabase.from("permit_cases").select("id, project_id, user_id, jurisdiction, status, readiness_score, application_reference, concierge_requested_at, submitted_at, activity, updated_at").order("updated_at", { ascending: false }).limit(100),
        supabase.from("permit_concierge_requests").select("id, permit_case_id, project_id, user_id, status, requested_services, preferred_contact, contact_email, contact_phone, assigned_to, requested_at, updated_at").order("updated_at", { ascending: false }).limit(100),
        healthRequest,
      ]);

      if (!mounted) return;
      const [summaryResult, marketplaceResult, feedbackResult, contractorResult, creditResult, permitCaseResult, conciergeRequestResult, healthResult] = results;
      const firstError = [summaryResult.error, marketplaceResult.error, feedbackResult.error, contractorResult.error, creditResult.error, permitCaseResult.error, conciergeRequestResult.error, healthResult.error].find(Boolean);
      if (firstError) {
        if (firstError.message?.includes("admin_marketplace_summary")) setError("Run migration 010 in Supabase to activate marketplace reporting.");
        else if (firstError.message?.includes("permit_concierge_requests")) setError("Run migration 013 in Supabase to activate the Permit Concierge operating queue.");
        else if (firstError.message?.includes("permit_cases")) setError("Run migration 012 in Supabase to activate Permit Autopilot.");
        else setError(firstError.message);
      }
      setSummary({ ...EMPTY_SUMMARY, ...(summaryResult.data || {}) });
      setMarketplace({ ...EMPTY_MARKETPLACE, ...(marketplaceResult.data || {}) });
      setLaunchHealth({ ...EMPTY_LAUNCH_HEALTH, ...(healthResult.data || {}) });
      setFeedback(feedbackResult.data || []);
      setContractors(Array.isArray(contractorResult.data) ? contractorResult.data : []);
      setCredits(creditResult.data || []);
      setPermitCases(permitCaseResult.data || []);
      setConciergeRequests(conciergeRequestResult.data || []);
      setLoading(false);
    }

    loadAdmin();
    return () => { mounted = false; };
  }, [router]);

  const maxAccountCount = useMemo(() => Math.max(1, ...(summary.account_breakdown || []).map((item) => Number(item.count || 0))), [summary.account_breakdown]);

  async function updateFeedback(id, status) {
    const { error: updateError } = await supabase.from("beta_feedback").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) { setError(updateError.message); return; }
    setFeedback((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  async function verifyContractor(id, status) {
    setNotice("");
    const { error: updateError } = await supabase.rpc("admin_set_contractor_verification", { p_contractor_id: id, p_status: status });
    if (updateError) { setError(updateError.message); return; }
    setContractors((current) => current.map((item) => item.user_id === id ? { ...item, verification_status: status } : item));
    setNotice(`Contractor status updated to ${status}.`);
  }

  async function updateContractorInsurance(id, status) {
    setNotice("");
    const { error: updateError } = await supabase.rpc("admin_set_contractor_insurance", { p_contractor_id: id, p_status: status });
    if (updateError) { setError(updateError.message); return; }
    setContractors((current) => current.map((item) => item.user_id === id ? { ...item, insurance_status: status } : item));
    setNotice(`Contractor insurance status updated to ${status}.`);
  }

  async function updateCredit(id, status) {
    setError("");
    if (status === "Issued") {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/marketplace/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData?.session?.access_token || ""}` },
        body: JSON.stringify({ creditId: id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(payload.error || "The refund or credit could not be issued."); return; }
      setNotice(payload.paymentStatus === "Refunded" ? "Stripe refund issued." : "Lead credit issued.");
    } else {
      const { error: updateError } = await supabase.rpc("admin_set_lead_credit_status", { p_credit_id: id, p_status: status });
      if (updateError) { setError(updateError.message); return; }
    }
    setCredits((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }


  async function updatePermitCase(id, status) {
    setError("");
    setNotice("");
    const current = permitCases.find((item) => item.id === id);
    const activity = Array.isArray(current?.activity) ? current.activity : [];
    const nextActivity = [...activity, {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type: "admin_status",
      title: `Permit Concierge updated status to ${status}`,
      detail: "Updated from the Project Pilot Admin Control Center.",
    }].slice(-100);
    const { error: updateError } = await supabase
      .from("permit_cases")
      .update({ status, activity: nextActivity, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) { setError(updateError.message); return; }
    setPermitCases((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    setNotice(`Permit case updated to ${status}.`);
  }

  if (loading) return <main className="adminLoading">Opening Admin Control Center…</main>;

  if (!profile?.is_admin) {
    return (
      <main className="adminDenied">
        <div><span>P</span><h1>Admin access is not enabled.</h1><p>Signed in as {user?.email}. Run migrations 009 and 010 in Supabase. Migration 010 automatically assigns the oldest Project Pilot account as the administrator when no admin exists.</p><button onClick={() => router.push("/dashboard")}>Return to Dashboard</button></div>
      </main>
    );
  }

  return (
    <main className="adminPage">
      <aside className="adminRail">
        <a href="/dashboard" className="adminBrand"><span>P</span><strong>Project Pilot</strong></a>
        <div><small>ADMIN CONTROL CENTER</small><strong>{profile.full_name || user?.email}</strong></div>
        <nav><a className="active" href="/admin">Overview</a><a href="#accounts">Accounts</a><a href="#marketplace">Marketplace</a><a href="#contractors">Contractors</a><a href="#financials">Financials</a><a href="#permits">Permit Concierge</a><a href="#feedback">Feedback</a><a href="/dashboard">User Dashboard</a></nav>
        <div className="adminBetaState production"><span /><div><strong>Revenue launch</strong><small>Payments controlled by Vercel setting</small></div></div>
      </aside>

      <section className="adminMain">
        <header className="adminHeader"><div><p>PROJECT PILOT ADMIN</p><h1>Business, marketplace, and product health at a glance.</h1><span>Accounts, projects, contractor verification, qualified introductions, revenue, credits, and feedback in one view.</span></div><button onClick={() => window.location.reload()}>Refresh Data</button></header>

        {error && <div className="adminError" role="alert">{error}</div>}
        {notice && <div className="adminNotice" role="status">{notice}</div>}

        <section className="adminBetaBanner productionBanner"><div><strong>Production marketplace controls are installed.</strong><span>Live contractor charges occur only when MARKETPLACE_PAYMENTS_ENABLED is set to true and Stripe is configured.</span></div><b>{money(marketplace.actual_revenue_cents)} collected</b></section>

        <section className="launchReadinessPanel">
          <div><p>REVENUE LAUNCH STATUS</p><h2>{launchHealth.paymentsEnabled && launchHealth.mode === "Live" ? "Live payments are enabled" : "Complete the remaining launch connections"}</h2><span>Configuration checks show whether the automated introduction-fee system can collect money.</span></div>
          <div className="launchChecks">
            {[
              ["Custom site URL", launchHealth.siteUrlConfigured],
              ["Secure Supabase server key", launchHealth.serviceRoleConfigured],
              [`Stripe ${launchHealth.mode} key`, launchHealth.stripeConfigured],
              ["Stripe webhook", launchHealth.webhookConfigured],
              ["Contractor charges enabled", launchHealth.paymentsEnabled],
              ["Email notifications", launchHealth.emailConfigured],
            ].map(([label, ready]) => <span className={ready ? "ready" : "missing"} key={label}><b>{ready ? "✓" : "!"}</b>{label}</span>)}
          </div>
        </section>

        <section className="adminStatGrid">
          <article><span>Total accounts</span><strong>{number(summary.total_accounts)}</strong><small>+{number(summary.new_accounts_7d)} in 7 days</small></article>
          <article><span>Active users</span><strong>{number(summary.active_accounts_30d)}</strong><small>Recorded activity in 30 days</small></article>
          <article><span>Total projects</span><strong>{number(summary.total_projects)}</strong><small>{number(summary.active_projects)} currently active</small></article>
          <article><span>Verified contractors</span><strong>{number(marketplace.verified_contractors)}</strong><small>{number(marketplace.pending_contractors)} awaiting review</small></article>
          <article><span>Lead requests</span><strong>{number(marketplace.lead_requests)}</strong><small>{number(marketplace.accepted_leads)} accepted</small></article>
          <article><span>Actual revenue</span><strong>{money(marketplace.actual_revenue_cents)}</strong><small>{number(marketplace.paid_leads)} paid introductions</small></article>
        </section>

        <section className="adminTwoColumn" id="accounts">
          <article className="adminPanel"><div className="adminPanelHeading"><div><p>ACCOUNT BREAKDOWN</p><h2>Who is using Project Pilot?</h2></div><span>{number(summary.total_accounts)} accounts</span></div><div className="accountBars">{(summary.account_breakdown || []).length ? summary.account_breakdown.map((item) => <div key={item.role}><div><strong>{item.role || "Unspecified"}</strong><span>{number(item.count)}</span></div><i><b style={{ width: `${Math.max(5, Number(item.count || 0) / maxAccountCount * 100)}%` }} /></i></div>) : <div className="adminEmpty">Account data appears as users create profiles.</div>}</div></article>
          <article className="adminPanel"><div className="adminPanelHeading"><div><p>PROJECT MIX</p><h2>What users are planning.</h2></div><span>{number(summary.total_projects)} projects</span></div><div className="projectMix">{(summary.project_type_breakdown || []).length ? summary.project_type_breakdown.map((item) => <div key={item.project_type}><span>{item.project_type || "Other"}</span><strong>{number(item.count)}</strong></div>) : <div className="adminEmpty">Project categories appear as users create projects.</div>}</div></article>
        </section>

        <section className="adminFinancials" id="marketplace">
          <div className="adminPanelHeading"><div><p>MARKETPLACE FUNNEL</p><h2>See where contractor revenue is being created or lost.</h2></div><span>Best Match ranking is not paid placement</span></div>
          <div className="financialGrid marketplaceGrid"><article><small>CONTRACTOR PROFILES</small><strong>{number(marketplace.contractor_profiles)}</strong><p>{number(marketplace.pending_contractors)} need verification.</p></article><article><small>LEAD OFFERS</small><strong>{number(marketplace.lead_offers)}</strong><p>{number(marketplace.open_leads)} open homeowner requests.</p></article><article><small>ACCEPTED INTRODUCTIONS</small><strong>{number(marketplace.accepted_leads)}</strong><p>{number(marketplace.paid_leads)} completed payment.</p></article><article><small>OPEN FEE VALUE</small><strong>{money(marketplace.pending_fee_value_cents)}</strong><p>Potential value if current offers are accepted.</p></article></div>
        </section>

        <section className="adminPanel" id="contractors">
          <div className="adminPanelHeading"><div><p>CONTRACTOR VERIFICATION</p><h2>Review partners before they appear in Best Match.</h2></div><span>{number(contractors.length)} recent profiles</span></div>
          <div className="feedbackTableWrap"><table><thead><tr><th>Business</th><th>Specialties</th><th>Service area</th><th>License</th><th>Insurance</th><th>Status</th></tr></thead><tbody>{contractors.map((item) => <tr key={item.user_id}><td><b>{item.business_name || "Unnamed business"}</b><small className="tableSubline">{item.contact_name} · {item.phone}</small></td><td>{(item.specialties || []).join(", ") || "—"}</td><td>{(item.service_counties || []).join(", ") || "—"}</td><td>{item.license_state} {item.license_number || "Not submitted"}</td><td><select value={item.insurance_status} onChange={(event) => updateContractorInsurance(item.user_id, event.target.value)}><option>Not submitted</option><option>Submitted</option><option>Verified</option><option>Expired</option></select></td><td><select value={item.verification_status} onChange={(event) => verifyContractor(item.user_id, event.target.value)}><option>Pending</option><option>Verified</option><option>Rejected</option><option>Suspended</option></select></td></tr>)}{!contractors.length && <tr><td colSpan="6"><div className="adminEmpty">No contractor profiles yet.</div></td></tr>}</tbody></table></div>
        </section>

        <section className="adminFinancials" id="financials"><div className="adminPanelHeading"><div><p>FINANCIALS</p><h2>Actual money is separated from opportunity value.</h2></div><span>All values in U.S. dollars</span></div><div className="financialGrid"><article><small>ACTUAL REVENUE</small><strong>{money(marketplace.actual_revenue_cents)}</strong><p>Completed paid introductions.</p></article><article><small>OPEN FEE VALUE</small><strong>{money(marketplace.pending_fee_value_cents)}</strong><p>Unpaid offers currently available.</p></article><article><small>PAID INTRODUCTIONS</small><strong>{number(marketplace.paid_leads)}</strong><p>Stripe-confirmed lead payments.</p></article><article><small>OPEN CREDIT REVIEWS</small><strong>{number(marketplace.credit_requests)}</strong><p>Lead-quality disputes needing attention.</p></article></div></section>

        <section className="adminPanel" id="credits"><div className="adminPanelHeading"><div><p>LEAD REVIEWS</p><h2>Protect contractor trust and lead quality.</h2></div><span>{number(credits.length)} recent requests</span></div><div className="feedbackTableWrap"><table><thead><tr><th>Reason</th><th>Details</th><th>Status</th><th>Date</th></tr></thead><tbody>{credits.map((item) => <tr key={item.id}><td><b>{item.reason}</b></td><td>{item.details || "—"}</td><td><select value={item.status} onChange={(event) => updateCredit(item.id, event.target.value)}><option>Requested</option><option>Reviewing</option><option>Approved</option><option>Denied</option><option>Issued</option></select></td><td>{formatDate(item.created_at)}</td></tr>)}{!credits.length && <tr><td colSpan="4"><div className="adminEmpty">No lead review requests.</div></td></tr>}</tbody></table></div></section>


        <section className="adminPanel" id="permits">
          <div className="adminPanelHeading"><div><p>PERMIT CONCIERGE</p><h2>Operate homeowner permit requests from intake through approval.</h2></div><span>{number(conciergeRequests.length)} service requests</span></div>
          <div className="feedbackTableWrap"><table><thead><tr><th>Homeowner contact</th><th>Services</th><th>Assigned</th><th>Status</th><th>Requested</th><th>Open</th></tr></thead><tbody>
            {conciergeRequests.map((item) => <tr key={item.id}><td><b>{item.contact_email || "No email"}</b><small className="tableSubline">{item.contact_phone || item.preferred_contact}</small></td><td>{(item.requested_services || []).map((value) => String(value).replaceAll("_", " ")).join(", ") || "Review"}</td><td>{item.assigned_to || "Unassigned"}</td><td>{String(item.status || "requested").replaceAll("_", " ")}</td><td>{formatDate(item.requested_at)}</td><td><a href={`/admin/permit-concierge/${item.id}`}>Open workbench →</a></td></tr>)}
            {!conciergeRequests.length && <tr><td colSpan="6"><div className="adminEmpty">No Permit Concierge requests yet. Run migration 013 if homeowners have requested service.</div></td></tr>}
          </tbody></table></div>
        </section>

        <section className="adminPanel"><div className="adminPanelHeading"><div><p>PERMIT AUTOPILOT CASES</p><h2>Track all prepared permit cases.</h2></div><span>{number(permitCases.length)} recent cases</span></div><div className="feedbackTableWrap"><table><thead><tr><th>Jurisdiction</th><th>Readiness</th><th>Reference</th><th>Concierge</th><th>Status</th><th>Updated</th></tr></thead><tbody>{permitCases.map((item) => <tr key={item.id}><td><b>{item.jurisdiction || "Authority review needed"}</b><small className="tableSubline">Project {item.project_id}</small></td><td>{number(item.readiness_score)}%</td><td>{item.application_reference || "—"}</td><td>{item.concierge_requested_at ? formatDate(item.concierge_requested_at) : "Not requested"}</td><td><select value={item.status} onChange={(event) => updatePermitCase(item.id, event.target.value)}><option value="draft">Draft</option><option value="collecting">Collecting</option><option value="ready_for_review">Ready for review</option><option value="authorized">Authorized</option><option value="concierge_requested">Concierge requested</option><option value="submitted">Submitted</option><option value="correction_required">Correction required</option><option value="approved">Approved</option><option value="inspection">Inspections</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option></select></td><td>{formatDate(item.updated_at)}</td></tr>)}{!permitCases.length && <tr><td colSpan="6"><div className="adminEmpty">No Permit Autopilot cases yet.</div></td></tr>}</tbody></table></div></section>

        <section className="adminPanel feedbackPanel" id="feedback"><div className="adminPanelHeading"><div><p>USER FEEDBACK</p><h2>What users need you to know.</h2></div><span>{number(feedback.length)} recent items</span></div><div className="feedbackTableWrap"><table><thead><tr><th>Type</th><th>Message</th><th>Page</th><th>Rating</th><th>Status</th><th>Date</th></tr></thead><tbody>{feedback.map((item) => <tr key={item.id}><td><b>{item.category}</b></td><td>{item.message}</td><td><code>{item.page_path}</code></td><td>{item.rating || "—"}</td><td><select value={item.status || "New"} onChange={(event) => updateFeedback(item.id, event.target.value)}><option>New</option><option>Reviewing</option><option>Planned</option><option>Fixed</option><option>Closed</option></select></td><td>{formatDate(item.created_at)}</td></tr>)}{!feedback.length && <tr><td colSpan="6"><div className="adminEmpty">No feedback has been submitted yet.</div></td></tr>}</tbody></table></div></section>
      </section>
    </main>
  );
}
