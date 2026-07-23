"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./dashboard.css";

const FLIGHT_STAGES = [
  { label: "Concept", threshold: 0 },
  { label: "Planning", threshold: 10 },
  { label: "Location", threshold: 25 },
  { label: "Permits", threshold: 45 },
  { label: "Documents", threshold: 65 },
  { label: "Completion", threshold: 100 },
];

function clampProgress(value) {
  const number = Number(value) || 0;
  return Math.min(100, Math.max(0, number));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getProjectStage(project) {
  const progress = clampProgress(project?.progress);
  if (progress >= 100) return "Completed";
  if (progress >= 65) return "Documents";
  if (progress >= 45) return "Permit Research";
  if (progress >= 25) return "Location Review";
  if (progress >= 10) return "Planning";
  return project?.status || "Getting Started";
}

function formatUpdatedDate(value) {
  if (!value) return "Recently updated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

function buildPilotBriefing(project) {
  if (!project) {
    return {
      objective: "Create your first project",
      message:
        "Start with the project idea. Pilot will turn it into a clear Flight Plan and keep the next action visible.",
      estimate: "About 3 minutes",
    };
  }

  const locationMissing =
    !project.location_label || project.location_label === "Location not added";
  const progress = clampProgress(project.progress);

  if (locationMissing) {
    return {
      objective: "Add the project location",
      message:
        "Permit requirements depend on the governing jurisdiction. Confirming the location is the fastest way to unlock useful permit guidance.",
      estimate: "About 2 minutes",
    };
  }

  if (progress < 25) {
    return {
      objective: project.next_step || "Finish defining the project scope",
      message:
        "A stronger project scope reduces missing details later. Confirm the work, priorities, and property information before moving into permit research.",
      estimate: "5–10 minutes",
    };
  }

  if (progress < 65) {
    return {
      objective: project.next_step || "Continue permit preparation",
      message:
        "Your project is ready for the next waypoint. Review the current recommendation and keep supporting plans or property records in the Project Binder.",
      estimate: "About 5 minutes",
    };
  }

  return {
    objective: project.next_step || "Review remaining project milestones",
    message:
      "The project is well underway. Focus on the next incomplete waypoint and keep approvals, receipts, inspections, and warranties organized as the work advances.",
    estimate: "About 5 minutes",
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setDashboardError("");

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !currentUser) {
        router.replace("/");
        return;
      }

      setUser(currentUser);

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setDashboardError(
          "Your account opened, but Project Pilot could not load your projects. Refresh the page to try again."
        );
      } else {
        setProjects(data || []);
      }

      setLoading(false);
    }

    loadDashboard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const averageProgress = useMemo(() => {
    if (!projects.length) return 0;

    return Math.round(
      projects.reduce(
        (sum, project) => sum + clampProgress(project.progress),
        0
      ) / projects.length
    );
  }, [projects]);

  const primaryProject = projects[0] || null;
  const pilotBriefing = useMemo(
    () => buildPilotBriefing(primaryProject),
    [primaryProject]
  );

  const recentActivity = useMemo(() => {
    if (!projects.length) {
      return [
        {
          title: "Mission Control is ready",
          detail: "Create a project to begin your first Flight Plan.",
          date: "Ready now",
        },
      ];
    }

    return projects.slice(0, 3).map((project) => ({
      title: project.title || "Untitled Project",
      detail: `${getProjectStage(project)} · ${
        project.next_step || "Review the next waypoint"
      }`,
      date: formatUpdatedDate(project.updated_at || project.created_at),
    }));
  }, [projects]);

  async function addProject() {
    if (!user || creating) return;

    setCreating(true);
    setDashboardError("");

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: "Untitled Project",
        location_label: "Location not added",
        status: "Getting Started",
        progress: 5,
        next_step: "Tell Pilot what you are planning",
      })
      .select()
      .single();

    if (error || !data) {
      setDashboardError(
        error?.message || "Project Pilot could not create the project."
      );
      setCreating(false);
      return;
    }

    setProjects((current) => [data, ...current]);
    router.push(`/project/${data.id}`);
  }

  async function launchDemo() {
    if (!user || demoLoading) return;

    setDemoLoading(true);
    setDashboardError("");
    let createdProject = null;

    try {
      const permitResearch = {
        title: "Deck — Milton / Sussex County area",
        jurisdiction: "Town of Milton / Sussex County boundary review",
        summary: "A Milton mailing address does not by itself establish whether town or county requirements govern the property.",
        matchedAddress: "101 FEDERAL ST, MILTON, DE, 19968",
        addressMatched: true,
        coordinates: { latitude: 38.7776, longitude: -75.3099 },
        jurisdictionStatus: "Town-boundary and governing-authority confirmation required",
        steps: [
          "Confirm whether the property is inside Town of Milton limits.",
          "Ask whether zoning, building, or trade approvals apply to the deck replacement.",
          "Obtain the current application checklist and fee schedule.",
          "Prepare the site plan, framing plan, and stair or guard details.",
          "Save approvals and inspection records in the Project Binder.",
        ],
        documents: ["Site plan", "Footing and framing plans", "Guard, stair, and attachment details"],
        sources: [
          { label: "Town of Milton", url: "https://milton.delaware.gov/" },
          { label: "Sussex County Building Permits", url: "https://sussexcountyde.gov/building-permits" },
        ],
        checkedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: "Backyard Deck Replacement — Demo",
          description: "Replace an aging rear deck with a safer, larger outdoor living area including new stairs and guards.",
          project_type: "Deck",
          project_role: "Owner",
          target_timeline: "This fall",
          budget: 18500,
          address: permitResearch.matchedAddress,
          location_label: permitResearch.matchedAddress,
          latitude: permitResearch.coordinates.latitude,
          longitude: permitResearch.coordinates.longitude,
          jurisdiction: permitResearch.jurisdiction,
          permit_research: permitResearch,
          permit_checked_at: new Date().toISOString(),
          status: "Documents",
          progress: 50,
          next_step: "Collect plans, estimates, photos, contracts, and records.",
          notes: "Investor demo project. Confirm contractor availability, material lead times, and inspection sequencing.",
        })
        .select()
        .single();

      if (error || !data) throw error || new Error("Demo project could not be created.");
      createdProject = data;

      const stageLabels = ["Concept", "Planning", "Location", "Permits", "Documents", "Construction", "Inspections", "Completion"];
      const stageKeys = ["concept", "planning", "location", "permits", "documents", "construction", "inspections", "completion"];
      const { error: waypointError } = await supabase.from("project_waypoints").insert(
        stageKeys.map((stageKey, index) => ({
          project_id: data.id,
          user_id: user.id,
          stage_key: stageKey,
          stage_label: stageLabels[index],
          stage_order: index,
          notes: index === 3 ? "Permit Intelligence check saved. Confirm the governing authority before submission." : "",
          due_date: null,
          completed: index < 4,
          updated_at: new Date().toISOString(),
        }))
      );
      if (waypointError) throw waypointError;

      const { error: conversationError } = await supabase.from("conversations").insert([
        {
          project_id: data.id,
          user_id: user.id,
          role: "user",
          message: "I want to replace the unsafe deck behind my home with a larger deck for entertaining.",
        },
        {
          project_id: data.id,
          user_id: user.id,
          role: "assistant",
          message: "The project setup and permit check are saved. The next waypoint is collecting the site plan, framing details, estimates, and product information in the Project Binder.",
        },
      ]);
      if (conversationError) throw conversationError;

      setProjects((current) => [data, ...current]);
      router.push(`/project/${data.id}`);
    } catch (demoError) {
      if (createdProject?.id) {
        await supabase.from("projects").delete().eq("id", createdProject.id).eq("user_id", user.id);
      }
      setDashboardError(demoError?.message || "Project Pilot could not create the demo project.");
      setDemoLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  function openPrimaryProject() {
    if (primaryProject) {
      router.push(`/project/${primaryProject.id}`);
      return;
    }

    addProject();
  }

  if (loading || !user) {
    return <main className="dashboardLoading">Opening Mission Control…</main>;
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
  const firstName = displayName.trim().split(" ")[0] || displayName;
  const missionAngle = `${averageProgress * 3.6}deg`;

  return (
    <main className="dashboardPage">
      <aside className="dashboardSidebar">
        <div>
          <a href="/" className="dashboardBrand">
            <span>P</span>
            <strong>Project Pilot</strong>
          </a>
          <span className="betaBadge">BETA</span>
        </div>

        <nav aria-label="Dashboard navigation">
          <a className="active" href="/dashboard">Mission Control</a>
          <a href="#projects">My Projects</a>
          <a href="#flight-plan">Flight Plan</a>
          <a href="#documents">Project Binder</a>
          <a href="/">Project Pilot Home</a>
        </nav>

        <div className="sidebarStatus">
          <span className="statusDot" />
          <div>
            <strong>Pilot online</strong>
            <small>Ready for the next waypoint</small>
          </div>
        </div>

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
            <p>MISSION CONTROL</p>
            <h1>{getGreeting()}, {firstName}.</h1>
            <span>Your projects, priorities, and next waypoints are ready.</span>
          </div>

          <div className="dashboardActions">
            <button className="demoProjectButton" type="button" onClick={launchDemo} disabled={demoLoading || creating}>
              {demoLoading ? "Loading Demo…" : "Launch Demo"}
            </button>
            <button className="signOutButton" type="button" onClick={signOut}>
              Sign Out
            </button>
            <button
              className="newProjectButton"
              type="button"
              onClick={addProject}
              disabled={creating}
            >
              {creating ? "Creating…" : "+ New Project"}
            </button>
          </div>
        </header>

        {dashboardError && (
          <div className="dashboardError" role="alert">
            <strong>Action needed</strong>
            <span>{dashboardError}</span>
          </div>
        )}

        <section className="missionControlGrid" aria-label="Mission Control overview">
          <article className="missionReadinessCard">
            <div className="missionCardHeading">
              <div>
                <p>MISSION READINESS</p>
                <h2>{projects.length ? "Portfolio status" : "Ready for takeoff"}</h2>
              </div>
              <span className="livePill"><i /> LIVE</span>
            </div>

            <div className="readinessBody">
              <div
                className="readinessRing"
                style={{ "--mission-angle": missionAngle }}
                aria-label={`${averageProgress}% mission readiness`}
              >
                <div>
                  <strong>{averageProgress}%</strong>
                  <small>READY</small>
                </div>
              </div>

              <div className="readinessStats">
                <div>
                  <span>Active projects</span>
                  <strong>{projects.length}</strong>
                </div>
                <div>
                  <span>Current stage</span>
                  <strong>{getProjectStage(primaryProject)}</strong>
                </div>
                <div>
                  <span>Primary mission</span>
                  <strong>{primaryProject?.title || "Not started"}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="pilotBriefingCard">
            <div className="pilotBriefingHeader">
              <div className="pilotAvatar">P</div>
              <div>
                <p>PILOT BRIEFING</p>
                <h2>Today&apos;s priority</h2>
              </div>
            </div>

            <div className="priorityBlock">
              <span>CURRENT OBJECTIVE</span>
              <strong>{pilotBriefing.objective}</strong>
            </div>

            <p className="pilotMessage">{pilotBriefing.message}</p>

            <div className="briefingFooter">
              <div>
                <span>ESTIMATED TIME</span>
                <strong>{pilotBriefing.estimate}</strong>
              </div>
              <button type="button" onClick={openPrimaryProject} disabled={creating}>
                {primaryProject ? "Continue Mission" : "Start First Project"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>

          <article className="recentActivityCard">
            <div className="activityHeader">
              <div>
                <p>RECENT ACTIVITY</p>
                <h2>Latest movement</h2>
              </div>
              <span>{projects.length}</span>
            </div>

            <div className="activityList">
              {recentActivity.map((item, index) => (
                <div className="activityItem" key={`${item.title}-${index}`}>
                  <div className="activityMarker">{index === 0 ? "✓" : "•"}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <small>{item.date}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="flightPlanBanner" id="flight-plan">
          <div className="flightPlanCopy">
            <p>PORTFOLIO FLIGHT PLAN</p>
            <h2>Every project follows a clear course.</h2>
            <span>
              The active waypoint advances as project readiness improves. Open a
              project to complete the recommended next action.
            </span>
          </div>

          <div className="flightPlanStages" aria-label="Flight Plan stages">
            {FLIGHT_STAGES.map((stage, index) => {
              const completed = projects.length > 0 && averageProgress >= stage.threshold;
              const nextStage =
                projects.length > 0 &&
                averageProgress < stage.threshold &&
                (index === 0 || averageProgress >= FLIGHT_STAGES[index - 1].threshold);

              return (
                <div
                  className={`${completed ? "active" : ""} ${nextStage ? "current" : ""}`.trim()}
                  key={stage.label}
                >
                  <span>{completed ? "✓" : index + 1}</span>
                  <small>{stage.label}</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="dashboardSection" id="projects">
          <div className="sectionTitleRow">
            <div>
              <p>MY PROJECTS</p>
              <h2>Continue where you left off.</h2>
            </div>
            <button type="button" onClick={addProject} disabled={creating}>
              {creating ? "Creating…" : "Add Project"}
            </button>
          </div>

          {!projects.length ? (
            <div className="emptyProjects">
              <div className="emptyProjectIcon">P</div>
              <h3>No missions yet.</h3>
              <p>
                Every completed project begins with a Flight Plan. Create your
                first project and Pilot will guide the course from concept to
                completion.
              </p>
              <button type="button" onClick={addProject} disabled={creating}>
                {creating ? "Creating Project…" : "Start My First Project"}
              </button>
            </div>
          ) : (
            <div className="projectGrid">
              {projects.map((project) => {
                const progress = clampProgress(project.progress);

                return (
                  <article className="projectCard" key={project.id}>
                    <div className="projectTop">
                      <div className="projectIcon">P</div>
                      <span>{project.status || getProjectStage(project)}</span>
                    </div>

                    <div className="projectHeading">
                      <h3>{project.title || "Untitled Project"}</h3>
                      <p>{project.location_label || "Location not added"}</p>
                    </div>

                    <div className="projectMetaGrid">
                      <div>
                        <span>CURRENT STAGE</span>
                        <strong>{getProjectStage(project)}</strong>
                      </div>
                      <div>
                        <span>UPDATED</span>
                        <strong>{formatUpdatedDate(project.updated_at || project.created_at)}</strong>
                      </div>
                    </div>

                    <div className="progressLabel">
                      <span>Project readiness</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div className="dashboardProgress" aria-hidden="true">
                      <span style={{ width: `${progress}%` }} />
                    </div>

                    <div className="nextStep">
                      <small>NEXT OBJECTIVE</small>
                      <strong>{project.next_step || "Review the next waypoint"}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push(`/project/${project.id}`)}
                    >
                      Open Workspace <span aria-hidden="true">→</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="workspaceGrid">
          <article id="documents">
            <div className="workspaceCardTop">
              <span>01</span>
              <b>AVAILABLE</b>
            </div>
            <p>PROJECT BINDER</p>
            <h3>Keep every important document together.</h3>
            <span>
              Store permits, plans, estimates, contracts, receipts, inspection
              reports, and warranties inside the project workspace.
            </span>
            <button type="button" onClick={openPrimaryProject} disabled={creating}>
              {primaryProject ? "Open Project Binder" : "Create a Project First"}
            </button>
          </article>

          <article id="professionals">
            <div className="workspaceCardTop">
              <span>02</span>
              <b className="developmentPill">IN DEVELOPMENT</b>
            </div>
            <p>PROFESSIONAL NETWORK</p>
            <h3>Bring the right help into the mission.</h3>
            <span>
              Contractor discovery and credential comparison are being prepared
              for a future beta release.
            </span>
            <button type="button" disabled>
              Network Coming Soon
            </button>
          </article>
        </section>
      </section>
    </main>
  );
}
