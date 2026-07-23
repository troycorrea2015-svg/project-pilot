"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
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
  ["overview", "Command Center"],
  ["flight", "Flight Plan"],
  ["pilot", "Pilot"],
  ["permits", "Permit Intelligence"],
  ["documents", "Project Binder"],
  ["notes", "Notes"],
];

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
  const [openWaypoint, setOpenWaypoint] = useState(null);
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingWaypoint, setSavingWaypoint] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [permitForm, setPermitForm] = useState({ address: "", zip: "", project: "" });
  const [permitResult, setPermitResult] = useState(null);
  const [permitLoading, setPermitLoading] = useState(false);
  const [permitError, setPermitError] = useState("");

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  useEffect(() => {
    if (activeTab === "pilot") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending, activeTab]);

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
    setMessages(messageResult.data || []);
    setDocuments(documentResult.data || []);

    if (waypointResult.error) {
      setError("The Flight Plan database update is missing. Run the included Sprint 2.2–2.3 SQL migration in Supabase, then refresh this page.");
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

  async function sendMessage(event) {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft || sending || !user) return;

    setDraft("");
    setError("");
    setSending(true);

    const optimistic = {
      id: `local-${Date.now()}`,
      role: "user",
      message: cleanDraft,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData?.session?.access_token}`,
        },
        body: JSON.stringify({ projectId: id, message: cleanDraft }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pilot could not respond.");

      setMessages((current) => [...current, data.message]);
      if (data.project) setProject(data.project);
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setDraft(cleanDraft);
    } finally {
      setSending(false);
    }
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

  async function saveWaypoint(index, updates, successMessage = "Flight Plan updated.") {
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
      setNotice(`${file.name} added to the Project Binder.`);
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
      if (!response.ok) throw new Error(result.error || "Permit Intelligence could not complete the lookup.");

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
      setNotice("Permit Intelligence saved to this project.");
    } catch (lookupError) {
      setPermitError(lookupError.message || "Permit Intelligence is temporarily unavailable.");
    } finally {
      setPermitLoading(false);
    }
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

  if (loading) {
    return <main className="workspaceLoading">Opening your project…</main>;
  }

  if (!project) {
    return <main className="workspaceLoading">{error || "Project unavailable."}</main>;
  }

  return (
    <main className="projectWorkspace">
      <aside className="projectRail">
        <button className="backButton" onClick={() => router.push("/dashboard")}>← Dashboard</button>

        <div className="pilotMark">
          <span>P</span>
          <strong>Project Pilot</strong>
        </div>

        <div className="projectSummary">
          <small>CURRENT PROJECT</small>
          <h1>{project.title}</h1>
          <p>{project.address || project.location_label || "Location not added"}</p>
          <span>{project.status}</span>
        </div>

        <nav className="workspaceNav" aria-label="Project workspace navigation">
          {NAV_ITEMS.map(([key, label]) => (
            <button
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
              key={key}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="railProgress">
          <small>PROJECT READINESS</small>
          <strong>{readiness}%</strong>
          <div><span style={{ width: `${readiness}%` }} /></div>
          <p>{completedCount} of {STAGES.length} waypoints complete</p>
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
            <button className="secondaryAction" onClick={() => setActiveTab("flight")}>Open Flight Plan</button>
            <button onClick={() => setActiveTab("pilot")}>Continue with Pilot</button>
          </div>
        </header>

        {error && <div className="workspaceAlert errorAlert">{error}</div>}
        {notice && <div className="workspaceAlert successAlert">{notice}</div>}

        {activeTab === "overview" && (
          <div className="workspaceContent overviewContent">
            <section className="commandHero">
              <div className="commandHeroCopy">
                <p>CURRENT OBJECTIVE</p>
                <h1>{project.next_step}</h1>
                <span>
                  Pilot keeps the project course, documents, decisions, and next actions connected in one workspace.
                </span>
                <div className="commandHeroActions">
                  <button onClick={() => setActiveTab("flight")}>Review Flight Plan</button>
                  <button className="heroSecondary" onClick={() => setActiveTab("pilot")}>Ask Pilot</button>
                </div>
              </div>
              <div className="readinessRing" style={{ "--progress": `${readiness}%` }}>
                <strong>{readiness}%</strong>
                <span>mission ready</span>
              </div>
            </section>

            <section className="missionGrid">
              <article className="missionCard flightCard">
                <div className="cardHeadingRow">
                  <div>
                    <p>INTERACTIVE FLIGHT PLAN</p>
                    <h3>{completedCount} of {STAGES.length} waypoints complete</h3>
                  </div>
                  <button onClick={() => setActiveTab("flight")}>Manage Plan</button>
                </div>

                <div className="flightStrip" aria-label="Project Flight Plan progress">
                  {STAGES.map((stage, index) => {
                    const waypoint = waypointFor(index);
                    const current = index === currentStageIndex && !waypoint.completed;
                    return (
                      <button
                        className={`${waypoint.completed ? "complete" : ""} ${current ? "current" : ""}`}
                        key={stage.key}
                        onClick={() => {
                          setOpenWaypoint(index);
                          setActiveTab("flight");
                        }}
                      >
                        <span>{waypoint.completed ? "✓" : index + 1}</span>
                        <small>{stage.label}</small>
                      </button>
                    );
                  })}
                </div>

                <div className="nextWaypointCard">
                  <div>
                    <small>NEXT WAYPOINT</small>
                    <strong>{nextWaypoint.label}</strong>
                    <span>{nextWaypoint.description}</span>
                  </div>
                  <div>
                    <small>TARGET DATE</small>
                    <strong>{formatDate(nextWaypointRecord.due_date)}</strong>
                  </div>
                </div>
              </article>

              <article className="missionCard pilotBriefCard">
                <div className="pilotBriefTop">
                  <span>P</span>
                  <div>
                    <p>PILOT BRIEFING</p>
                    <h3>Stay focused on the next decision.</h3>
                  </div>
                </div>
                <blockquote>{project.next_step}</blockquote>
                <div className="briefStats">
                  <div><small>SETUP</small><strong>{setupCount}/6</strong></div>
                  <div><small>FILES</small><strong>{documents.length}</strong></div>
                  <div><small>MESSAGES</small><strong>{messages.length}</strong></div>
                </div>
                <button onClick={() => setActiveTab("pilot")}>Continue with Pilot</button>
              </article>

              <article className="missionCard binderCard">
                <div className="cardHeadingRow">
                  <div>
                    <p>PROJECT BINDER</p>
                    <h3>{documents.length} saved document{documents.length === 1 ? "" : "s"}</h3>
                  </div>
                  <button onClick={() => setActiveTab("documents")}>Open Binder</button>
                </div>
                {documents.length ? (
                  <div className="recentDocuments">
                    {documents.slice(0, 3).map((document) => (
                      <button key={document.id} onClick={() => openDocument(document)}>
                        <span>{fileLabel(document)}</span>
                        <div>
                          <strong>{document.file_name}</strong>
                          <small>{new Date(document.created_at).toLocaleDateString()}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="emptyMiniCard">
                    <strong>No files attached yet.</strong>
                    <span>Add plans, photos, estimates, permits, or contracts.</span>
                    <button onClick={() => setActiveTab("documents")}>Add First Document</button>
                  </div>
                )}
              </article>

              <article className="missionCard projectFactsCard">
                <div className="cardHeadingRow">
                  <div>
                    <p>PROJECT SNAPSHOT</p>
                    <h3>{setupCount} of 6 setup details captured</h3>
                  </div>
                  <button onClick={() => setActiveTab("pilot")}>Complete Setup</button>
                </div>
                <div className="projectFacts">
                  {setupItems.map(([label, value]) => (
                    <div className={value ? "complete" : ""} key={label}>
                      <span>{value ? "✓" : "○"}</span>
                      <small>{label}</small>
                      <strong>{value || "Still needed"}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="missionCard permitPreviewCard">
                <div className="cardHeadingRow">
                  <div>
                    <p>PERMIT INTELLIGENCE</p>
                    <h3>{permitChecked ? "Jurisdiction check saved" : "Confirm the permit path"}</h3>
                  </div>
                  <button onClick={() => setActiveTab("permits")}>{permitChecked ? "Review Check" : "Run Check"}</button>
                </div>
                <div className={`permitStatusPreview ${permitChecked ? "ready" : "pending"}`}>
                  <span>{permitChecked ? "✓" : "!"}</span>
                  <div>
                    <strong>{permitChecked ? permitResult.title : "Location verification required"}</strong>
                    <p>{permitChecked ? permitResult.jurisdictionStatus : "Use the project address and ZIP code to build a permit-preparation checklist and open official resources."}</p>
                  </div>
                </div>
              </article>

              <article className="missionCard notesPreviewCard">
                <div className="cardHeadingRow">
                  <div>
                    <p>PROJECT NOTES</p>
                    <h3>Decisions and reminders</h3>
                  </div>
                  <button onClick={() => setActiveTab("notes")}>Edit Notes</button>
                </div>
                <p className="notePreview">
                  {project.notes?.trim() || "No project notes have been added yet. Use this space for measurements, contacts, decisions, questions, and reminders."}
                </p>
              </article>
            </section>
          </div>
        )}

        {activeTab === "flight" && (
          <div className="workspaceContent flightContent">
            <div className="sectionIntro splitIntro">
              <div>
                <p>INTERACTIVE FLIGHT PLAN</p>
                <h1>A clear course from concept to completion.</h1>
                <span>Open a waypoint to add notes, set a target date, or mark it complete.</span>
              </div>
              <div className="flightSummaryPill">
                <strong>{completedCount}/{STAGES.length}</strong>
                <span>waypoints complete</span>
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
                        <small>{waypoint.completed ? "COMPLETED" : current ? "CURRENT WAYPOINT" : "UPCOMING"}</small>
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
                          <span>Waypoint notes</span>
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
                          {savingThis ? "Saving…" : waypoint.completed ? "Mark Incomplete" : "Mark Waypoint Complete"}
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
            <header className="pilotHeader">
              <div className="pilotAvatar">P</div>
              <div>
                <p>PILOT</p>
                <h2>Guided project setup</h2>
              </div>
              <span className="onlineStatus">Guided beta mode</span>
            </header>

            <div className="messageList">
              {!messages.length && (
                <article className="message assistant">
                  <div className="messageAvatar">P</div>
                  <div>
                    <strong>Pilot</strong>
                    <p>Welcome aboard. What are you planning to build, repair, or renovate?</p>
                  </div>
                </article>
              )}

              {messages.map((entry) => (
                <article className={`message ${entry.role === "assistant" ? "assistant" : "user"}`} key={entry.id}>
                  <div className="messageAvatar">{entry.role === "assistant" ? "P" : "Y"}</div>
                  <div>
                    <strong>{entry.role === "assistant" ? "Pilot" : "You"}</strong>
                    <p>{entry.message}</p>
                  </div>
                </article>
              ))}

              {sending && (
                <article className="message assistant">
                  <div className="messageAvatar">P</div>
                  <div>
                    <strong>Pilot</strong>
                    <p className="thinking">Charting the next step…</p>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="composerArea">
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
                  placeholder="Tell Pilot about your project…"
                  rows={2}
                />
                <button disabled={sending || !draft.trim()}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
              <small>Guided beta mode saves your project details without paid AI usage.</small>
            </div>
          </div>
        )}

        {activeTab === "permits" && (
          <div className="workspaceContent permitContent">
            <div className="sectionIntro splitIntro">
              <div>
                <p>PERMIT INTELLIGENCE</p>
                <h1>Build a verified path before regulated work begins.</h1>
                <span>Project Pilot organizes the address match, jurisdiction questions, document checklist, and official resources. Final requirements must be confirmed with the governing authority.</span>
              </div>
              {permitChecked && <span className="permitSavedBadge">✓ CHECK SAVED</span>}
            </div>

            <div className="permitWorkspaceGrid">
              <form className="permitLookupCard" onSubmit={runPermitLookup}>
                <div className="permitCardHeading">
                  <span>01</span>
                  <div><small>PROPERTY CHECK</small><h2>Confirm the project location.</h2></div>
                </div>

                <label>
                  <span>Street address</span>
                  <input
                    value={permitForm.address}
                    onChange={(event) => setPermitForm((current) => ({ ...current, address: event.target.value }))}
                    placeholder="101 Main Street, Milton, DE"
                  />
                </label>

                <div className="permitFormRow">
                  <label>
                    <span>ZIP code</span>
                    <input
                      inputMode="numeric"
                      maxLength={5}
                      value={permitForm.zip}
                      onChange={(event) => setPermitForm((current) => ({ ...current, zip: event.target.value.replace(/\D/g, "").slice(0, 5) }))}
                      placeholder="19968"
                    />
                  </label>
                  <label>
                    <span>Project type</span>
                    <input
                      value={permitForm.project}
                      onChange={(event) => setPermitForm((current) => ({ ...current, project: event.target.value }))}
                      placeholder="Deck"
                    />
                  </label>
                </div>

                {permitError && <div className="permitInlineError">{permitError}</div>}

                <button className="permitLookupButton" disabled={permitLoading}>
                  {permitLoading ? "Checking address and resources…" : permitChecked ? "Refresh Permit Check" : "Run Permit Check"}
                </button>
                <small className="permitDisclaimer">Beta research support only. Always confirm current forms, fees, approvals, and inspections with the responsible authority.</small>
              </form>

              <article className="permitMapCard">
                <div className="permitCardHeading">
                  <span>02</span>
                  <div><small>LOCATION MAP</small><h2>{permitResult?.matchedAddress || project.address || "Map pending"}</h2></div>
                </div>
                {permitMap ? (
                  <iframe title="Project location map" src={permitMap} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                ) : (
                  <div className="mapPlaceholder"><strong>No mapped location yet.</strong><span>Run the permit check to match the address and display the project area.</span></div>
                )}
              </article>
            </div>

            {permitResult ? (
              <section className="permitResults">
                <header>
                  <div><p>CHECK RESULT</p><h2>{permitResult.title}</h2></div>
                  <span>{permitResult.jurisdictionStatus}</span>
                </header>

                <p className="permitSummary">{permitResult.summary}</p>

                <div className="permitResultGrid">
                  <article>
                    <small>RECOMMENDED COURSE</small>
                    <ol>{permitResult.steps?.map((step) => <li key={step}>{step}</li>)}</ol>
                  </article>
                  <article>
                    <small>PREPARE THESE DOCUMENTS</small>
                    <ul>{permitResult.documents?.map((document) => <li key={document}>{document}</li>)}</ul>
                  </article>
                </div>

                <div className="officialResources">
                  <div><small>OFFICIAL RESOURCES</small><strong>Open the governing authority's current information.</strong></div>
                  <div>
                    {permitResult.sources?.map((source) => (
                      <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <section className="permitEmptyResult">
                <span>P</span>
                <div><h2>Permit Intelligence is ready.</h2><p>Enter the property address, ZIP code, and project type. Project Pilot will organize a practical checklist and official starting points.</p></div>
              </section>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="workspaceContent">
            <div className="sectionIntro splitIntro">
              <div>
                <p>PROJECT BINDER</p>
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
                <strong>No documents added yet.</strong>
                <span>Add a plan, photo, estimate, contract, or project record to start the binder.</span>
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
