"use client";
import { useState } from "react";
import "./page.css";

const projects=["Fence","Deck","Shed","Roof replacement","HVAC replacement","Kitchen remodel","Bathroom remodel"];

export default function Home(){
 const [form,setForm]=useState({address:"",zip:"",project:"Fence",description:""});
 const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 async function submit(e){e.preventDefault();setLoading(true);setError("");setData(null);try{const r=await fetch('/api/lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Lookup failed');setData(j)}catch(err){setError(err.message)}finally{setLoading(false)}}
 return <main>
  <header><div className="brand"><span>P</span>Project Pilot</div><a href="#planner">Start a project</a></header>
  <section className="hero"><div><p className="eyebrow">YOUR HOME PROJECT, GUIDED</p><h1>Plan smarter.<br/>Build with confidence.</h1><p>Enter your property and project to receive jurisdiction-aware permit guidance, official links, and a practical next-step roadmap.</p><a className="cta" href="#planner">Build my roadmap</a></div><div className="card"><h3>Project roadmap</h3><div>1. Verify property</div><div>2. Identify authority</div><div>3. Review permits</div><div>4. Prepare documents</div><div>5. Find local professionals</div></div></section>
  <section id="planner" className="planner"><h2>Start your project</h2><form onSubmit={submit}>
   <label>Property address<input required value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="10 NW Front Street"/></label>
   <label>ZIP code<input required maxLength="5" value={form.zip} onChange={e=>setForm({...form,zip:e.target.value})} placeholder="19963"/></label>
   <label>Project type<select value={form.project} onChange={e=>setForm({...form,project:e.target.value})}>{projects.map(p=><option key={p}>{p}</option>)}</select></label>
   <label className="wide">Project details<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe size, materials, location, and planned work."/></label>
   <button disabled={loading}>{loading?'Checking address…':'Build my project roadmap'}</button>
  </form>{error&&<p className="error">{error}</p>}</section>
  {data&&<section className="results"><p className="eyebrow">PROJECT PILOT ROADMAP</p><h2>{data.title}</h2><p>{data.summary}</p><div className="notice"><b>Matched address:</b> {data.matchedAddress||'Not confirmed'}<br/><b>Governing-area status:</b> {data.jurisdictionStatus}</div><div className="grid"><article><h3>Recommended next steps</h3><ol>{data.steps.map(x=><li key={x}>{x}</li>)}</ol></article><article><h3>Documents to prepare</h3><ul>{data.documents.map(x=><li key={x}>✓ {x}</li>)}</ul><h3>Official links</h3>{data.sources.map(s=><a className="source" key={s.url} href={s.url} target="_blank">{s.label} ↗</a>)}</article></div></section>}
  <footer>Project Pilot · Informational guidance only. Confirm requirements with the governing authority.</footer>
 </main>
}
