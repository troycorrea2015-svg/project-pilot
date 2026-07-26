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

function number(value) {
  return Number(value || 0).toLocaleString("en-US");
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  async function loadAdmin() {
    setLoading(true);
    setError("");
    setAccessChecked(false);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user || null;

    if (sessionError) {
      setError(sessionError.message || "Project Pilot could not verify your sign-in session.");
      setLoading(false);
      setAccessChecked(true);
      return;
    }

    if (!currentUser) {
      setUser(null);
      setProfile(null);
      setAuthorized(false);
      setLoading(false);
      setAccessChecked(true);
      return;
    }

    setUser(currentUser);

    const [{ data: profileData, error: profileError }, { data: adminResult, error: adminError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, is_admin")
        .eq("id", currentUser.id)
        .maybeSingle(),
      supabase.rpc("is_project_pilot_admin"),
    ]);

    const hasAdminAccess = adminResult === true || profileData?.is_admin === true;
    setProfile(profileData || null);
    setAuthorized(hasAdminAccess);
    setAccessChecked(true);

    if (profileError) {
      setError("The admin profile check failed. Run the Admin Access Repair SQL in Supabase, then refresh this page.");
      setLoading(false);
      return;
    }

    if (adminError) {
      setError("The admin access function is missing or unavailable. Run the Admin Access Repair SQL in Supabase, then refresh this page.");
      setLoading(false);
      return;
    }

    if (!hasAdminAccess) {
      setLoading(false);
      return;
    }

    const [{ data: summaryData, error: summaryError }, { data: feedbackData, error: feedbackError }] = await Promise.all([
      supabase.rpc("admin_dashboard_summary"),
      supabase
        .from("beta_feedback")
        .select("id, category, message, rating, page_path, status, admin_notes, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (summaryError || feedbackError) {
      setError(summaryError?.message || feedbackError?.message || "Admin information could not be loaded.");
    } else {
      setSummary({ ...EMPTY_SUMMARY, ...(summaryData || {}) });
      setFeedback(feedbackData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function start() {
      if (!active) return;
      await loadAdmin();
    }

    start();
    return () => {
      active = false;
    };
  }, []);

  const maxAccountCount = useMemo(
    () => Math.max(1, ...(summary.account_breakdown || []).map((item) => Number(item.count || 0))),
    [summary.account_breakdown]
  );

  async function updateFeedback(id, status) {
    const { error: updateError } = await supabase
      .from("beta_feedback")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setFeedback((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  if (loading) {
    return <main className="adminLoading">Opening Admin Control Center…</main>;
  }

  if (accessChecked && !user) {
    return (
      <main className="adminDenied">
        <div>
          <span>P</span>
          <h1>Sign in to open the Admin Control Center.</h1>
          <p>This page will remain here instead of redirecting you to another dashboard.</p>
          <button onClick={() => router.push("/")}>Go to Sign In</button>
        </div>
      </main>
    );
  }

  if (accessChecked && !authorized) {
    return (
      <main className="adminDenied">
        <div>
          <span>P</span>
          <h1>Admin access is not enabled.</h1>
          <p>
            You are signed in as <strong>{user?.email || "this account"}</strong>, but Supabase is not returning an active administrator flag for this account.
          </p>
          {error && <p className="adminError" role="alert">{error}</p>}
          <button onClick={loadAdmin}>Check Admin Access Again</button>
          <button onClick={() => router.push("/dashboard")}>Return to Dashboard</button>
        </div>
      </main>
    );
  }

  return (
    <main className="adminPage">
      <aside className="adminRail">
        <a href="/dashboard" className="adminBrand"><span>P</span><strong>Project Pilot</strong></a>
        <div><small>ADMIN CONTROL CENTER</small><strong>{profile?.full_name || user?.email}</strong></div>
        <nav><a className="active" href="/admin">Overview</a><a href="#accounts">Accounts</a><a href="#financials">Financials</a><a href="#feedback">Feedback</a><a href="/dashboard">User Dashboard</a><a href="/help">Help Center</a></nav>
        <div className="adminBetaState"><span /><div><strong>Free beta active</strong><small>No user charges</small></div></div>
      </aside>

      <section className="adminMain">
        <header className="adminHeader">
          <div><p>PROJECT PILOT ADMIN</p><h1>Business and product health at a glance.</h1><span>Accounts, project activity, feedback, and beta financial readiness in one view.</span></div>
          <button onClick={loadAdmin}>Refresh Data</button>
        </header>

        {error && <div className="adminError" role="alert">{error}</div>}

        <section className="adminBetaBanner">
          <div><strong>Beta access is free for every user.</strong><span>Homeowners and contractors are charged $0. No payment method or subscription is required.</span></div>
          <b>$0 collected</b>
        </section>

        <section className="adminStatGrid">
          <article><span>Total accounts</span><strong>{number(summary.total_accounts)}</strong><small>+{number(summary.new_accounts_7d)} in 7 days</small></article>
          <article><span>Active users</span><strong>{number(summary.active_accounts_30d)}</strong><small>Recorded activity in 30 days</small></article>
          <article><span>Total projects</span><strong>{number(summary.total_projects)}</strong><small>{number(summary.active_projects)} currently active</small></article>
          <article><span>Completed projects</span><strong>{number(summary.completed_projects)}</strong><small>Reported as 100% complete</small></article>
          <article><span>Open feedback</span><strong>{number(summary.open_feedback)}</strong><small>{number(summary.total_feedback)} total submissions</small></article>
          <article><span>Tracked actions</span><strong>{number(summary.total_events)}</strong><small>Product activity events</small></article>
        </section>

        <section className="adminTwoColumn" id="accounts">
          <article className="adminPanel">
            <div className="adminPanelHeading"><div><p>ACCOUNT BREAKDOWN</p><h2>Who is using Project Pilot?</h2></div><span>{number(summary.total_accounts)} accounts</span></div>
            <div className="accountBars">
              {(summary.account_breakdown || []).length ? summary.account_breakdown.map((item) => (
                <div key={item.role}><div><strong>{item.role || "Unspecified"}</strong><span>{number(item.count)}</span></div><i><b style={{ width: `${Math.max(5, Number(item.count || 0) / maxAccountCount * 100)}%` }} /></i></div>
              )) : <div className="adminEmpty">Account data appears after the migration is active and users have profiles.</div>}
            </div>
          </article>

          <article className="adminPanel">
            <div className="adminPanelHeading"><div><p>PROJECT MIX</p><h2>What users are planning.</h2></div><span>{number(summary.total_projects)} projects</span></div>
            <div className="projectMix">
              {(summary.project_type_breakdown || []).length ? summary.project_type_breakdown.map((item) => (
                <div key={item.project_type}><span>{item.project_type || "Other"}</span><strong>{number(item.count)}</strong></div>
              )) : <div className="adminEmpty">Project categories will appear as users create projects.</div>}
            </div>
          </article>
        </section>

        <section className="adminFinancials" id="financials">
          <div className="adminPanelHeading"><div><p>BETA FINANCIALS</p><h2>Actual money is separated from future opportunity.</h2></div><span>All values in U.S. dollars</span></div>
          <div className="financialGrid">
            <article><small>ACTUAL REVENUE</small><strong>$0.00</strong><p>No beta users are charged.</p></article>
            <article><small>CONTRACTOR FEES</small><strong>$0.00</strong><p>Introduction fees remain disabled.</p></article>
            <article><small>HOMEOWNER FEES</small><strong>$0.00</strong><p>Homeowner access remains free.</p></article>
            <article><small>FUTURE MARKETPLACE VALUE</small><strong>Not active</strong><p>Lead-value projections begin in Sprint 3.0B and remain test-only during beta.</p></article>
          </div>
        </section>

        <section className="adminPanel feedbackPanel" id="feedback">
          <div className="adminPanelHeading"><div><p>BETA FEEDBACK</p><h2>What users need you to know.</h2></div><span>{number(feedback.length)} recent items</span></div>
          <div className="feedbackTableWrap">
            <table>
              <thead><tr><th>Type</th><th>Message</th><th>Page</th><th>Rating</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {feedback.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.category}</b></td>
                    <td>{item.message}</td>
                    <td><code>{item.page_path}</code></td>
                    <td>{item.rating || "—"}</td>
                    <td><select value={item.status || "New"} onChange={(event) => updateFeedback(item.id, event.target.value)}><option>New</option><option>Reviewing</option><option>Planned</option><option>Fixed</option><option>Closed</option></select></td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!feedback.length && <tr><td colSpan="6"><div className="adminEmpty">No feedback has been submitted yet.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
