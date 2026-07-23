import "./release.css";

export default function NotFound() {
  return (
    <main className="releaseState">
      <section>
        <div className="releaseMark">P</div>
        <p>WAYPOINT NOT FOUND</p>
        <h1>That page is not on the current Flight Plan.</h1>
        <span>The address may be incorrect, or the page may have moved during the beta.</span>
        <div>
          <a className="primaryReleaseLink" href="/dashboard">Return to Mission Control</a>
          <a href="/">Project Pilot Home</a>
        </div>
      </section>
    </main>
  );
}
