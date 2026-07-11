<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#12365f" />
  <title>Project Pilot | Plan smarter. Build with confidence.</title>
  <meta name="description" content="Create a personalized roadmap for permits, documents, inspections, and local professional help." />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <a class="brand" href="#top" aria-label="Project Pilot home">
      <span class="brand-mark">P</span>
      <span>Project Pilot</span>
    </a>
    <nav>
      <a href="#planner">Start a project</a>
      <a href="#how">How it works</a>
      <a href="#pros">Find pros</a>
    </nav>
    <a class="button button-small" href="#planner">Build my roadmap</a>
  </header>

  <main id="top">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">YOUR HOME PROJECT, GUIDED</p>
        <h1>Plan it right.<br />Build it with confidence.</h1>
        <p class="lead">Project Pilot turns your home-improvement idea into a clear roadmap with permit considerations, application steps, document checklists, and professional help.</p>
        <div class="hero-actions">
          <a class="button" href="#planner">Start my project</a>
          <a class="button button-secondary" href="#how">See how it works</a>
        </div>
        <div class="trust-row"><span>✓ Personalized steps</span><span>✓ Local guidance</span><span>✓ Contractor matching</span></div>
      </div>

      <div class="preview-card" aria-label="Example project roadmap">
        <div class="preview-top"><span>PROJECT ROADMAP</span><strong>READY</strong></div>
        <h2>Build a backyard deck</h2>
        <div class="progress"><span></span></div>
        <div class="preview-step done"><b>1</b><div><strong>Project details</strong><small>Scope and location confirmed</small></div></div>
        <div class="preview-step active"><b>2</b><div><strong>Permit review</strong><small>Requirements and forms identified</small></div></div>
        <div class="preview-step"><b>3</b><div><strong>Compare professionals</strong><small>Request local quotes</small></div></div>
        <div class="preview-step"><b>4</b><div><strong>Track completion</strong><small>Inspections and approvals</small></div></div>
      </div>
    </section>

    <section class="planner-section" id="planner">
      <div class="section-heading">
        <p class="eyebrow">START HERE</p>
        <h2>Tell us what you’re planning.</h2>
        <p>We’ll organize the next steps into one clear project roadmap.</p>
      </div>

      <form id="planner-form" class="planner-card">
        <label>
          Property address
          <input id="address" name="address" placeholder="123 Main Street" required />
          <small>Used to identify the correct permitting authority.</small>
        </label>
        <label>
          ZIP code
          <input id="zip" name="zip" placeholder="19963" inputmode="numeric" maxlength="5" required />
        </label>
        <label>
          Project type
          <select id="project" name="project">
            <option value="Fence">Fence</option>
            <option value="Deck">Deck</option>
            <option value="Shed">Shed</option>
            <option value="Roof replacement">Roof replacement</option>
            <option value="HVAC replacement">HVAC replacement</option>
            <option value="Kitchen remodel">Kitchen remodel</option>
            <option value="Bathroom remodel">Bathroom remodel</option>
          </select>
        </label>
        <label>
          How will the work be completed?
          <select id="approach" name="approach">
            <option value="Hiring a contractor">I plan to hire a contractor</option>
            <option value="DIY">I plan to do it myself</option>
            <option value="Undecided">I am not sure yet</option>
          </select>
        </label>
        <label class="full-width">
          Describe the project
          <textarea id="description" name="description" placeholder="Example: 16 × 20 attached deck, about 30 inches above grade."></textarea>
        </label>
        <button class="button full-width" type="submit"><span id="submit-label">Build my project roadmap</span></button>
      </form>
    </section>

    <section id="results" class="results-section hidden" aria-live="polite">
      <div class="result-head">
        <div>
          <p class="eyebrow">YOUR PROJECT PILOT ROADMAP</p>
          <h2 id="result-title">Project roadmap</h2>
          <p id="result-summary"></p>
        </div>
        <div class="jurisdiction-card">
          <small>Likely governing area</small>
          <strong id="result-city">Verification required</strong>
          <span id="result-county">Confirm with the local authority</span>
        </div>
      </div>

      <div class="notice"><strong>Important:</strong> Project Pilot provides informational guidance. Permit and code requirements must be verified with the governing authority before work begins.</div>

      <div class="result-grid">
        <article class="panel">
          <h3>Recommended next steps</h3>
          <ol id="steps-list" class="steps-list"></ol>
        </article>
        <aside class="panel">
          <h3>Documents to prepare</h3>
          <ul id="documents-list" class="check-list"></ul>
          <div class="source-box">
            <strong>Source status</strong>
            <p id="source-status">This launch version uses general guidance. Official municipal sources will be added jurisdiction by jurisdiction.</p>
          </div>
        </aside>
      </div>
      <div class="ai-box">
        <div><strong>Project Pilot AI</strong><p id="ai-note">The roadmap will use live AI after an OpenAI API key is added in Vercel.</p></div>
        <span id="mode-badge">SMART FALLBACK MODE</span>
      </div>
    </section>

    <section class="how-section" id="how">
      <div class="section-heading"><p class="eyebrow">HOW IT WORKS</p><h2>From idea to finished project.</h2></div>
      <div class="feature-grid">
        <article><b>01</b><h3>Describe your project</h3><p>Enter the property and explain what you want to build or improve.</p></article>
        <article><b>02</b><h3>Get a clear roadmap</h3><p>See permit considerations, documents, application steps, and inspections.</p></article>
        <article><b>03</b><h3>Connect with local pros</h3><p>Compare professionals suited to your project and service area.</p></article>
        <article><b>04</b><h3>Keep work moving</h3><p>Track tasks, approvals, quotes, inspections, and progress.</p></article>
      </div>
    </section>

    <section class="pros-section" id="pros">
      <div class="section-heading left"><p class="eyebrow">LOCAL PROFESSIONALS</p><h2>Find help for the work ahead.</h2><p>The live marketplace will show verified professionals by service area and specialty.</p></div>
      <div class="pro-grid">
        <article><span class="avatar">F</span><div><small>DEMO LISTING</small><h3>Fence & Deck Professional</h3><p>Outdoor projects · Sussex County</p></div></article>
        <article><span class="avatar">R</span><div><small>DEMO LISTING</small><h3>Remodeling Professional</h3><p>Kitchens and bathrooms · Kent County</p></div></article>
        <article><span class="avatar">H</span><div><small>DEMO LISTING</small><h3>HVAC Professional</h3><p>Mechanical projects · Delaware</p></div></article>
      </div>
      <button id="quote-button" class="button">Request contractor matches</button>
      <p id="quote-message" class="success-message hidden">Quote-request capture is ready for the database phase.</p>
    </section>

    <section class="cta">
      <div><p class="eyebrow">PROJECT PILOT</p><h2>Your project deserves a better starting point.</h2><p>Plan smarter, understand the process, and move forward with confidence.</p></div>
      <a class="button button-light" href="#planner">Start my project</a>
    </section>
  </main>

  <footer>
    <div class="brand"><span class="brand-mark">P</span><span>Project Pilot</span></div>
    <p>Plan smarter. Build with confidence.</p>
    <small>© 2026 Project Pilot. Guidance is informational and must be verified with the governing authority.</small>
  </footer>

  <script src="app.js"></script>
</body>
</html>
