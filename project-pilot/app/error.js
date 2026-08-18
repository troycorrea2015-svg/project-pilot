"use client";

import { useEffect, useMemo } from "react";
import "./release.css";

export default function GlobalError({ error, reset }) {
  const issueId = useMemo(() => error?.digest || Math.random().toString(36).slice(2, 10).toUpperCase(), [error]);
  useEffect(() => { console.error("Project Pilot page error", { issueId, error }); }, [error, issueId]);
  return <main className="releaseState"><section><div className="releaseMark">P</div><p>SOMETHING WENT WRONG</p><h1>This page could not load.</h1><span>Your saved project data has not been intentionally removed. Try once more. If it repeats, send support the issue reference below.</span><code>Issue reference: {issueId}</code><div><button type="button" onClick={reset}>Try Again</button><a href="/dashboard">Dashboard</a><a href={`/support?category=Bug&subject=Page%20could%20not%20load%20-%20${issueId}`}>Report Problem</a></div></section></main>;
}
