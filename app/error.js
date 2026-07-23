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
        <p>COURSE CORRECTION</p>
        <h1>This page hit unexpected turbulence.</h1>
        <span>Your saved project data has not been intentionally removed. Try the page again or return to Mission Control.</span>
        <div>
          <button type="button" onClick={reset}>Try Again</button>
          <a href="/dashboard">Mission Control</a>
        </div>
      </section>
    </main>
  );
}
