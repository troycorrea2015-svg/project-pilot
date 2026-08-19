"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { readAssistantStream } from "../../../lib/assistant-stream";
import ProjectVision from "../../../components/ProjectVision";
import PermitAutopilot from "../../../components/PermitAutopilot";
import PermitApplicationBuilder from "../../../components/PermitApplicationBuilder";
import FullServicePermitStart from "../../../components/FullServicePermitStart";
import "./project.css";

const STAGES = [
  { key: "concept", label: "Concept", description: "Define the project goal, scope, and desired result." },
  { key: "planning", label: "Planning", description: "Capture budget, timeline, responsibilities, and constraints." },
  { key: "location", label: "Location", description: "Confirm the project property and governing jurisdiction." },
  { key: "permits", label: "Permits", description: "Research approvals, forms, fees, and official requirements." },
  { key: "documents", label: "Documents", description: "Collect plans, estimates, photos, contracts, and records." },
  { key: "construction", label: "Construction", description: "Track work, decisions, changes, and key milestones." },
  { key: "inspections", label: "Inspections", description: "Prepare for required reviews, corrections, and sign-offs." },
  { key: "completion", label: "Completion", description: "Close permits and organize final project records." },
];

const NAV_ITEMS = [
  ["overview", "Next Step"],
  ["pilot", "Ask Su"],
  ["permits", "Permits"],
  ["vision", "Visualize"],
  ["contractors", "Contractors"],
  ["documents", "Files"],
  ["flight", "Full Plan"],
  ["notes", "Notes"],
];

const ESTIMATOR_LIBRARY = {
  generic: {
    label: "General Project",
    unit: "sq ft",
    defaultMeasure: 180,
    sizes: { small: 120, medium: 180, large: 300 },
    materialRates: { budget: 18, standard: 28, premium: 42 },
    laborRates: { budget: 12, standard: 20, premium: 30 },
    permitRange: [100, 450],
    toolBudget: [150, 600],
    materials: ["Project materials", "Fasteners or hardware", "Safety gear", "Touch-up supplies"],
    tutorials: [
      { label: "YouTube project how-to search", url: "https://www.youtube.com/results?search_query=home+improvement+project+tutorial" },
      { label: "This Old House project guides", url: "https://www.thisoldhouse.com/search?q=home%20improvement" },
      { label: "Family Handyman project ideas", url: "https://www.familyhandyman.com/" },
    ],
    diyTips: ["Confirm your measurements before buying materials.", "Check local approvals before starting regulated work.", "Reserve 10% to 15% extra for waste and rework."],
  },
  deck: {
    label: "Deck", unit: "sq ft", defaultMeasure: 240, sizes: { small: 144, medium: 240, large: 400 },
    materialRates: { budget: 20, standard: 30, premium: 45 }, laborRates: { budget: 15, standard: 25, premium: 40 },
    permitRange: [150, 650], toolBudget: [250, 900],
    materials: ["Deck boards", "Joists and beams", "Concrete footings", "Fasteners and connectors", "Railings and stairs"],
    tutorials: [
      { label: "YouTube: how to build a deck", url: "https://www.youtube.com/results?search_query=how+to+build+a+deck" },
      { label: "This Old House deck guides", url: "https://www.thisoldhouse.com/search?q=deck" },
      { label: "Deck planning articles", url: "https://www.familyhandyman.com/project-category/deck-patio/" },
    ],
    diyTips: ["Verify footing depth requirements.", "Confirm guard and stair requirements before construction.", "Budget extra for hidden structural repairs."],
  },
  fence: {
    label: "Fence", unit: "linear ft", defaultMeasure: 180, sizes: { small: 80, medium: 180, large: 320 },
    materialRates: { budget: 14, standard: 21, premium: 34 }, laborRates: { budget: 10, standard: 16, premium: 24 },
    permitRange: [50, 250], toolBudget: [120, 420],
    materials: ["Posts", "Panels or pickets", "Concrete mix", "Gate hardware", "Exterior fasteners"],
    tutorials: [
      { label: "YouTube: install a fence", url: "https://www.youtube.com/results?search_query=how+to+install+a+fence" },
      { label: "Fence project search", url: "https://www.thisoldhouse.com/search?q=fence" },
      { label: "Family Handyman fence guides", url: "https://www.familyhandyman.com/project-category/outdoor/fences/" },
    ],
    diyTips: ["Check property lines before digging.", "Call utility locate services before setting posts.", "Plan for gate swing and slope changes."],
  },
  shed: {
    label: "Shed", unit: "sq ft", defaultMeasure: 120, sizes: { small: 80, medium: 120, large: 200 },
    materialRates: { budget: 28, standard: 40, premium: 58 }, laborRates: { budget: 18, standard: 28, premium: 42 },
    permitRange: [75, 350], toolBudget: [200, 650],
    materials: ["Foundation materials", "Wall framing lumber", "Roofing", "Siding", "Doors and hardware"],
    tutorials: [
      { label: "YouTube: build a shed", url: "https://www.youtube.com/results?search_query=how+to+build+a+shed" },
      { label: "Shed planning articles", url: "https://www.thisoldhouse.com/search?q=shed" },
      { label: "Family Handyman shed projects", url: "https://www.familyhandyman.com/project-category/outdoor/sheds/" },
    ],
    diyTips: ["Confirm setback rules and size thresholds.", "Use pressure-treated framing near ground contact.", "Plan ventilation and water management."],
  },
  kitchen: {
    label: "Kitchen", unit: "sq ft", defaultMeasure: 180, sizes: { small: 120, medium: 180, large: 280 },
    materialRates: { budget: 85, standard: 140, premium: 240 }, laborRates: { budget: 45, standard: 80, premium: 130 },
    permitRange: [150, 900], toolBudget: [250, 900],
    materials: ["Cabinetry", "Countertops", "Flooring", "Fixtures and appliances", "Electrical and plumbing supplies"],
    tutorials: [
      { label: "YouTube: kitchen remodel guides", url: "https://www.youtube.com/results?search_query=DIY+kitchen+remodel" },
      { label: "Kitchen planning articles", url: "https://www.thisoldhouse.com/search?q=kitchen%20remodel" },
      { label: "Family Handyman kitchen projects", url: "https://www.familyhandyman.com/project-category/kitchen/" },
    ],
    diyTips: ["Electrical and plumbing work may require licensed trades.", "Build a clear appliance and cabinet schedule early.", "Keep a larger contingency for hidden wall issues."],
  },
  bathroom: {
    label: "Bathroom", unit: "sq ft", defaultMeasure: 90, sizes: { small: 50, medium: 90, large: 150 },
    materialRates: { budget: 95, standard: 150, premium: 235 }, laborRates: { budget: 50, standard: 82, premium: 128 },
    permitRange: [120, 700], toolBudget: [220, 800],
    materials: ["Tile and backer board", "Fixtures", "Vanity or storage", "Waterproofing", "Plumbing and electrical supplies"],
    tutorials: [
      { label: "YouTube: bathroom remodel guides", url: "https://www.youtube.com/results?search_query=DIY+bathroom+remodel" },
      { label: "Bathroom project articles", url: "https://www.thisoldhouse.com/search?q=bathroom%20remodel" },
      { label: "Family Handyman bathroom projects", url: "https://www.familyhandyman.com/project-category/bathroom/" },
    ],
    diyTips: ["Waterproofing details matter as much as finish materials.", "Plan ventilation, moisture control, and fixture clearances.", "Expect additional time for tile layout and drying."],
  },
  roof: {
    label: "Roofing", unit: "sq ft", defaultMeasure: 1800, sizes: { small: 1200, medium: 1800, large: 2600 },
    materialRates: { budget: 4.5, standard: 6.5, premium: 10 }, laborRates: { budget: 3.5, standard: 5.5, premium: 8.5 },
    permitRange: [120, 600], toolBudget: [300, 900],
    materials: ["Shingles or roofing membrane", "Underlayment", "Flashing", "Fasteners", "Ventilation components"],
    tutorials: [
      { label: "YouTube: roof replacement guides", url: "https://www.youtube.com/results?search_query=DIY+roof+replacement" },
      { label: "Roofing information", url: "https://www.thisoldhouse.com/search?q=roof" },
      { label: "Family Handyman roofing articles", url: "https://www.familyhandyman.com/project-category/roof/" },
    ],
    diyTips: ["Roof work has high fall risk; safety gear is essential.", "Coordinate tear-off, weather windows, and disposal.", "Check warranty requirements before self-installation."],
  },
  addition: {
    label: "Addition", unit: "sq ft", defaultMeasure: 320, sizes: { small: 180, medium: 320, large: 600 },
    materialRates: { budget: 120, standard: 175, premium: 275 }, laborRates: { budget: 70, standard: 115, premium: 180 },
    permitRange: [250, 1500], toolBudget: [350, 1200],
    materials: ["Foundation", "Framing", "Windows and doors", "Roofing and siding", "Electrical, HVAC, and plumbing"],
    tutorials: [
      { label: "YouTube: room addition overview", url: "https://www.youtube.com/results?search_query=home+addition+planning" },
      { label: "Home addition articles", url: "https://www.thisoldhouse.com/search?q=addition" },
      { label: "General addition planning", url: "https://www.familyhandyman.com/" },
    ],
    diyTips: ["Most additions require full permit coordination.", "Expect design, structural, and mechanical review.", "Use extra contingency for scope growth."],
  },
};

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatDate(value) {
  if (!value) return "No target date";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "No target date"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function extractZip(value) {
  const match = String(value || "").match(/\b(19\d{3})\b/);
  return match?.[1] || "";
}

function mapEmbedUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";
  const offset = 0.012;
  const bbox = [lon - offset, lat - offset, lon + offset, lat + offset].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
}

