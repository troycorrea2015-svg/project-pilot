"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./support.css";

const categories = ["General","Account","Project Assistant","Project Vision","Permit Autopilot","Permit Concierge","Contractors","Billing","Bug"];

export default function SupportPage() {
  const [query, setQuery] = useState({});
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [category, setCategory] = useState("General");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@projectpiloting.com";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextQuery = { category: params.get("category") || "", subject: params.get("subject") || "", projectId: params.get("projectId") || "", page: params.get("page") || "" };
    setQuery(nextQuery);
    if (nextQuery.category && categories.includes(nextQuery.category)) setCategory(nextQuery.category);
    if (nextQuery.subject) setSubject(nextQuery.subject);
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      setLoadingUser(false);
    });
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setStatus("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sign in before creating a support request.");
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category,
          subject,
          message,
          projectId: query.projectId || "",
          pagePath: query.page || window.location.pathname,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The request could not be sent.");
      setStatus(`Support request received. Reference: ${payload.request.id.slice(0, 8).toUpperCase()}`);
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatus(error.message || "The request could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="supportPage">
      <header className="supportHeader">
        <a href="/" className="supportBrand"><img src="/project-pilot-approved-mark.png" alt="" /><span><strong>Project Pilot</strong><small>Launch Support</small></span></a>
        <a href={user ? "/dashboard" : "/"}>{user ? "Dashboard" : "Home"}</a>
      </header>
      <section className="supportHero">
        <p>PROJECT PILOT SUPPORT</p>
        <h1>Tell us what stopped you.</h1>
        <span>Include what you clicked, what you expected, and the message you saw. Your saved project data is not intentionally removed when a page error occurs.</span>
      </section>
      <section className="supportGrid">
        <form onSubmit={submit}>
          <label>Area<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Example: Project Vision stopped after upload" required minLength="3" /></label>
          <label>What happened?<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows="8" placeholder="Tell us the steps you took and copy any error message shown." required minLength="10" /></label>
          <button disabled={sending || loadingUser || !user}>{sending ? "Sending…" : user ? "Send Support Request" : "Sign In to Send"}</button>
          {status && <p className="supportStatus">{status}</p>}
        </form>
        <aside>
          <h2>Fastest way to get help</h2>
          <ol><li>Take a screenshot of the problem.</li><li>Copy the exact error message.</li><li>Tell us which project and page you were using.</li></ol>
          <p>Unable to sign in? Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
          <small>Project Pilot provides planning and administrative coordination. It does not replace a permitting authority, licensed design professional, attorney, or contractor.</small>
        </aside>
      </section>
    </main>
  );
}
