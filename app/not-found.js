import "./release.css";

export default function NotFound() {
  return (
    <main className="releaseState">
      <section>
        <div className="releaseMark">P</div>
        <p>PAGE NOT FOUND</p>
        <h1>We could not find that page.</h1>
        <span>The address may be incorrect, or the page may have moved.</span>
        <div>
          <a className="primaryReleaseLink" href="/dashboard">Return to Dashboard</a>
          <a href="/">Project Pilot Home</a>
        </div>
      </section>
    </main>
  );
}
