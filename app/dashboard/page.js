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

const PROJECT_CATEGORIES = [
  { key: "deck", label: "Decks & Patios", projectType: "Deck", title: "New Deck Project", image: "/category-deck.jpg" },
  { key: "kitchen", label: "Kitchens", projectType: "Kitchen", title: "Kitchen Renovation", image: "/category-kitchen.jpg" },
  { key: "bathroom", label: "Bathrooms", projectType: "Bathroom", title: "Bathroom Renovation", image: "/category-bathroom.jpg" },
  { key: "addition", label: "Additions", projectType: "Addition", title: "Home Addition", image: "/category-addition.jpg" },
  { key: "fence", label: "Fences", projectType: "Fence", title: "New Fence Project", image: "/category-fence.jpg" },
  { key: "shed", label: "Sheds & Garages", projectType: "Shed", title: "Shed or Garage Project", image: "/category-shed.jpg" },
];

const ACCOUNT_WORKSPACES = {
  homeowner: {
    value: "Homeowner",
    label: "Homeowner",
    image: "/role-homeowner.jpg",
    eyebrow: "YOUR HOME PROJECTS",
    headline: "Plan every improvement around your home without losing track of the details.",
    description: "Manage multiple projects, compare DIY and professional routes, track costs, and keep each Flight Plan separate.",
    projectLabel: "MY HOME PROJECTS",
    projectHeading: "Keep every project moving.",
    launchCopy: "Choose a common home project or create a custom one. There is no one-project limit for homeowner accounts.",
    tools: [
      { eyebrow: "HOME PROJECT BINDER", title: "Keep every plan, quote, receipt, and approval together.", description: "Store documents separately for every active improvement around your home.", image: "/home-cost-planning.jpg", action: "Open Project Binder" },
      { eyebrow: "DIY + COST ROUTES", title: "Compare doing it yourself with hiring a professional.", description: "Review materials, tools, cost ranges, and project-specific learning links.", image: "/home-diy-builder.jpg", action: "Explore DIY Route" },
      { eyebrow: "PILOT GUIDANCE", title: "Know which home project needs attention next.", description: "Pilot keeps each project scope, permit path, costs, files, and next waypoint connected.", image: "/role-homeowner.jpg", action: "Ask Pilot" },
    ],
  },
  contractor: {
    value: "Contractor",
    label: "Contractor",
    image: "/role-contractor.jpg",
    eyebrow: "YOUR CLIENT JOBS",
    headline: "Keep active jobs, permit preparation, estimates, and client documents in one view.",
    description: "Use Project Pilot as a job command center across multiple customers and project locations.",
    projectLabel: "CLIENT PROJECTS",
    projectHeading: "Continue the next active job.",
    launchCopy: "Start a client job from a category or create a custom project for a different scope of work.",
    tools: [
      { eyebrow: "CLIENT JOB FILES", title: "Keep estimates, plans, approvals, and closeout records by customer.", description: "Every client project has its own Binder and Flight Plan.", image: "/role-contractor.jpg", action: "Open Client Project" },
      { eyebrow: "ESTIMATES + PERMITS", title: "Prepare project ranges and jurisdiction questions before work starts.", description: "Keep cost planning and permit research connected to the same job.", image: "/home-cost-planning.jpg", action: "Review Job Costs" },
      { eyebrow: "PILOT FOR EXECUTION", title: "Keep the next job action visible across active work.", description: "Pilot can guide scope, documents, permit preparation, and project handoffs.", image: "/home-diy-builder.jpg", action: "Continue Job" },
    ],
  },
  property_manager: {
    value: "Property Manager",
    label: "Property Manager",
    image: "/role-property-manager.jpg",
    eyebrow: "YOUR PROPERTY PORTFOLIO",
    headline: "Coordinate improvements, maintenance, vendors, and compliance across every property.",
    description: "Track multiple projects and locations while keeping costs, documents, and next actions organized.",
    projectLabel: "PROPERTY PROJECTS",
    projectHeading: "Manage work across your portfolio.",
    launchCopy: "Create projects by property and scope, then keep each vendor, permit, cost, and document connected.",
    tools: [
      { eyebrow: "PROPERTY RECORDS", title: "Build a project history for every property you manage.", description: "Keep permits, inspections, contracts, warranties, and decisions easy to retrieve.", image: "/role-property-manager.jpg", action: "Open Property Project" },
      { eyebrow: "VENDORS + BUDGETS", title: "Compare project costs and keep vendor work organized.", description: "Use separate workspaces for renovations, maintenance, and compliance projects.", image: "/home-cost-planning.jpg", action: "Review Portfolio Work" },
      { eyebrow: "PORTFOLIO GUIDANCE", title: "Prioritize the project with the greatest property impact.", description: "Pilot surfaces readiness, missing documents, permit needs, and next actions.", image: "/pilot-guide.jpg", action: "Ask Pilot" },
    ],
  },
  developer: {
    value: "Developer",
    label: "Developer / Investor",
    image: "/role-property-manager.jpg",
    eyebrow: "YOUR DEVELOPMENT PIPELINE",
    headline: "Track feasibility, approvals, costs, and project readiness across opportunities.",
    description: "Use one portfolio view for planning decisions, property research, documentation, and progress.",
    projectLabel: "DEVELOPMENT PROJECTS",
    projectHeading: "Advance the next opportunity.",
    launchCopy: "Start with a project category or create a custom development workspace.",
    tools: [
      { eyebrow: "DUE DILIGENCE", title: "Keep planning assumptions, property records, and approvals connected.", description: "Create a separate workspace for each opportunity or active development.", image: "/role-property-manager.jpg", action: "Open Development" },
      { eyebrow: "COST + FEASIBILITY", title: "Compare early cost ranges before committing more capital.", description: "Keep budget planning, permit research, and documentation in one place.", image: "/home-cost-planning.jpg", action: "Review Feasibility" },
      { eyebrow: "PIPELINE GUIDANCE", title: "See which opportunity is ready for the next decision.", description: "Pilot keeps the portfolio view and project-level Flight Plans aligned.", image: "/pilot-guide.jpg", action: "Ask Pilot" },
    ],
  },
};

