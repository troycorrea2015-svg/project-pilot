"use client";

import { useState } from "react";
import "./page.css";

const prompts = [
  "I want to build a covered deck",
  "I'm remodeling a kitchen",
  "I need a new fence",
  "I'm replacing my roof",
];

export default function HomePage() {
  const [input, setInput] = useState("");
  const [stage, setStage] = useState("project");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      title: "Welcome to Project Pilot.",
      text: "Tell me about the project you're planning.",
    },
  ]);

  function submitProject(event) {
    event.preventDefault();
    const value = input.trim();
    if (!value || stage === "complete") return;

    if (stage === "project") {
      setMessages((current) => [
        ...current,
        { role: "user", text: value },
        {
          role: "assistant",
          title: "Let's get started.",
          text: "What is the full property address for this project? I'll use it to identify the likely jurisdiction and next steps.",
        },
      ]);
      setStage("address");
    } else if (stage === "address") {
      setMessages((current) => [
        ...current,
        { role: "user", text: value },
        {
          role: "assistant",
          title: "Address received.",
          text: "Next, add any important details such as dimensions, materials, budget, timing, or whether you plan to hire a contractor.",
        },
      ]);
      setStage("details");
    } else {
      setMessages((current) => [
        ...current,
        { role: "user", text: value },
        {
          role: "assistant",
          title: "Project details saved.",
          text: "Your preliminary intake is complete. The next update will connect this conversation to the permit lookup and saved project roadmap.",
        },
      ]);
      setStage("complete");
    }

    setInput("");
  }

  const placeholder =
    stage === "project"
      ? "Example: I want to build a 16 x 20 covered deck..."
      : stage === "address"
      ? "Enter the full property address..."
      : stage === "details"
      ? "Add dimensions, materials, budget, timing, or contractor plans..."
      : "Project intake complete";

  return (
    <main>
      <header className="siteHeader">
        <a href="#top" className="brand">
          <span className="brandIcon">P</span>
          <span>Project Pilot</span>
        </a>

        <nav className="desktopNav">
          <a href="#top">Home</a>
          <a href="#start">Start a Project</a>
          <a href="#visualize">Visualization</a>
          <a href="#features">Features</a>
        </nav>

        <a href="#start" className="headerButton">Start My Project</a>
      </header>

      <section className="hero" id="top">
        <div className="heroContent">
          <div className="eyebrow">FROM IDEA TO COMPLETION</div>
          <h1>Every project deserves a clear path forward.</h1>
          <p className="heroText">
            Project Pilot helps homeowners, contractors, and property owners plan
            projects, understand permits, visualize improvements, and move forward
            with confidence.
          </p>

          <div className="heroActions">
            <a href="#start" className="primaryButton">Start My Project</a>
            <a href="#how" className="secondaryButton">See How It Works</a>
          </div>

          <div className="trustRow">
            <span>✓ Clear next steps</span>
            <span>✓ Local permit guidance</span>
            <span>✓ Built for homeowners and pros</span>
          </div>
        </div>

        <div className="heroVisual">
          <div className="visualTop">
            <span>PROJECT ROADMAP</span>
            <span className="ready">READY</span>
          </div>
          <h2>Backyard Deck Project</h2>
          <p>Milford, Delaware</p>
          <div className="progressTrack"><span /></div>

          {[
            ["Project vision", "Scope and design selected", "complete"],
            ["Permit research", "Local requirements identified", "active"],
            ["Compare professionals", "Request local estimates", ""],
            ["Build and track", "Stay organized through completion", ""],
          ].map((item, index) => (
            <div className={`roadmapItem ${item[2]}`} key={item[0]}>
              <b>{index + 1}</b>
              <div>
                <strong>{item[0]}</strong>
                <small>{item[1]}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="startSection" id="start">
        <div className="sectionIntro">
          <span>START WITH A CONVERSATION</span>
          <h2>Tell us about the project you're planning.</h2>
          <p>
            Describe your idea naturally. Project Pilot will help organize the
            location, scope, permit path, documents, and next steps.
          </p>
        </div>

        <div className="chatShell">
          <div className="chatHeader">
            <div className="pilotAvatar">P</div>
            <div>
              <strong>Project Pilot</strong>
              <span>Project planning assistant</span>
            </div>
            <div className="onlineStatus">Online</div>
          </div>

          <div className="chatBody">
            {messages.map((message, index) =>
              message.role === "assistant" ? (
                <div className="assistantMessage" key={index}>
                  {message.title && <strong>{message.title}</strong>}
                  <p>{message.text}</p>
                </div>
              ) : (
                <div className="userMessage" key={index}>
                  {message.text}
                </div>
              )
            )}
          </div>

          <form className="chatComposer" onSubmit={submitProject}>
            <textarea
              placeholder={placeholder}
              value={input}
              disabled={stage === "complete"}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" disabled={stage === "complete"}>
              {stage === "complete" ? "Complete" : "Continue"}
            </button>
          </form>

          {stage === "project" && (
            <div className="promptRow">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="featuresSection" id="features">
        <div className="sectionIntro">
          <span>ONE PLACE FOR THE ENTIRE PROJECT</span>
          <h2>Less uncertainty. More forward progress.</h2>
        </div>

        <div className="featureGrid">
          {[
            ["01", "Plan Every Step", "Turn a rough idea into an organized roadmap with clear tasks and priorities."],
            ["02", "See It Before You Build It", "Upload a photo and compare the current space with a future concept in one split image."],
            ["03", "Understand the Permit Path", "Find the likely authority, application steps, documents, and official resources."],
            ["04", "Connect With Professionals", "Find contractors by project category, service area, and verified credentials."],
          ].map((item) => (
            <article key={item[1]}>
              <div className="featureIcon">{item[0]}</div>
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="realitySection" id="visualize">
        <div className="realityCopy">
          <span>PROJECT VISUALIZATION</span>
          <h2>See your project before you build it.</h2>
          <p>
            Upload a photo of the space you want to improve. Project Pilot will
            create one unified split image: the original space on the left and the
            proposed transformation on the right.
          </p>
          <ul>
            <li>Compare both versions at the same time</li>
            <li>Refine materials, colors, layout, and features</li>
            <li>Save versions before creating the project plan</li>
          </ul>
          <button className="primaryButton" type="button">Upload a Project Photo</button>
        </div>

        <div className="splitPreview">
          <div className="beforeHalf">
            <span>Current Space</span>
            <div className="beforeHouse">
              <div className="roof" />
              <div className="houseBody">
                <div className="window" />
                <div className="door" />
              </div>
              <div className="plainYard" />
            </div>
          </div>

          <div className="afterHalf">
            <span>Project Concept</span>
            <div className="afterHouse">
              <div className="roof" />
              <div className="houseBody">
                <div className="window" />
                <div className="door" />
              </div>
              <div className="deck"><i /><i /><i /></div>
              <div className="landscape"><b /><b /><b /></div>
            </div>
          </div>

          <div className="centerLine"><span>↔</span></div>
        </div>
      </section>

      <section className="howSection" id="how">
        <div className="sectionIntro">
          <span>HOW IT WORKS</span>
          <h2>A clearer way to move from idea to completion.</h2>
        </div>

        <div className="stepsGrid">
          {[
            ["1", "Describe the project", "Tell Project Pilot what you are planning in your own words."],
            ["2", "Build the roadmap", "Organize the location, scope, likely permits, documents, and tasks."],
            ["3", "Choose the right help", "Compare qualified local professionals when outside help is needed."],
            ["4", "Keep everything moving", "Track decisions, documents, inspections, and progress in one place."],
          ].map((item) => (
            <article key={item[1]}>
              <b>{item[0]}</b>
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="finalCta">
        <div>
          <span>PROJECT PILOT</span>
          <h2>Bring your next project to reality with a clear plan.</h2>
          <p>Start with an idea. Leave with a path forward.</p>
        </div>
        <a href="#start" className="lightButton">Start My Project</a>
      </section>

      <footer>
        <div className="footerTop">
          <a href="#top" className="brand footerBrand">
            <span className="brandIcon">P</span>
            <span>Project Pilot</span>
          </a>
          <p>Every project deserves a clear path forward.</p>
        </div>

        <div className="footerLinks">
          <a href="#start">Start a Project</a>
          <a href="#visualize">Visualization</a>
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
        </div>

        <small>
          © {new Date().getFullYear()} Project Pilot. Planning guidance must be
          verified with the appropriate authority before work begins.
        </small>
      </footer>
    </main>
  );
}
