"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./dashboard.css";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDashboard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function loadDashboard() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      router.push("/login");
      return;
    }

    setUser(currentUser);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setProjects(data || []);
    setLoading(false);
  }

  const averageProgress = useMemo(() => {
    if (!projects.length) return 0;
    return Math.round(
      projects.reduce((sum, project) => sum + (project.progress || 0), 0) /
        projects.length
    );
  }, [projects]);

  async function addProject() {
    if (!user || creating) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: "New Home Project",
        location_label: "Location not added",
        status: "Getting Started",
        progress: 5,
        next_step: "Describe the project you are planning",
      })
      .select()
      .single();

    if (!error && data) setProjects((current) => [data, ...current]);
    setCreating(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !user) {
    return <main className="dashboardLoading">Opening your projects…</main>;
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  return (
    <main className="dashboardPage">
      <aside className="dashboardSidebar">
        <a href="/" className="dashboardBrand">
          <span>P</span>
          <strong>Project Pilot</strong>
        </a>

        <nav>
          <a className="active" href="/dashboard">Overview</a>
          <a href="#projects">My Projects</a>
          <a href="#documents">Documents</a>
          <a href="#professionals">Professionals</a>
          <a href="/">Project Pilot Home</a>
        </nav>

        <div className="sidebarUser">
          <div>{displayName.charAt(0).toUpperCase()}</div>
          <span>
            <strong>{displayName}</strong>
            <small>{user.email}</small>
          </span>
        </div>
      </aside>

      <section className="dashboardMain">
        <header className="dashboardHeader">
          <div>
            <p>PROJECT WORKSPACE</p>
            <h1>Welcome back, {displayName}.</h1>
            <span>Here is what needs your attention next.</span>
          </div>

          <div className="dashboardActions">
            <button className="signOutButton" onClick={signOut}>Sign Out</button>
            <button className="newProjectButton" onClick={addProject}>
              {creating ? "Creating..." : "+ New Project"}
            </button>
          </div>
        </header>

        <div className="summaryGrid">
          <article>
            <span>Active Projects</span>
            <strong>{projects.length}</strong>
            <small>Projects currently being planned</small>
          </article>
          <article>
            <span>Overall Progress</span>
            <strong>{averageProgress}%</strong>
            <small>Average readiness across projects</small>
          </article>
          <article>
            <span>Next Priority</span>
            <strong>{projects[0]?.status || "Create a Project"}</strong>
            <small>{projects[0]?.next_step || "Start your first project roadmap"}</small>
          </article>
        </div>

        <section className="dashboardSection" id="projects">
          <div className="sectionTitleRow">
            <div>
              <p>MY PROJECTS</p>
              <h2>Continue where you left off.</h2>
            </div>
            <button onClick={addProject}>Add Project</button>
          </div>

          {!projects.length ? (
            <div className="emptyProjects">
              <h3>Your workspace is ready.</h3>
              <p>Create your first project to begin saving plans, locations, permit research, and next steps.</p>
              <button onClick={addProject}>Create My First Project</button>
            </div>
          ) : (
            <div className="projectGrid">
              {projects.map((project) => (
                <article className="projectCard" key={project.id}>
                  <div className="projectTop">
                    <div className="projectIcon">P</div>
                    <span>{project.status}</span>
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.location_label}</p>

                  <div className="progressLabel">
                    <span>Project readiness</span>
                    <strong>{project.progress || 0}%</strong>
                  </div>
                  <div className="dashboardProgress">
                    <span style={{ width: `${project.progress || 0}%` }} />
                  </div>

                  <div className="nextStep">
                    <small>NEXT STEP</small>
                    <strong>{project.next_step}</strong>
                  </div>

                  <button>Open Project</button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="workspaceGrid">
          <article id="documents">
            <p>PROJECT BINDER</p>
            <h3>Keep every important document together.</h3>
            <span>
              Permits, estimates, contracts, receipts, inspection reports, and
              warranties will live here.
            </span>
            <button>Add a Document</button>
          </article>

          <article id="professionals">
            <p>PROFESSIONALS</p>
            <h3>Find the right help for the work ahead.</h3>
            <span>
              Compare contractors by specialty, service area, and verified
              credentials.
            </span>
            <button>Browse Professionals</button>
          </article>
        </section>
      </section>
    </main>
  );
}