function fileLabel(document) {
  const type = document.file_type || "";
  if (type.includes("image")) return "IMG";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("word")) return "DOC";
  return "FILE";
}

function projectVisual(project) {
  const text = `${project?.project_type || ""} ${project?.title || ""} ${project?.description || ""}`.toLowerCase();
  if (text.includes("deck") || text.includes("patio")) return "/category-deck.jpg";
  if (text.includes("kitchen")) return "/category-kitchen.jpg";
  if (text.includes("bath")) return "/category-bathroom.jpg";
  if (text.includes("addition")) return "/category-addition.jpg";
  if (text.includes("fence")) return "/category-fence.jpg";
  if (text.includes("shed") || text.includes("garage")) return "/category-shed.jpg";
  return "/home-planning-people.jpg";
}

function currency(value) {
  return `$${Math.round(value || 0).toLocaleString()}`;
}

function normalizeProjectType(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "generic";
  if (clean.includes("deck")) return "deck";
  if (clean.includes("fence")) return "fence";
  if (clean.includes("shed")) return "shed";
  if (clean.includes("kitchen")) return "kitchen";
  if (clean.includes("bath")) return "bathroom";
  if (clean.includes("roof")) return "roof";
  if (clean.includes("addition")) return "addition";
  return "generic";
}

function resolveMeasure(form, item) {
  const custom = Number(form.customMeasure);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return item.sizes?.[form.size] || item.defaultMeasure;
}

function calculateProjectEstimate(item, form, mode) {
  const quality = form.quality || "standard";
  const measure = resolveMeasure(form, item);
  const materials = measure * (item.materialRates?.[quality] || item.materialRates.standard || 0);
  const permitAllowance = ((item.permitRange?.[0] || 0) + (item.permitRange?.[1] || 0)) / 2;

  if (mode === "diy") {
    const toolAllowance = ((item.toolBudget?.[0] || 0) + (item.toolBudget?.[1] || 0)) / 2;
    const contingency = (materials + permitAllowance + toolAllowance) * 0.1;
    const total = materials + permitAllowance + toolAllowance + contingency;
    return {
      total,
      low: total * 0.9,
      high: total * 1.15,
      materials,
      permits: permitAllowance,
      tools: toolAllowance,
      labor: 0,
      contingency,
      measure,
    };
  }

  const labor = measure * (item.laborRates?.[quality] || item.laborRates.standard || 0);
  const contingency = (materials + labor + permitAllowance) * 0.12;
  const total = materials + labor + permitAllowance + contingency;
  return {
    total,
    low: total * 0.88,
    high: total * 1.18,
    materials,
    permits: permitAllowance,
    tools: 0,
    labor,
    contingency,
    measure,
  };
}