function normalizeAccountRole(value) {
  const role = String(value || "Homeowner").toLowerCase();
  if (role.includes("contractor")) return "contractor";
  if (role.includes("property")) return "property_manager";
  if (role.includes("developer") || role.includes("investor")) return "developer";
  return "homeowner";
}

function projectImage(project) {
  const text = `
    ${project?.project_type || ""}
    ${project?.title || ""}
    ${project?.description || ""}
  `.toLowerCase();

  if (text.includes("deck") || text.includes("patio")) return "/category-deck.jpg";
  if (text.includes("kitchen")) return "/category-kitchen.jpg";
  if (text.includes("bath")) return "/category-bathroom.jpg";
  if (text.includes("addition")) return "/category-addition.jpg";
  if (text.includes("fence")) return "/category-fence.jpg";
  if (text.includes("shed") || text.includes("garage")) return "/category-shed.jpg";
  return "/home-planning-people.jpg";
}

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
  const [deletingProject, setDeletingProject] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);

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

  async function createProject(template = {}) {
    if (!user || creating) return;

    setCreating(true);
    setDashboardError("");

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: template.title || "Untitled Project",
        project_type: template.projectType || null,
        description: template.description || null,
        location_label: "Location not added",
        status: "Getting Started",
        progress: 5,
        next_step: template.projectType
          ? `Tell Pilot about the ${template.projectType.toLowerCase()} project and desired result`
          : "Tell Pilot what you are planning",
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

  async function addProject() {
    return createProject();
  }

  async function deleteProject(project) {
    if (!user || !project?.id || deletingProject) return;

    const confirmed = window.confirm(
      `Delete “${project.title || "Untitled Project"}”? This permanently removes its Flight Plan, messages, notes, permit research, and Project Binder records.`
    );

    if (!confirmed) return;

    setDeletingProject(project.id);
    setDashboardError("");

    try {
      const { data: documentRows, error: documentError } = await supabase
        .from("project_documents")
        .select("file_path")
        .eq("project_id", project.id)
        .eq("user_id", user.id);

      if (documentError) throw documentError;

      const filePaths = (documentRows || [])
        .map((document) => document.file_path)
        .filter(Boolean);

      if (filePaths.length) {
        const { error: storageError } = await supabase.storage
          .from("project-documents")
          .remove(filePaths);

        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (deleteError) {
      setDashboardError(
        deleteError?.message || "Project Pilot could not delete this project."
      );
    } finally {
      setDeletingProject("");
    }
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

  async function updateAccountType(nextRole) {
    if (!user || accountSaving) return;

    setAccountSaving(true);
    setDashboardError("");

    const nextMetadata = {
      ...(user.user_metadata || {}),
      role: nextRole,
    };

    const { data, error } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    if (error) {
      setDashboardError(error.message || "Project Pilot could not update your account type.");
    } else if (data?.user) {
      setUser(data.user);
    }

    setAccountSaving(false);
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
  const accountRole = normalizeAccountRole(user.user_metadata?.role);
  const workspaceProfile = ACCOUNT_WORKSPACES[accountRole] || ACCOUNT_WORKSPACES.homeowner;
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

        <label className="accountTypeSwitcher">
          <span>ACCOUNT WORKSPACE</span>
          <select
            value={workspaceProfile.value}
            onChange={(event) => updateAccountType(event.target.value)}
            disabled={accountSaving}
          >
            <option value="Homeowner">Homeowner</option>
            <option value="Contractor">Contractor</option>
            <option value="Property Manager">Property Manager</option>
            <option value="Developer">Developer / Investor</option>
          </select>
          <small>{accountSaving ? "Updating workspace…" : `${workspaceProfile.label} experience active`}</small>
        </label>
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

        <section className={`signedInVisualHero role-${accountRole}`}>
          <div className="signedInVisualCopy">
            <p>{workspaceProfile.eyebrow}</p>
            <h2>{workspaceProfile.headline}</h2>
            <span>{workspaceProfile.description}</span>
            <div>
              <button type="button" onClick={addProject} disabled={creating}>
                {creating ? "Creating…" : "Start a New Project"}
              </button>
              <a href="#category-launchpad">Browse project categories</a>
            </div>
          </div>
          <img
            src={workspaceProfile.image}
            alt={`${workspaceProfile.label} planning active projects`}
            fetchPriority="high"
            decoding="async"
          />
        </section>

        <section className="categoryLaunchpad" id="category-launchpad">
          <div className="categoryLaunchpadHeading">
            <div>
              <p>WHAT ARE YOU PLANNING?</p>
              <h2>Start with a project you can picture.</h2>
            </div>
            <span>{workspaceProfile.launchCopy}</span>
          </div>
          <div className="signedInCategoryGrid">
            {PROJECT_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.key}
                onClick={() => createProject(category)}
                disabled={creating}
              >
                <img src={category.image} alt={`${category.label} with people planning or completing the work`} loading="lazy" decoding="async" />
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </section>

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
              <p>{workspaceProfile.projectLabel}</p>
              <h2>{workspaceProfile.projectHeading}</h2>
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
                    <div className="projectImageWrap">
                      <img src={projectImage(project)} alt={`${project.title || "Project"} visual with project context`} loading="lazy" decoding="async" />
                      <span>{project.project_type || "Guided project"}</span>
                    </div>

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

                    <div className="projectCardActions">
                      <button
                        type="button"
                        className="openProjectButton"
                        onClick={() => router.push(`/project/${project.id}`)}
                      >
                        Open Workspace <span aria-hidden="true">→</span>
                      </button>
                      <button
                        type="button"
                        className="deleteProjectButton"
                        onClick={() => deleteProject(project)}
                        disabled={deletingProject === project.id}
                        aria-label={`Delete ${project.title || "project"}`}
                      >
                        {deletingProject === project.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="workspaceGrid" id="documents">
          {workspaceProfile.tools.map((tool, index) => (
            <article className="visualWorkspaceCard" key={tool.title}>
              <img src={tool.image} alt={`${tool.eyebrow} visual`} loading="lazy" decoding="async" />
              <div>
                <div className="workspaceCardTop">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>AVAILABLE</b>
                </div>
                <p>{tool.eyebrow}</p>
                <h3>{tool.title}</h3>
                <span>{tool.description}</span>
                <button type="button" onClick={openPrimaryProject} disabled={creating}>
                  {primaryProject ? tool.action : "Create a Project First"}
                </button>
              </div>
            </article>
          ))}

          <article id="professionals" className="visualWorkspaceCard">
            <img src="/category-addition.jpg" alt="People planning a professional home improvement project" loading="lazy" decoding="async" />
            <div>
              <div className="workspaceCardTop">
                <span>04</span>
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
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
