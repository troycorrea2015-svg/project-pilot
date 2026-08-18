"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import "./support-admin.css";

export default function AdminSupportPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { router.replace("/"); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle();
      if (!profile?.is_admin) { router.replace("/dashboard"); return; }
      const { data, error: queryError } = await supabase.from("launch_support_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (queryError) setError(queryError.message);
      setRequests(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function updateStatus(id, status) {
    const { error: updateError } = await supabase.from("launch_support_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) { setError(updateError.message); return; }
    setRequests((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  }

  if (loading) return <main className="supportAdminState">Opening support queue…</main>;
  return <main className="supportAdmin"><header><div><p>LAUNCH OPERATIONS</p><h1>Support requests</h1><span>Review what is stopping homeowners and close launch issues quickly.</span></div><nav><a href="/admin">Admin</a><a href="/admin/launch-readiness">Launch readiness</a></nav></header>{error&&<div className="supportAdminError">{error}</div>}<section>{requests.map((item)=><article key={item.id}><div><small>{item.category} · {new Date(item.created_at).toLocaleString()}</small><h2>{item.subject}</h2><p>{item.message}</p><code>{item.user_email || item.user_id}{item.page_path ? ` · ${item.page_path}` : ""}</code></div><select value={item.status} onChange={(event)=>updateStatus(item.id,event.target.value)}><option>New</option><option>Reviewing</option><option>Waiting on user</option><option>Resolved</option><option>Closed</option></select></article>)}{!requests.length&&<div className="supportAdminEmpty">No support requests yet.</div>}</section></main>;
}