function guidedSetupQuestion(project) {
  if (!project?.project_type) {
    return "I have your project idea. What kind of project is this? For example: deck, kitchen remodel, bathroom, fence, shed, pool, addition, or something else.";
  }
  if (!project?.description) {
    return "In one sentence, what do you want the finished project to accomplish?";
  }
  if (!project?.address) {
    return "What is the project address? I need the location before I can guide the permit and local-contractor steps.";
  }
  return "I have enough information to start guiding this project. Ask me what to do next, or I can take you straight to the permit check.";
}

function recommendedProjectArea(project, permitChecked) {
  if (!project?.project_type || !project?.description || !project?.address) {
    return { tab: "pilot", label: "Continue with Su", description: "Su will collect the one missing detail needed to move forward." };
  }

  const next = String(project?.next_step || "").toLowerCase();
  if (!permitChecked || /permit|approval|jurisdiction|application/.test(next)) {
    return { tab: "permits", label: "Open Permits", description: "Check the governing authority and begin the permit path." };
  }
  if (/document|file|plan|estimate|contract|record/.test(next)) {
    return { tab: "documents", label: "Open Files", description: "Add or review the project documents needed for the next step." };
  }
  if (/contractor|professional|quote|bid/.test(next)) {
    return { tab: "contractors", label: "Find Contractors", description: "Open the local contractor finder for this saved project." };
  }
  if (/vision|photo|design|visual/.test(next)) {
    return { tab: "vision", label: "Open Visualize", description: "Use your property photo to work through the design direction." };
  }
  return { tab: "flight", label: "Open Full Plan", description: "See the next incomplete project step without filling out another form." };
}

