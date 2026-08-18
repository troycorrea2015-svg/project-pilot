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
    description: "Manage multiple projects, compare DIY and professional routes, track costs, and keep each step-by-step plan separate.",
    projectLabel: "MY HOME PROJECTS",
    projectHeading: "Keep every project moving.",
    launchCopy: "Choose a common home project or create a custom one. There is no one-project limit for homeowner accounts.",
    tools: [
      { eyebrow: "HOME PROJECT FILES", title: "Keep every plan, quote, receipt, and approval together.", description: "Store documents separately for every active improvement around your home.", image: "/home-cost-planning.jpg", action: "Open Files & Documents" },
      { eyebrow: "DIY + COST ROUTES", title: "Compare doing it yourself with hiring a professional.", description: "Review materials, tools, cost ranges, and project-specific learning links.", image: "/home-diy-builder.jpg", action: "Explore DIY Route" },
      { eyebrow: "PILOT GUIDANCE", title: "Know which home project needs attention next.", description: "Project Assistant keeps each project scope, permit path, costs, files, and next step connected.", image: "/role-homeowner.jpg", action: "Ask Pilot" },
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
      { eyebrow: "CLIENT JOB FILES", title: "Keep estimates, plans, approvals, and closeout records by customer.", description: "Every client project has its own files and step-by-step project plan.", image: "/role-contractor.jpg", action: "Open Client Project" },
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
  project_manager: {
    value: "Project Manager",
    label: "Project Manager",
    image: "/role-property-manager.jpg",
    eyebrow: "YOUR PROJECT PORTFOLIO",
    headline: "Keep teams, documents, costs, approvals, and next actions aligned.",
    description: "Manage multiple projects with clear responsibilities, progress, files, and decision history.",
    projectLabel: "MANAGED PROJECTS",
    projectHeading: "Keep every assigned project moving.",
    launchCopy: "Create a project for each client, site, or scope of work and keep the important details separated.",
    tools: [
      { eyebrow: "PROJECT RECORDS", title: "Keep decisions, approvals, plans, and closeout records together.", description: "Each project keeps its own plan, files, costs, notes, and permit guidance.", image: "/role-property-manager.jpg", action: "Open Managed Project" },
      { eyebrow: "COSTS + RESPONSIBILITIES", title: "Keep budgets and the next responsible action visible.", description: "Use one workspace to reduce missed handoffs and scattered project information.", image: "/home-cost-planning.jpg", action: "Review Project" },
      { eyebrow: "PROJECT ASSISTANT", title: "Get plain-language help when a requirement is unclear.", description: "Project Assistant can explain terms, organize questions, and identify the next step.", image: "/pilot-guide.jpg", action: "Ask Project Assistant" },
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
      { eyebrow: "PIPELINE GUIDANCE", title: "See which opportunity is ready for the next decision.", description: "Project Assistant keeps the portfolio view and project plans aligned.", image: "/pilot-guide.jpg", action: "Ask Pilot" },
    ],
  },
};

