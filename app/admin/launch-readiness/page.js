"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import "./launch-readiness.css";

export default function LaunchReadinessPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/launch-readiness", { headers: { Authorization: `Bearer ${sessionData?.session?.access_token || ""}` }, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || "Launch readiness could not be checked.");
    else setData(payload);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  if (loading) return <main className="readinessState">Checking launch systems…</main>;
  return <main className="readinessPage"><header><div><p>PROJECT PILOT LAUNCH CONTROL</p><h1>{data?.status === "ready" ? "Ready for a controlled public launch" : "Launch needs attention"}</h1><span>Automated checks plus the final human tests required before you advertise broadly.</span></div><nav><a href="/admin">Admin</a><a href="/admin/support">Support queue</a><button onClick={load}>Run checks again</button></nav></header>{error&&<div className="readinessError">{error}</div>}{data&&<><section className="readinessSummary"><strong>{data.version}</strong><span>{data.status === "ready" ? "Critical code, database, domain, and AI connections passed." : "One or more critical checks failed. Fix red items before sharing publicly."}</span></section><div className="readinessColumns"><section><h2>Configuration</h2>{Object.entries(data.checks||{}).map(([key,item])=><article className={item.ready?"ready":item.optional?"optional":"missing"} key={key}><b>{item.ready?"✓":item.optional?"○":"!"}</b><div><strong>{key.replace(/([A-Z])/g," $1")}</strong><span>{item.detail}</span></div></article>)}</section><section><h2>Database</h2>{Object.entries(data.tables||{}).map(([key,item])=><article className={item.ready?"ready":"missing"} key={key}><b>{item.ready?"✓":"!"}</b><div><strong>{key}</strong><span>{item.detail}</span></div></article>)}</section></div><section className="manualChecks"><h2>Complete these tests before advertising</h2>{(data.manualChecks||[]).map((item,index)=><label key={item}><input type="checkbox" /> <span><b>{index+1}.</b> {item}</span></label>)}</section></>}</main>;
}
