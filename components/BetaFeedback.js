"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function BetaFeedback() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (!user || pathname === "/") return null;

  async function submitFeedback(event) {
    event.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setStatus("");

    const { error } = await supabase.from("beta_feedback").insert({
      user_id: user.id,
      page_path: pathname || "/",
      category,
      message: message.trim(),
      rating: rating ? Number(rating) : null,
      status: "New",
    });

    if (error) {
      setStatus(error.message?.includes("beta_feedback")
        ? "Feedback storage is not active yet. Run the Sprint 3.0A Supabase migration, then try again."
        : "Your feedback could not be sent. Please try again.");
    } else {
      setStatus("Thank you. Your feedback was sent to the Project Pilot admin dashboard.");
      setMessage("");
      setRating("");
    }

    setSending(false);
  }

  return (
    <>
      <button type="button" className="feedbackLauncher" onClick={() => setOpen(true)}>Send Beta Feedback</button>
      {open && (
        <div className="feedbackBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="feedbackDialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
            <header>
              <div>
                <small>PROJECT PILOT BETA</small>
                <h2 id="feedback-title">Tell us what happened.</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close feedback form">×</button>
            </header>

            <form onSubmit={submitFeedback}>
              <label>
                <span>Feedback type</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option>Suggestion</option>
                  <option>Confusing</option>
                  <option>Incorrect information</option>
                  <option>Broken feature</option>
                  <option>Permit issue</option>
                  <option>Positive feedback</option>
                </select>
              </label>

              <label>
                <span>How easy was this page to use?</span>
                <select value={rating} onChange={(event) => setRating(event.target.value)}>
                  <option value="">Not rated</option>
                  <option value="5">5 — Very easy</option>
                  <option value="4">4 — Easy</option>
                  <option value="3">3 — Neutral</option>
                  <option value="2">2 — Difficult</option>
                  <option value="1">1 — Very difficult</option>
                </select>
              </label>

              <label>
                <span>What should we know?</span>
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe what was confusing, incorrect, or helpful." required />
              </label>

              <small>Page included automatically: {pathname}</small>
              {status && <div className="feedbackStatus" role="status">{status}</div>}

              <div className="feedbackActions">
                <button type="button" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" disabled={sending || !message.trim()}>{sending ? "Sending…" : "Send Feedback"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