function normalizeAccountRole(value) {
  const role = String(value || "Homeowner").toLowerCase();
  if (role.includes("contractor")) return "contractor";
  if (role.includes("project manager")) return "project_manager";
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


function inferGuidedProjectType(value) {
  const text = String(value || "").toLowerCase();
  const matches = [
    ["deck", "Deck"], ["patio", "Deck / Patio"], ["kitchen", "Kitchen Remodel"],
    ["bathroom", "Bathroom Remodel"], ["bath", "Bathroom Remodel"], ["fence", "Fence"],
    ["shed", "Shed"], ["garage", "Garage"], ["pool", "Pool"], ["addition", "Addition"],
    ["roof", "Roofing"], ["driveway", "Driveway"], ["basement", "Basement Remodel"],
    ["renovation", "Renovation"], ["remodel", "Remodel"], ["repair", "Home Repair"],
  ];
  return matches.find(([term]) => text.includes(term))?.[1] || "";
}

function guidedProjectTitle(projectType) {
  if (!projectType) return "My Home Project";
  if (/remodel/i.test(projectType)) return projectType;
  return `${projectType} Project`;
}

function accountProjectRole(user) {
  const role = normalizeAccountRole(user?.user_metadata?.role);
  if (role === "contractor") return "Contractor";
  if (role === "project_manager") return "Project Manager";
  if (role === "property_manager") return "Property Manager";
  if (role === "developer") return "Developer / Investor";
  return "Owner";
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
        "Start with the project idea. Project Assistant will turn it into a clear project plan and keep the next action visible.",
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
        "Your project is ready for the next step. Review the current recommendation and keep supporting plans or property records in Files & Documents.",
      estimate: "About 5 minutes",
    };
  }

  return {
    objective: project.next_step || "Review remaining project milestones",
    message:
      "The project is well underway. Focus on the next incomplete step and keep approvals, receipts, inspections, and warranties organized as the work advances.",
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [projectIdea, setProjectIdea] = useState("");
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [showFirstRunGuide, setShowFirstRunGuide] = useState(false);
  const [referral, setReferral] = useState(null);
  const [referralNotice, setReferralNotice] = useState("");
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    title: "",
    projectType: "",
    description: "",
    address: "",
    projectRole: "Owner",
    targetTimeline: "",
    budget: "",
  });

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

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          const pendingReferral = localStorage.getItem("project_pilot_referral_code") || currentUser.user_metadata?.referral_code;
          if (pendingReferral) {
            const claimResponse = await fetch("/api/referrals/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ code: pendingReferral }),
            });
            if (claimResponse.ok) {
              localStorage.removeItem("project_pilot_referral_code");
              await supabase.auth.updateUser({ data: { referral_code: null } }).catch(() => null);
              setReferralNotice("Your $10 referral credit is ready for Permit Concierge.");
            } else if (claimResponse.status === 400) {
              localStorage.removeItem("project_pilot_referral_code");
              await supabase.auth.updateUser({ data: { referral_code: null } }).catch(() => null);
            } else {
              setReferralNotice("Your referral is saved and will be applied when the loyalty service is available.");
            }
          }

          const referralResponse = await fetch("/api/referrals/status", { headers: { Authorization: `Bearer ${token}` } });
          if (referralResponse.ok) setReferral(await referralResponse.json());
        }
      } catch {
        // Referral status should never prevent the dashboard from loading.
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (mounted) setIsAdmin(Boolean(profileData?.is_admin));

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

  // The welcome guide is now opt-in. The main dashboard itself is the guided experience.


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
          title: "Your dashboard is ready",
          detail: "Create a project to begin your step-by-step Project Plan.",
          date: "Ready now",
        },
      ];
    }

    return projects.slice(0, 3).map((project) => ({
      title: project.title || "Untitled Project",
      detail: `${getProjectStage(project)} · ${
        project.next_step || "Review the next project step"
      }`,
      date: formatUpdatedDate(project.updated_at || project.created_at),
    }));
  }, [projects]);

  async function startProjectWithSu(event, presetIdea = "") {
    event?.preventDefault?.();
    if (!user || creating) return;

    const idea = String(presetIdea || projectIdea || "").trim();
    if (idea.length < 5) {
      setDashboardError("Tell Su what you want to build, repair, or improve in one sentence.");
      window.setTimeout(() => document.getElementById("project-idea-input")?.focus(), 50);
      return;
    }

    setCreating(true);
    setDashboardError("");

    const projectType = inferGuidedProjectType(idea);
    const title = guidedProjectTitle(projectType);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        project_type: projectType || null,
        description: idea,
        address: null,
        location_label: "Location not added",
        project_role: accountProjectRole(user),
        target_timeline: null,
        budget: null,
        status: "Getting Started",
        progress: projectType ? 10 : 7,
        next_step: projectType
          ? "Tell Su the project address"
          : "Tell Su what kind of project this is",
      })
      .select()
      .single();

    if (error || !data) {
      setDashboardError(error?.message || "Project Pilot could not start the project.");
      setCreating(false);
      return;
    }

    setProjects((current) => [data, ...current]);
    setProjectIdea("");
    setCreating(false);
    router.push(`/project/${data.id}?tab=pilot&onboarding=1`);
  }

  async function shareReferral() {
    if (!referral?.shareUrl) return;
    const shareData = {
      title: "Project Pilot",
      text: "I use Project Pilot to plan home projects and simplify permits. Use my link and you’ll get $10 toward Permit Concierge if you want them to handle the permit process.",
      url: referral.shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setReferralNotice("Referral link shared.");
      } else {
        await navigator.clipboard.writeText(referral.shareUrl);
        setReferralNotice("Referral link copied.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setReferralNotice("Copy your referral link and share it with a friend.");
    }
  }

  function focusProjectIdea() {
    window.setTimeout(() => {
      document.getElementById("project-idea-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("project-idea-input")?.focus();
    }, 30);
  }

  async function createProject(template = {}) {
    if (!user || creating) return;

    setCreating(true);
    setDashboardError("");

    const projectType = String(template.projectType || "").trim();
    const projectAddress = String(template.address || "").trim();
    const budgetValue = template.budget === "" || template.budget == null
      ? null
      : Number(template.budget);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: String(template.title || "").trim() || (projectType ? `${projectType} Project` : "Untitled Project"),
        project_type: projectType || null,
        description: String(template.description || "").trim() || null,
        address: projectAddress || null,
        location_label: projectAddress || "Location not added",
        project_role: template.projectRole || null,
        target_timeline: String(template.targetTimeline || "").trim() || null,
        budget: Number.isFinite(budgetValue) ? budgetValue : null,
        status: "Getting Started",
        progress: projectAddress ? 10 : 5,
        next_step: projectType
          ? `Describe the ${projectType.toLowerCase()} project and confirm the desired result`
          : "Describe what you are planning",
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
    setShowProjectWizard(false);
    setWizardStep(1);
    setCreating(false);
    router.push(`/project/${data.id}`);
  }

  function addProject(template = {}) {
    setWizardForm({
      title: template.title || "",
      projectType: template.projectType || "",
      description: template.description || "",
      address: "",
      projectRole: accountRole === "contractor"
        ? "Contractor"
        : accountRole === "project_manager"
          ? "Project Manager"
          : accountRole === "property_manager"
            ? "Property Manager"
            : accountRole === "developer"
              ? "Developer / Investor"
              : "Owner",
      targetTimeline: "",
      budget: "",
    });
    setWizardStep(1);
    setShowProjectWizard(true);
  }

  function updateWizardField(field, value) {
    setWizardForm((current) => ({ ...current, [field]: value }));
  }

  function submitProjectWizard(event) {
    event.preventDefault();
    if (!wizardForm.projectType.trim() || !wizardForm.title.trim()) {
      setDashboardError("Add a project type and project name before continuing.");
      setWizardStep(1);
      return;
    }
    createProject(wizardForm);
  }

  async function deleteProject(project) {
    if (!user || !project?.id || deletingProject) return;

    const confirmed = window.confirm(
      `Delete “${project.title || "Untitled Project"}”? This permanently removes its project plan, messages, notes, permit research, and saved files.`
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
          "Save approvals and inspection records in Files & Documents.",
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
          notes: index === 3 ? "Permit check saved. Confirm the responsible government office before submission." : "",
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
          message: "The project setup and permit check are saved. The next step is collecting the site plan, framing details, estimates, and product information in Files & Documents.",
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
      await supabase
        .from("profiles")
        .update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq("id", data.user.id);
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
      router.push(`/project/${primaryProject.id}?tab=pilot`);
      return;
    }

    focusProjectIdea();
  }

  function dismissFirstRunGuide() {
    try {
      window.localStorage.setItem("project-pilot-first-run-guide-v1", "complete");
    } catch {
      // The guide can still close when browser storage is unavailable.
    }
    setShowFirstRunGuide(false);
  }

  function startFirstProjectFromGuide() {
    dismissFirstRunGuide();
    focusProjectIdea();
  }

  if (loading || !user) {
    return <main className="dashboardLoading">Opening your dashboard…</main>;
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
  const firstName = displayName.trim().split(" ")[0] || displayName;
  const accountRole = normalizeAccountRole(user.user_metadata?.role);
  const workspaceProfile = ACCOUNT_WORKSPACES[accountRole] || ACCOUNT_WORKSPACES.homeowner;
  const missionAngle = `${averageProgress * 3.6}deg`;

  return (
    <main className={`dashboardPage ${projects.length ? "" : "firstRunDashboard"}`.trim()}>
      <aside className="dashboardSidebar">
        <div>
          <a href="/" className="dashboardBrand dashboardBrandImage">
            <img src="/project-pilot-approved-logo.png" alt="Project Pilot" />
          </a>
        </div>

        <nav aria-label="Dashboard navigation">
          <a className="active" href="/dashboard">Home</a>
          <a href="#projects">Projects</a>
          <a href={primaryProject ? `/project/${primaryProject.id}?tab=permits` : "#projects"}>Permits</a>
          <a href={primaryProject ? `/project/${primaryProject.id}?tab=vision` : "#projects"}>Visualize</a>
          <a href="/contractors">Contractors</a>
          <a href="/help">Help</a>
          <button className="sidebarGuideButton" type="button" onClick={() => setShowFirstRunGuide(true)}>How to use Project Pilot</button>
          {accountRole === "contractor" && <a href="/contractor">Contractor Center</a>}
          {isAdmin && <a href="/admin">Admin Control Center</a>}
          <a href="/">Public Website</a>
        </nav>

        <div className="sidebarStatus">
          <span className="statusDot" />
          <div>
            <strong>Project Assistant ready</strong>
            <small>Ask for help on any page</small>
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
          <span>ACCOUNT TYPE</span>
          <select
            value={workspaceProfile.value}
            onChange={(event) => updateAccountType(event.target.value)}
            disabled={accountSaving}
          >
            <option value="Homeowner">Homeowner</option>
            <option value="Contractor">Contractor</option>
            <option value="Property Manager">Property Manager</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Developer">Developer / Investor</option>
          </select>
          <small>{accountSaving ? "Updating account type…" : `${workspaceProfile.label} tools active`}</small>
        </label>
      </aside>

      <section className="dashboardMain">
        {showFirstRunGuide && (
          <div className="firstRunOverlay" role="dialog" aria-modal="true" aria-labelledby="firstRunTitle">
            <div className="firstRunModal">
              <button className="firstRunClose" type="button" onClick={dismissFirstRunGuide} aria-label="Close guide">×</button>
              <p>WELCOME TO PROJECT PILOT</p>
              <h2 id="firstRunTitle">Tell Su what you want to do. That is enough to start.</h2>
              <span className="firstRunIntro">No project form to figure out. Su asks one question at a time, saves approved answers, and points you directly to the screen for the next task.</span>
              <div className="firstRunSteps">
                <article><b>1</b><div><strong>Describe the idea</strong><span>Example: “I want to replace my back deck and make it larger.”</span></div></article>
                <article><b>2</b><div><strong>Answer one question</strong><span>Su only asks for information when it is actually needed.</span></div></article>
                <article><b>3</b><div><strong>Follow Su</strong><span>When permits, files, contractors, or visualization are next, Su takes you to the right place.</span></div></article>
              </div>
              <div className="firstRunActions">
                <button type="button" onClick={primaryProject ? () => { dismissFirstRunGuide(); openPrimaryProject(); } : startFirstProjectFromGuide}>{primaryProject ? "Show My Next Step" : "Start My First Project"}</button>
                <button className="firstRunSecondary" type="button" onClick={dismissFirstRunGuide}>Look Around First</button>
              </div>
              <small>You can reopen this guide anytime from “How to use Project Pilot” in the sidebar.</small>
            </div>
          </div>
        )}

        <header className="dashboardHeader">
          <div>
            <p>YOUR DASHBOARD</p>
            <h1>{getGreeting()}, {firstName}.</h1>
            <span>See what needs attention and choose your next action.</span>
          </div>

          <div className="dashboardActions">
            <button className="signOutButton" type="button" onClick={signOut}>
              Sign Out
            </button>
            <button
              className="newProjectButton"
              type="button"
              onClick={focusProjectIdea}
              disabled={creating}
            >
              {creating ? "Starting…" : "+ New Project"}
            </button>
          </div>
        </header>

        {dashboardError && (
          <div className="dashboardError" role="alert">
            <strong>Action needed</strong>
            <span>{dashboardError}</span>
          </div>
        )}

        <section className="suStartCard" id="start-with-su" aria-label="Start or continue with Su">
          <div className="suStartCopy">
            <p>START WITH SU</p>
            <h2>{primaryProject ? "You do not have to figure out the next screen." : "Tell Su what you want to do with your property."}</h2>
            <span>
              {primaryProject
                ? "Su can look at the saved project, tell you the single next step, and take you to the right Project Pilot tool."
                : "One sentence is enough. Su will organize the project and ask only the next question it needs."}
            </span>
          </div>

          {primaryProject && (
            <div className="suContinueCard">
              <small>CURRENT PROJECT</small>
              <strong>{primaryProject.title}</strong>
              <span>{primaryProject.next_step || "Ask Su what to do next"}</span>
              <button type="button" onClick={() => router.push(`/project/${primaryProject.id}?tab=pilot`)}>
                Let Su guide me →
              </button>
            </div>
          )}

          <form className="suProjectComposer" onSubmit={(event) => startProjectWithSu(event)}>
            <label htmlFor="project-idea-input">{primaryProject ? "Start another project" : "What do you want to build, repair, or improve?"}</label>
            <div className="suProjectInputRow">
              <textarea
                id="project-idea-input"
                value={projectIdea}
                onChange={(event) => setProjectIdea(event.target.value)}
                placeholder="Example: I want to replace my back deck and make it larger."
                rows={3}
              />
              <button type="submit" disabled={creating || !projectIdea.trim()}>
                {creating ? "Starting…" : "Start with Su"}
              </button>
            </div>
            <div className="suIdeaChips" aria-label="Common project ideas">
              {["Replace my deck", "Remodel my kitchen", "Renovate my bathroom", "Build a shed", "Install a fence", "Add a pool"].map((idea) => (
                <button type="button" key={idea} onClick={() => setProjectIdea(idea)}>{idea}</button>
              ))}
            </div>
            <small>No budget, permit knowledge, project name, or construction terminology is required to start.</small>
          </form>

          <div className="suQuickRoutes">
            <span>Already know what you need?</span>
            <button type="button" onClick={() => primaryProject ? router.push(`/project/${primaryProject.id}?tab=permits`) : focusProjectIdea()}>Permits</button>
            <button type="button" onClick={() => primaryProject ? router.push(`/project/${primaryProject.id}?tab=vision`) : focusProjectIdea()}>Visualize</button>
            <button type="button" onClick={() => primaryProject ? router.push(`/contractors?project=${primaryProject.id}`) : focusProjectIdea()}>Contractors</button>
            <button type="button" onClick={() => setShowFirstRunGuide(true)}>How it works</button>
          </div>
        </section>

        <section className="dashboardSection" id="projects">
          <div className="sectionTitleRow">
            <div>
              <p>{workspaceProfile.projectLabel}</p>
              <h2>{workspaceProfile.projectHeading}</h2>
            </div>
            <button type="button" onClick={focusProjectIdea} disabled={creating}>
              {creating ? "Starting…" : "Start Another Project"}
            </button>
          </div>

          {!projects.length ? (
            <div className="emptyProjects">
              <div className="emptyProjectIcon">P</div>
              <h3>No projects yet.</h3>
              <p>
                Start your first project and Project Assistant will guide you through each step from the initial idea to completion.
              </p>
              <button type="button" onClick={focusProjectIdea} disabled={creating}>
                {creating ? "Starting…" : "Tell Su My Project Idea"}
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
                      <small>NEXT STEP</small>
                      <strong>{project.next_step || "Review the next project step"}</strong>
                    </div>

                    <div className="projectCardActions">
                      <button
                        type="button"
                        className="openProjectButton"
                        onClick={() => router.push(`/project/${project.id}?tab=pilot`)}
                      >
                        Continue with Su <span aria-hidden="true">→</span>
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

        {referral && (
          <section className="referralCard" id="referrals">
            <div className="referralCopy">
              <p>REFER A FRIEND</p>
              <h2>Give $10. Get $10.</h2>
              <span>Your friend gets $10 toward Permit Concierge when they join with your link. After their first paid Concierge order, you earn $10 Project Pilot credit for a future Concierge order.</span>
              {referralNotice && <small>{referralNotice}</small>}
            </div>
            <div className="referralActions">
              <div><small>YOUR CREDIT</small><strong>${(Number(referral.balanceCents || 0) / 100).toFixed(0)}</strong></div>
              <div><small>FRIENDS JOINED</small><strong>{referral.invited || 0}</strong></div>
              <button type="button" onClick={shareReferral}>Share My Link</button>
              <code>{referral.shareUrl}</code>
            </div>
          </section>
        )}

        <section className="dashboardHelpStrip">
          <div><strong>Not sure what to do?</strong><span>Open any project and ask Su. You never need to choose the right tool on your own.</span></div>
          <button type="button" onClick={openPrimaryProject}>{primaryProject ? "Ask Su" : "Start with Su"}</button>
        </section>
      </section>

    </main>
  );
}