export default function ProjectWorkspacePage() {
  const { id } = useParams();
  const router = useRouter();
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [guidedOnboarding, setGuidedOnboarding] = useState(false);
  const [showWorkspaceGuide, setShowWorkspaceGuide] = useState(false);
  const [openWaypoint, setOpenWaypoint] = useState(null);
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [applyingAction, setApplyingAction] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingWaypoint, setSavingWaypoint] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [permitForm, setPermitForm] = useState({ address: "", zip: "", project: "" });
  const [permitResult, setPermitResult] = useState(null);
  const [permitLoading, setPermitLoading] = useState(false);
  const [permitError, setPermitError] = useState("");
  const [estimateForm, setEstimateForm] = useState({
    projectType: "",
    size: "medium",
    quality: "standard",
    customMeasure: "",
  });

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  useEffect(() => {
    if (activeTab === "pilot") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab && NAV_ITEMS.some(([key]) => key === requestedTab)) {
      setActiveTab(requestedTab);
    }
    setGuidedOnboarding(params.get("onboarding") === "1");
  }, []);

  // The workspace guide is now opt-in so new users land directly on the task at hand.


  async function loadWorkspace() {
    setLoading(true);
    setError("");
    setNotice("");

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    if (!currentUser) {
      router.replace("/");
      return;
    }

    setUser(currentUser);

    const [projectResult, messageResult, documentResult, waypointResult] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).eq("user_id", currentUser.id).single(),
      supabase
        .from("conversations")
        .select("id,role,message,created_at")
        .eq("project_id", id)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", id)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_waypoints")
        .select("*")
        .eq("project_id", id)
        .eq("user_id", currentUser.id)
        .order("stage_order", { ascending: true }),
    ]);

    if (projectResult.error || !projectResult.data) {
      setError("This project could not be found.");
      setLoading(false);
      return;
    }

    setProject(projectResult.data);
    setNoteDraft(projectResult.data.notes || "");
    setPermitResult(projectResult.data.permit_research || null);
    setPermitForm({
      address: projectResult.data.address || "",
      zip: extractZip(projectResult.data.address || projectResult.data.location_label),
      project: projectResult.data.project_type || "",
    });
    setEstimateForm((current) => ({
      ...current,
      projectType: projectResult.data.project_type || current.projectType || "",
    }));
    setMessages(messageResult.data || []);
    setDocuments(documentResult.data || []);

    if (waypointResult.error) {
      setError("The Project Plan database update is missing. Run the included Sprint 2.2–2.3 SQL migration in Supabase, then refresh this page.");
      setWaypoints([]);
    } else if (!waypointResult.data?.length) {
      const seeded = await seedWaypoints(projectResult.data, currentUser);
      setWaypoints(seeded);
    } else {
      setWaypoints(waypointResult.data);
    }

    setLoading(false);
  }

  async function seedWaypoints(currentProject, currentUser) {
    const estimatedCompleted = clamp(Math.floor((currentProject.progress || 0) / (100 / STAGES.length)), 0, STAGES.length);
    const payload = STAGES.map((stage, index) => ({
      project_id: id,
      user_id: currentUser.id,
      stage_key: stage.key,
      stage_label: stage.label,
      stage_order: index,
      notes: "",
      due_date: null,
      completed: index < estimatedCompleted,
      updated_at: new Date().toISOString(),
    }));

    const { data, error: seedError } = await supabase
      .from("project_waypoints")
      .upsert(payload, { onConflict: "project_id,stage_key" })
      .select("*")
      .order("stage_order", { ascending: true });

    if (seedError) {
      setError(seedError.message);
      return [];
    }

    return data || [];
  }

  function waypointFor(index, source = waypoints) {
    const stage = STAGES[index];
    return (
      source.find((item) => item.stage_key === stage.key) || {
        stage_key: stage.key,
        stage_label: stage.label,
        stage_order: index,
        notes: "",
        due_date: null,
        completed: false,
      }
    );
  }

  function followAssistantNavigation(navigation) {
    if (!navigation) return;

    if (navigation.tab && NAV_ITEMS.some(([key]) => key === navigation.tab)) {
      setActiveTab(navigation.tab);
      setGuidedOnboarding(false);
      try {
        window.history.replaceState({}, "", `/project/${id}?tab=${navigation.tab}`);
      } catch {
        // Navigation still works through local state if history replacement is unavailable.
      }
      return;
    }

    if (navigation.href) router.push(navigation.href);
  }

  async function sendMessage(event) {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft || sending || !user) return;

    setDraft("");
    setError("");
    setSending(true);

    const requestStamp = Date.now();
    const optimistic = {
      id: `local-${requestStamp}`,
      role: "user",
      message: cleanDraft,
      created_at: new Date().toISOString(),
    };
    const streamingAssistantId = `stream-${requestStamp}`;
    const streamingAssistant = {
      id: streamingAssistantId,
      role: "assistant",
      message: "",
      created_at: new Date().toISOString(),
      streaming: true,
    };

    setMessages((current) => [...current, optimistic, streamingAssistant]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData?.session?.access_token}`,
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          projectId: id,
          message: cleanDraft,
          stream: true,
          clientContext: {
            guidedOnboarding,
            estimator: {
              projectType: estimateProject.label,
              enteredProjectType: estimateType,
              quality: estimateForm.quality,
              sizeSelection: estimateForm.size,
              measure: Math.round(estimateMeasure * 100) / 100,
              unit: estimateProject.unit,
              professional: {
                low: Math.round(professionalEstimate.low),
                midpoint: Math.round(professionalEstimate.total),
                high: Math.round(professionalEstimate.high),
                materials: Math.round(professionalEstimate.materials),
                labor: Math.round(professionalEstimate.labor),
                permits: Math.round(professionalEstimate.permits),
                contingency: Math.round(professionalEstimate.contingency),
              },
              diy: {
                low: Math.round(diyEstimate.low),
                midpoint: Math.round(diyEstimate.total),
                high: Math.round(diyEstimate.high),
                materials: Math.round(diyEstimate.materials),
                tools: Math.round(diyEstimate.tools),
                permits: Math.round(diyEstimate.permits),
                contingency: Math.round(diyEstimate.contingency),
              },
              disclaimer: "Planning estimate only; not a contractor bid, permit fee quote, or cost guarantee.",
            },
          },
        }),
      });

      const data = await readAssistantStream(response, {
        onDelta: (delta) => {
          setMessages((current) => current.map((entry) =>
            entry.id === streamingAssistantId
              ? { ...entry, message: `${entry.message || ""}${delta}` }
              : entry
          ));
        },
      });

      setMessages((current) => current.map((entry) =>
        entry.id === streamingAssistantId
          ? { ...data.message, action: data.action || null, navigation: data.navigation || null, streaming: false }
          : entry
      ));
      if (data.project) setProject(data.project);
      if (data.navigation?.auto) {
        window.setTimeout(() => followAssistantNavigation(data.navigation), 350);
      }
    } catch (requestError) {
      setError(requestError.message || "Project Assistant could not respond.");
      setMessages((current) => current.filter((message) =>
        message.id !== optimistic.id && message.id !== streamingAssistantId
      ));
      setDraft(cleanDraft);
    } finally {
      setSending(false);
    }
  }

  async function applyAssistantAction(entry) {
    if (!entry?.action || applyingAction) return;

    setApplyingAction(entry.id);
    setError("");
    setNotice("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData?.session?.access_token}`,
        },
        body: JSON.stringify({ projectId: id, confirmAction: entry.action, guidedOnboarding }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Su could not apply that change.");

      setMessages((current) => [
        ...current.map((item) =>
          item.id === entry.id ? { ...item, action: null, actionApplied: true } : item
        ),
        { ...data.message, navigation: data.navigation || null },
      ]);
      if (data.project) {
        setProject(data.project);
        setNoteDraft(data.project.notes || "");
      }
      if (Array.isArray(data.waypoints)) setWaypoints(data.waypoints);
      setNotice(data.message?.message || "Su updated the project.");
    } catch (actionError) {
      setError(actionError.message || "Su could not apply that change.");
    } finally {
      setApplyingAction("");
    }
  }

  function dismissAssistantAction(entryId) {
    setMessages((current) =>
      current.map((item) => (item.id === entryId ? { ...item, action: null, actionDismissed: true } : item))
    );
  }

  async function saveNotes() {
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");

    const { data, error: saveError } = await supabase
      .from("projects")
      .update({ notes: noteDraft, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (saveError) {
      setError(saveError.message);
    } else {
      setProject(data);
      setNotice("Project notes saved.");
    }

    setSaving(false);
  }

  async function saveWaypoint(index, updates, successMessage = "Project Plan updated.") {
    if (!user || !project) return;

    const current = waypointFor(index);
    const stage = STAGES[index];
    const key = stage.key;

    setSavingWaypoint(key);
    setError("");
    setNotice("");

    const payload = {
      project_id: id,
      user_id: user.id,
      stage_key: stage.key,
      stage_label: stage.label,
      stage_order: index,
      notes: current.notes || "",
      due_date: current.due_date || null,
      completed: Boolean(current.completed),
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error: waypointError } = await supabase
      .from("project_waypoints")
      .upsert(payload, { onConflict: "project_id,stage_key" })
      .select()
      .single();

    if (waypointError) {
      setError(waypointError.message);
      setSavingWaypoint("");
      return;
    }

    const nextWaypoints = [...waypoints.filter((item) => item.stage_key !== key), data].sort(
      (a, b) => a.stage_order - b.stage_order
    );
    setWaypoints(nextWaypoints);

    const completedCount = nextWaypoints.filter((item) => item.completed).length;
    const firstIncompleteIndex = STAGES.findIndex(
      (stageItem) => !nextWaypoints.find((item) => item.stage_key === stageItem.key)?.completed
    );
    const nextIndex = firstIncompleteIndex === -1 ? STAGES.length - 1 : firstIncompleteIndex;
    const allComplete = completedCount === STAGES.length;
    const progress = Math.round((completedCount / STAGES.length) * 100);

    const projectUpdate = {
      progress,
      status: allComplete ? "Completion" : STAGES[nextIndex].label,
      next_step: allComplete
        ? "Review final records and close the project."
        : STAGES[nextIndex].description,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProject, error: projectError } = await supabase
      .from("projects")
      .update(projectUpdate)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (projectError) {
      setError(projectError.message);
    } else {
      setProject(updatedProject);
      setNotice(successMessage);
    }

    setSavingWaypoint("");
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) return;
    if (file.size > 15 * 1024 * 1024) {
      setError("Files must be 15 MB or smaller.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${user.id}/${id}/${Date.now()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: recordError } = await supabase
        .from("project_documents")
        .insert({
          project_id: id,
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();
      if (recordError) throw recordError;

      setDocuments((current) => [data, ...current]);
      setNotice(`${file.name} added to Files & Documents.`);
    } catch (uploadError) {
      setError(uploadError.message);
    }

    setUploading(false);
  }

  async function openDocument(document) {
    const { data, error: signedError } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(document.file_path, 60);

    if (signedError) {
      setError(signedError.message);
    } else {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function deleteDocument(document) {
    if (!window.confirm(`Remove ${document.file_name}?`)) return;

    setError("");
    setNotice("");

    const { error: storageError } = await supabase.storage
      .from("project-documents")
      .remove([document.file_path]);

    if (storageError) {
      setError(storageError.message);
      return;
    }

    const { error: recordError } = await supabase
      .from("project_documents")
      .delete()
      .eq("id", document.id)
      .eq("user_id", user.id);

    if (recordError) {
      setError(recordError.message);
      return;
    }

    setDocuments((current) => current.filter((item) => item.id !== document.id));
    setNotice(`${document.file_name} removed.`);
  }

  async function runPermitLookup(event) {
    event?.preventDefault();
    if (!user || !project || permitLoading) return;

    const address = permitForm.address.trim();
    const zip = permitForm.zip.trim();
    const projectType = permitForm.project.trim();

    if (!address || !zip || !projectType) {
      setPermitError("Enter the project address, five-digit ZIP code, and project type.");
      return;
    }

    setPermitLoading(true);
    setPermitError("");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, zip, project: projectType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Permit guidance could not complete the lookup.");

      const checkedAt = new Date().toISOString();
      const projectUpdate = {
        address: result.matchedAddress || address,
        location_label: result.matchedAddress || address,
        project_type: projectType,
        jurisdiction: result.jurisdiction || result.title,
        latitude: result.coordinates?.latitude ?? project.latitude ?? null,
        longitude: result.coordinates?.longitude ?? project.longitude ?? null,
        permit_research: result,
        permit_checked_at: checkedAt,
        next_step: "Review the permit checklist and confirm requirements with the governing authority.",
        status: project.status === "Getting Started" ? "Permits" : project.status,
        updated_at: checkedAt,
      };

      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update(projectUpdate)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProject(updatedProject);
      setPermitResult(result);
      setPermitForm((current) => ({
        ...current,
        address: result.matchedAddress || address,
      }));
      setNotice("Permit guidance saved to this project.");
    } catch (lookupError) {
      setPermitError(lookupError.message || "Permit guidance is temporarily unavailable.");
    } finally {
      setPermitLoading(false);
    }
  }

  function dismissWorkspaceGuide() {
    try {
      window.localStorage.setItem("project-pilot-workspace-guide-v1", "complete");
    } catch {
      // The guide can still close when browser storage is unavailable.
    }
    setShowWorkspaceGuide(false);
  }

  function goToWorkspaceStep(tab) {
    dismissWorkspaceGuide();
    setActiveTab(tab);
  }

  const setupItems = useMemo(
    () => [
      ["Project type", project?.project_type],
      ["Description", project?.description],
      ["Location", project?.address],
      ["Project role", project?.project_role],
      ["Timeline", project?.target_timeline],
      ["Budget", project?.budget ? `$${Number(project.budget).toLocaleString()}` : ""],
    ],
    [project]
  );

  const setupCount = setupItems.filter(([, value]) => value).length;
  const completedCount = waypoints.filter((item) => item.completed).length;
  const currentStageIndex = useMemo(() => {
    const index = STAGES.findIndex(
      (stage) => !waypoints.find((item) => item.stage_key === stage.key)?.completed
    );
    return index === -1 ? STAGES.length - 1 : index;
  }, [waypoints]);

  const nextWaypoint = STAGES[currentStageIndex];
  const nextWaypointRecord = waypointFor(currentStageIndex);
  const readiness = clamp(project?.progress || 0, 0, 100);
  const permitChecked = Boolean(permitResult?.jurisdictionStatus);
  const permitMap = mapEmbedUrl(
    permitResult?.coordinates?.latitude ?? project?.latitude,
    permitResult?.coordinates?.longitude ?? project?.longitude
  );
  const estimateType = estimateForm.projectType || permitForm.project || project?.project_type || "generic";
  const estimateKey = normalizeProjectType(estimateType);
  const estimateProject = ESTIMATOR_LIBRARY[estimateKey] || ESTIMATOR_LIBRARY.generic;
  const estimateMeasure = resolveMeasure(estimateForm, estimateProject);
  const professionalEstimate = calculateProjectEstimate(estimateProject, estimateForm, "pro");
  const diyEstimate = calculateProjectEstimate(estimateProject, estimateForm, "diy");
  const recommendedArea = recommendedProjectArea(project, permitChecked);

  if (loading) {
    return <main className="workspaceLoading">Opening your project…</main>;
  }

  if (!project) {
    return <main className="workspaceLoading">{error || "Project unavailable."}</main>;
  }

  return (
    <main className="projectWorkspace">
      {showWorkspaceGuide && (
        <div className="workspaceGuideOverlay" role="dialog" aria-modal="true" aria-labelledby="workspaceGuideTitle">
          <div className="workspaceGuideModal">
            <button className="workspaceGuideClose" type="button" onClick={dismissWorkspaceGuide} aria-label="Close project guide">×</button>
            <p>YOUR PROJECT WORKSPACE</p>
            <h2 id="workspaceGuideTitle">You can let Su drive the project.</h2>
            <span>You do not need to understand every tab. Ask Su what to do next, answer one question at a time, and use the Take me there button when Su identifies the next screen.</span>
            <div className="workspaceGuideSteps">
              <button type="button" onClick={() => goToWorkspaceStep("pilot")}><b>1</b><div><strong>Ask Su</strong><small>Say what you are trying to accomplish or what is confusing.</small></div></button>
              <button type="button" onClick={() => goToWorkspaceStep("overview")}><b>2</b><div><strong>Follow one next step</strong><small>The project always keeps one recommended action visible.</small></div></button>
              <button type="button" onClick={() => goToWorkspaceStep("permits")}><b>3</b><div><strong>Only open tools when needed</strong><small>Su can take you to permits, files, contractors, visualization, or the full plan.</small></div></button>
            </div>
            <button className="workspaceGuidePrimary" type="button" onClick={() => goToWorkspaceStep("pilot")}>Let Su Guide Me</button>
            <small>You can reopen this explanation from the “How this works” button.</small>
          </div>
        </div>
      )}

      <aside className="projectRail">
        <button className="backButton" onClick={() => router.push("/dashboard")}>← Dashboard</button>

        <a href="/dashboard" className="pilotMark pilotMarkImage" aria-label="Project Pilot dashboard">
          <img src="/project-pilot-approved-logo.png" alt="Project Pilot" />
        </a>

        <div className="projectSummary">
          <small>CURRENT PROJECT</small>
          <h1>{project.title}</h1>
          <p>{project.address || project.location_label || "Location not added"}</p>
          <span>{project.status}</span>
        </div>

        <nav className="workspaceNav" aria-label="Project workspace navigation">
          {NAV_ITEMS.slice(0, 6).map(([key, label]) => (
            <button
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
              key={key}
            >
              {label}
            </button>
          ))}
          <details className="workspaceMoreNav" open={NAV_ITEMS.slice(6).some(([key]) => key === activeTab)}>
            <summary>More</summary>
            {NAV_ITEMS.slice(6).map(([key, label]) => (
              <button
                className={activeTab === key ? "active" : ""}
                onClick={() => setActiveTab(key)}
                key={key}
              >
                {label}
              </button>
            ))}
          </details>
        </nav>

        <div className="railProgress">
          <small>PROJECT PROGRESS</small>
          <strong>{readiness}%</strong>
          <div><span style={{ width: `${readiness}%` }} /></div>
          <p>{completedCount} of {STAGES.length} plan steps complete</p>
        </div>
      </aside>

      <section className="workspaceMain">
        <header className="workspaceHeader">
          <div>
            <p>PROJECT WORKSPACE</p>
            <h2>{project.title}</h2>
            <span>{project.next_step}</span>
          </div>
          <div className="workspaceHeaderActions">
            <button className="secondaryAction" onClick={() => setShowWorkspaceGuide(true)}>How this works</button>
            <button onClick={() => setActiveTab("pilot")}>Ask Su</button>
          </div>
        </header>

        {error && <div className="workspaceAlert errorAlert">{error}</div>}
        {notice && <div className="workspaceAlert successAlert">{notice}</div>}

        {activeTab === "overview" && (
          <div className="workspaceContent overviewContent simpleOverviewContent">
            <section className="guidedNextStepHero">
              <div className="guidedNextStepCopy">
                <p>YOUR NEXT STEP</p>
                <h1>{project.next_step || recommendedArea.description}</h1>
                <span>You do not need to decide which Project Pilot tool to use. This button opens the place where you can complete the next action.</span>
                <div className="guidedNextStepActions">
                  <button type="button" onClick={() => recommendedArea.tab === "contractors" ? router.push(`/contractors?project=${project.id}`) : setActiveTab(recommendedArea.tab)}>{recommendedArea.label} →</button>
                  <button type="button" className="guidedSecondary" onClick={() => setActiveTab("pilot")}>Ask Su instead</button>
                </div>
              </div>
              <div className="guidedProgressBadge">
                <strong>{readiness}%</strong>
                <span>project progress</span>
              </div>
            </section>

            <section className="simpleProjectSnapshot">
              <div className="simpleSnapshotHeading">
                <div><p>PROJECT SNAPSHOT</p><h2>Only the information that matters right now.</h2></div>
                <button type="button" onClick={() => setActiveTab("pilot")}>Change something with Su</button>
              </div>
              <div className="simpleSnapshotGrid">
                <div><span>Project</span><strong>{project.project_type || "Su will help identify it"}</strong></div>
                <div><span>Location</span><strong>{project.address || "Still needed"}</strong></div>
                <div><span>Status</span><strong>{project.status || "Getting Started"}</strong></div>
                <div><span>Files</span><strong>{documents.length}</strong></div>
              </div>
            </section>

            <section className="simpleToolShelf">
              <div><p>TOOLS</p><h2>Open these only when you need them.</h2></div>
              <div className="simpleToolButtons">
                <button type="button" onClick={() => setActiveTab("permits")}><strong>Permits</strong><span>Requirements and applications</span></button>
                <button type="button" onClick={() => setActiveTab("vision")}><strong>Visualize</strong><span>See the project on your property</span></button>
                <button type="button" onClick={() => router.push(`/contractors?project=${project.id}`)}><strong>Contractors</strong><span>Find local professionals</span></button>
                <button type="button" onClick={() => setActiveTab("documents")}><strong>Files</strong><span>Plans, photos, estimates, approvals</span></button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "vision" && (
          <div className="workspaceContent">
            <ProjectVision project={project} user={user} />
          </div>
        )}

        {activeTab === "flight" && (
          <div className="workspaceContent flightContent">
            <div className="sectionIntro splitIntro">
              <div>
                <p>STEP-BY-STEP PROJECT PLAN</p>
                <h1>A clear path from the first idea to completion.</h1>
                <span>Open a step to add notes, set a target date, or mark it complete.</span>
              </div>
              <div className="flightSummaryPill">
                <strong>{completedCount}/{STAGES.length}</strong>
                <span>steps complete</span>
              </div>
            </div>

            <div className="fullFlightPlan">
              {STAGES.map((stage, index) => {
                const waypoint = waypointFor(index);
                const expanded = openWaypoint === index;
                const current = index === currentStageIndex && !waypoint.completed;
                const savingThis = savingWaypoint === stage.key;

                return (
                  <article
                    className={`${waypoint.completed ? "complete" : ""} ${current ? "current" : ""}`}
                    key={stage.key}
                  >
                    <button
                      className="waypointHead"
                      onClick={() => setOpenWaypoint(expanded ? null : index)}
                      aria-expanded={expanded}
                    >
                      <div className="waypointNumber">{waypoint.completed ? "✓" : index + 1}</div>
                      <div className="waypointCopy">
                        <small>{waypoint.completed ? "COMPLETED" : current ? "CURRENT STEP" : "UPCOMING"}</small>
                        <h3>{stage.label}</h3>
                        <p>{stage.description}</p>
                      </div>
                      <div className="waypointMeta">
                        <span>{formatDate(waypoint.due_date)}</span>
                        <b>{expanded ? "−" : "+"}</b>
                      </div>
                    </button>

                    {expanded && (
                      <div className="waypointEditor">
                        <label className="waypointNotesField">
                          <span>Step notes</span>
                          <textarea
                            value={waypoint.notes || ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              setWaypoints((currentItems) => {
                                const existing = waypointFor(index, currentItems);
                                const replacement = { ...existing, notes: value };
                                return [...currentItems.filter((item) => item.stage_key !== stage.key), replacement].sort(
                                  (a, b) => a.stage_order - b.stage_order
                                );
                              });
                            }}
                            onBlur={(event) => saveWaypoint(index, { notes: event.target.value }, `${stage.label} notes saved.`)}
                            placeholder="Add requirements, decisions, contacts, questions, or next actions…"
                          />
                        </label>

                        <label>
                          <span>Target date</span>
                          <input
                            type="date"
                            value={waypoint.due_date || ""}
                            onChange={(event) => saveWaypoint(index, { due_date: event.target.value || null }, `${stage.label} target date saved.`)}
                          />
                        </label>

                        <button
                          className={waypoint.completed ? "undoWaypoint" : "completeWaypoint"}
                          onClick={() => saveWaypoint(
                            index,
                            { completed: !waypoint.completed },
                            waypoint.completed ? `${stage.label} reopened.` : `${stage.label} completed.`
                          )}
                          disabled={savingThis}
                        >
                          {savingThis ? "Saving…" : waypoint.completed ? "Mark Incomplete" : "Mark Step Complete"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "pilot" && (
          <div className="pilotPanel">
            {guidedOnboarding && (
              <div className="guidedOnboardingBanner">
                <strong>SU GUIDED SETUP</strong>
                <span>No project form. Answer one question at a time and Su will organize the project for you.</span>
              </div>
            )}
            <header className="pilotHeader">
              <img className="pilotVisualAvatar" src="/pilot-guide.jpg" alt="Project Pilot guide" />
              <div>
                <p>PROJECT ASSISTANT</p>
                <h2>Plain-language project help</h2>
              </div>
              <span className="onlineStatus">Su AI connected</span>
            </header>

            <div className="messageList">
              {!messages.length && (
                <article className="message assistant">
                  <div className="messageAvatar">P</div>
                  <div>
                    <strong>Project Assistant</strong>
                    <p>{guidedOnboarding ? guidedSetupQuestion(project) : "Tell me what you are trying to do. I can explain it, organize project details, and take you to the right screen for the next step."}</p>
                  </div>
                </article>
              )}

              {messages.map((entry) => (
                <article className={`message ${entry.role === "assistant" ? "assistant" : "user"}`} key={entry.id}>
                  <div className="messageAvatar">{entry.role === "assistant" ? "S" : "Y"}</div>
                  <div>
                    <strong>{entry.role === "assistant" ? "Su" : "You"}</strong>
                    <p>{entry.message || (entry.streaming ? "Su is reviewing your project…" : "")}{entry.streaming && entry.message ? <span aria-hidden="true"> ▍</span> : null}</p>
                    {entry.action && (
                      <div className="assistantActionCard">
                        <small>SU CAN DO THIS FOR YOU</small>
                        <h3>{entry.action.summary}</h3>
                        <div className="assistantActionDetails">
                          {entry.action.type === "project_update" && Object.entries(entry.action.changes || {}).map(([field, value]) => (
                            <div key={field}>
                              <span>{field.replaceAll("_", " ")}</span>
                              <strong>{field === "budget" ? `$${Number(value).toLocaleString()}` : String(value)}</strong>
                            </div>
                          ))}
                          {entry.action.type === "waypoint_update" && (
                            <>
                              <div><span>Project Plan stage</span><strong>{entry.action.stageKey}</strong></div>
                              {typeof entry.action.completed === "boolean" && <div><span>Status</span><strong>{entry.action.completed ? "Complete" : "Incomplete"}</strong></div>}
                              {entry.action.dueDate && <div><span>Due date</span><strong>{formatDate(entry.action.dueDate)}</strong></div>}
                              {entry.action.notes && <div><span>Notes</span><strong>{entry.action.notes}</strong></div>}
                            </>
                          )}
                        </div>
                        <div className="assistantActionButtons">
                          <button
                            type="button"
                            onClick={() => applyAssistantAction(entry)}
                            disabled={Boolean(applyingAction)}
                          >
                            {applyingAction === entry.id ? "Saving…" : guidedOnboarding ? "Save & Continue" : "Apply changes"}
                          </button>
                          <button
                            type="button"
                            className="assistantActionCancel"
                            onClick={() => dismissAssistantAction(entry.id)}
                            disabled={Boolean(applyingAction)}
                          >
                            Not now
                          </button>
                        </div>
                        <span className="assistantActionSafety">Nothing changes until you approve it.</span>
                      </div>
                    )}
                    {entry.navigation && !entry.streaming && (
                      <div className="assistantNavigationCard">
                        <small>NEXT STEP READY</small>
                        <div>
                          <strong>{entry.navigation.label}</strong>
                          <span>{entry.navigation.description || "Open the exact Project Pilot screen for this step."}</span>
                        </div>
                        <button type="button" onClick={() => followAssistantNavigation(entry.navigation)}>
                          Take me there →
                        </button>
                      </div>
                    )}
                    {entry.actionApplied && <span className="assistantActionApplied">✓ Change applied</span>}
                  </div>
                </article>
              ))}

              <div ref={bottomRef} />
            </div>

            <div className="composerArea">
              <div className="assistantPromptChips" aria-label="Common questions">
                <button type="button" onClick={() => setDraft("What should I do next? Take me to the right place if there is a screen I need.")}>What do I do next?</button>
                <button type="button" onClick={() => setDraft("Take me to the permit step I need for this project.")}>Take me to permits</button>
                <button type="button" onClick={() => setDraft("What information or documents am I missing, and where do I add them?")}>What am I missing?</button>
              </div>
              <form onSubmit={sendMessage}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Ask a question or describe your project…"
                  rows={2}
                />
                <button disabled={sending || !draft.trim()}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
              <small>Su uses the saved project to guide one step at a time. When a Project Pilot screen is needed, use “Take me there” instead of hunting through the menus.</small>
            </div>
          </div>
        )}

        {activeTab === "permits" && (
          <div className="workspaceContent permitContent simplePermitContent">
            <section className={`permitSimpleStart ${permitChecked ? "ready" : ""}`}>
              <div>
                <p>PERMITS — ONE STEP AT A TIME</p>
                <h1>{permitChecked ? "Your permit route is ready." : "First, match this project to the right permit office."}</h1>
                <span>
                  {permitChecked
                    ? "Continue into Permit Autopilot below. It asks one question at a time and keeps the application process organized."
                    : "Project Pilot already uses the saved project details. You only need to add something below if it is missing."}
                </span>
              </div>

              {!permitChecked && (
                <form className="permitSimpleForm" onSubmit={runPermitLookup}>
                  <div className="permitSimpleFacts">
                    <div><small>PROJECT</small><strong>{permitForm.project || "Still needed"}</strong></div>
                    <div><small>PROPERTY</small><strong>{permitForm.address || "Still needed"}</strong></div>
                  </div>

                  {!permitForm.project && (
                    <label>
                      <span>What kind of project is this?</span>
                      <input value={permitForm.project} onChange={(event) => setPermitForm((current) => ({ ...current, project: event.target.value }))} placeholder="Deck, fence, addition…" />
                    </label>
                  )}
                  {!permitForm.address && (
                    <label>
                      <span>Project address</span>
                      <input value={permitForm.address} onChange={(event) => setPermitForm((current) => ({ ...current, address: event.target.value }))} placeholder="Street address, city, state" />
                    </label>
                  )}
                  {!permitForm.zip && (
                    <label>
                      <span>ZIP code</span>
                      <input inputMode="numeric" maxLength={5} value={permitForm.zip} onChange={(event) => setPermitForm((current) => ({ ...current, zip: event.target.value.replace(/\D/g, "").slice(0, 5) }))} placeholder="19968" />
                    </label>
                  )}

                  {permitError && <div className="permitInlineError">{permitError}</div>}
                  <button type="submit" disabled={permitLoading || !permitForm.address.trim() || !/^\d{5}$/.test(permitForm.zip) || !permitForm.project.trim()}>
                    {permitLoading ? "Checking…" : "Check My Permit Route"}
                  </button>
                  <button className="permitAskSuButton" type="button" onClick={() => setActiveTab("pilot")}>I need help with this</button>
                </form>
              )}

              {permitChecked && (
                <div className="permitSimpleReady">
                  <span>✓</span>
                  <div><small>MATCHED AUTHORITY</small><strong>{permitResult?.jurisdiction || project.jurisdiction || "Permit authority matched"}</strong></div>
                  <button type="button" onClick={() => setActiveTab("pilot")}>Ask Su a permit question</button>
                </div>
              )}
            </section>

            <FullServicePermitStart
              project={project}
              user={user}
              onOpenAssistant={() => setActiveTab("pilot")}
              onOpenDetails={() => document.getElementById("permit-details")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              onProjectUpdated={(updatedProject) => setProject(updatedProject)}
            />

            <details className="permitDetailsDisclosure" id="permit-details">
              <summary>
                <span>Permit details</span>
                <small>Open the guided interview, application packet, and technical permit tools only when you need them.</small>
              </summary>
              <div className="permitDetailsDisclosureBody">
                <PermitAutopilot
                  project={project}
                  user={user}
                  permitResult={permitResult}
                  onOpenDocuments={() => setActiveTab("documents")}
                  onProjectUpdated={(updatedProject) => setProject(updatedProject)}
                />

                {permitResult && (
                  <PermitApplicationBuilder
                    project={project}
                    user={user}
                    permitResult={permitResult}
                  />
                )}
              </div>
            </details>
          </div>
        )}

        {activeTab === "contractors" && (
          <section className="workspacePanel contractorProjectPanel">
            <div className="panelHeading">
              <div>
                <p>LOCAL CONTRACTOR SEARCH</p>
                <h2>Find real professionals near this project.</h2>
              </div>
            </div>
            <div className="contractorProjectBody">
              <div>
                <h3>Project Pilot searches around your saved project location.</h3>
                <p>Browse real nearby businesses on an interactive Google Map for the type of work your project needs, then use Project Pilot’s Delaware verification links before hiring.</p>
                <ul>
                  <li>The interactive map uses Google Maps Embed and does not require contractors to be affiliated with Project Pilot.</li>
                  <li>Project Pilot uses the project type and saved location to build the search automatically.</li>
                  <li>Business details stay inside the Google Maps interface instead of being copied into Project Pilot.</li>
                  <li>Always verify registration, licensing, insurance, references, and project fit before hiring.</li>
                </ul>
              </div>
              <button type="button" onClick={() => router.push(`/contractors?project=${project.id}`)}>Find Local Contractors</button>
            </div>
          </section>
        )}

        {activeTab === "documents" && (
          <div className="workspaceContent">
            <div className="sectionIntro splitIntro">
              <div>
                <p>FILES & DOCUMENTS</p>
                <h1>Every important file in one place.</h1>
                <span>Upload PDFs, plans, photos, estimates, contracts, or notes up to 15 MB.</span>
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "+ Add Document"}
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                onChange={uploadDocument}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx"
              />
            </div>

            {!documents.length ? (
              <div className="emptyBinder">
                <div className="emptyBinderIcon">+</div>
                <strong>No files added yet.</strong>
                <span>Add a plan, photo, estimate, contract, or project record to keep this project organized.</span>
                <button onClick={() => fileRef.current?.click()}>Upload First Document</button>
              </div>
            ) : (
              <div className="documentGrid">
                {documents.map((document) => (
                  <article key={document.id}>
                    <div className="fileIcon">{fileLabel(document)}</div>
                    <h3>{document.file_name}</h3>
                    <p>
                      {(document.file_size / 1024 / 1024).toFixed(2)} MB · {new Date(document.created_at).toLocaleDateString()}
                    </p>
                    <div>
                      <button onClick={() => openDocument(document)}>Open</button>
                      <button className="deleteFile" onClick={() => deleteDocument(document)}>Remove</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="workspaceContent">
            <div className="sectionIntro">
              <p>PROJECT NOTES</p>
              <h1>Keep decisions and reminders attached to the project.</h1>
              <span>These notes save to your account and remain available when you return.</span>
            </div>

            <div className="notesEditor">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add project decisions, questions, contacts, measurements, or reminders…"
              />
              <div>
                <small>{noteDraft.length} characters</small>
                <button onClick={saveNotes} disabled={saving}>
                  {saving ? "Saving…" : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
