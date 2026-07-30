"use client";

import { useEffect } from "react";
import "./release.css";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Project Pilot page error", error);
  }, [error]);

  return (
    <main className="releaseState">
      <section>
        <div className="releaseMark">P</div>
        <p>SOMETHING WENT WRONG</p>
        <h1>This page could not load.</h1>
        <span>Your saved project data has not been intentionally removed. Try the page again or return to your Dashboard.</span>
        <div>
          <button type="button" onClick={reset}>Try Again</button>
          <a href="/dashboard">Dashboard</a>
        </div>
      </section>
    </main>
  );
}
