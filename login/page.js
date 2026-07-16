"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: "Homeowner",
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push("/dashboard");
        } else {
          setStatus(
            "Account created. Check your email to confirm the account, then sign in."
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (error) {
      setStatus(error.message || "Unable to complete that request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginPage">
      <section className="loginBrandPanel">
        <a href="/" className="loginBrand">
          <span>P</span>
          <strong>Project Pilot</strong>
        </a>

        <div>
          <p className="loginEyebrow">YOUR PROJECTS, ORGANIZED</p>
          <h1>Keep every project moving in one clear direction.</h1>
          <p>
            Save ideas, permit research, project photos, documents, tasks, and
            contractor conversations in one secure workspace.
          </p>

          <div className="loginHighlights">
            <span>✓ Save project progress</span>
            <span>✓ Return to your roadmap anytime</span>
            <span>✓ Keep documents and decisions together</span>
          </div>
        </div>

        <small>
          Project Pilot helps you plan with clarity and move forward with confidence.
        </small>
      </section>

      <section className="loginFormPanel">
        <div className="loginCard">
          <div className="loginTabs">
            <button
              className={mode === "signin" ? "active" : ""}
              onClick={() => {
                setMode("signin");
                setStatus("");
              }}
              type="button"
            >
              Sign In
            </button>
            <button
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setStatus("");
              }}
              type="button"
            >
              Create Account
            </button>
          </div>

          <div className="loginHeading">
            <h2>{mode === "signin" ? "Welcome back." : "Create your workspace."}</h2>
            <p>
              {mode === "signin"
                ? "Open your projects and continue where you left off."
                : "Start saving projects, ideas, and next steps."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label>
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                minLength="6"
                required
              />
            </label>

            <button className="loginSubmit" type="submit" disabled={loading}>
              {loading
                ? "Working..."
                : mode === "signin"
                ? "Open My Projects"
                : "Create My Account"}
            </button>
          </form>

          {status && <p className="authStatus">{status}</p>}

          <a href="/" className="backHome">← Back to homepage</a>
        </div>
      </section>
    </main>
  );
}
