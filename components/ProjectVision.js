"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import styles from "./ProjectVision.module.css";

const BUCKET = "project-vision";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_NORMALIZED_EDGE = 2048;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const INITIAL_GENERATION_STEPS = [
  "Locking the original camera angle and property layout…",
  "Applying the homeowner-approved design direction…",
  "Building a visibly remodeled version of the requested area…",
  "Checking that the home and unrequested features stay in place…",
  "Finishing materials, lighting, and realistic details…",
  "Saving the proposed remodel to this project…",
];

const REFINEMENT_GENERATION_STEPS = [
  "Loading the selected concept as the starting point…",
  "Applying only the confirmed revision…",
  "Keeping every unrequested detail unchanged…",
  "Balancing a stronger remodel with the original property…",
  "Finishing and saving the revised concept…",
];

function normalizedFilename(file) {
  const base = String(file.name || "project-photo")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "project-photo";
  return `${base}-project-vision.png`;
}

function loadBrowserImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be opened. Save it as a standard JPG or PNG and try again."));
    };
    image.src = url;
  });
}

async function normalizeForProjectVision(file) {
  const { image, url } = await loadBrowserImage(file);

  try {
    const sourceWidth = Number(image.naturalWidth || image.width || 0);
    const sourceHeight = Number(image.naturalHeight || image.height || 0);
    if (!sourceWidth || !sourceHeight) {
      throw new Error("This photo has invalid dimensions. Save it as a standard JPG or PNG and try again.");
    }

    const scale = Math.min(1, MAX_NORMALIZED_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the photo for Project Vision.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("The photo could not be converted to a compatible format.")),
        "image/png"
      );
    });

    return {
      file: new File([blob], normalizedFilename(file), { type: "image/png", lastModified: Date.now() }),
      dimensions: { width, height },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectVision({ project, user }) {
  const sourceInputRef = useRef(null);
  const actualInputRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [comparison, setComparison] = useState(50);
  const [description, setDescription] = useState(project?.description || "");
  const [stylePreferences, setStylePreferences] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [budgetTier, setBudgetTier] = useState("Not specified");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [designInput, setDesignInput] = useState("");
  const [designMessages, setDesignMessages] = useState([]);
  const [designBrief, setDesignBrief] = useState("");
  const [designBriefConfirmed, setDesignBriefConfirmed] = useState(false);
  const [designGuideLoading, setDesignGuideLoading] = useState(false);
  const [visionInput, setVisionInput] = useState("");
  const [visionMessages, setVisionMessages] = useState([]);
  const [refinementBrief, setRefinementBrief] = useState("");
  const [refinementReady, setRefinementReady] = useState(false);
  const [visionHistoryReady, setVisionHistoryReady] = useState(false);
  const [activeGenerationMode, setActiveGenerationMode] = useState("initial");
  const [generationStep, setGenerationStep] = useState(0);

  const sourceAssets = useMemo(
    () => assets.filter((asset) => asset.asset_type === "source"),
    [assets]
  );
  const actualAssets = useMemo(
    () => assets.filter((asset) => asset.asset_type === "actual_after"),
    [assets]
  );
  const selectedSource = useMemo(
    () => sourceAssets.find((asset) => asset.id === selectedSourceId) || sourceAssets[0] || null,
    [sourceAssets, selectedSourceId]
  );
  const concepts = useMemo(
    () => assets
      .filter((asset) => asset.asset_type === "concept" && asset.source_asset_id === selectedSource?.id)
      .sort((left, right) => Number(right.version_number) - Number(left.version_number)),
    [assets, selectedSource]
  );
  const selectedConcept = useMemo(
    () => concepts.find((asset) => asset.id === selectedConceptId) || concepts[0] || null,
    [concepts, selectedConceptId]
  );

  useEffect(() => {
    loadAssets();
  }, [project?.id]);

  useEffect(() => {
    if (!selectedSourceId && sourceAssets[0]) setSelectedSourceId(sourceAssets[0].id);
  }, [sourceAssets, selectedSourceId]);

  useEffect(() => {
    if (!concepts.length) {
      setSelectedConceptId("");
      return;
    }
    if (!concepts.some((concept) => concept.id === selectedConceptId)) {
      const favorite = concepts.find((concept) => concept.is_favorite);
      setSelectedConceptId((favorite || concepts[0]).id);
    }
  }, [concepts, selectedConceptId]);

  useEffect(() => {
    setRefinementBrief("");
    setRefinementReady(false);
  }, [selectedConceptId]);

  useEffect(() => {
    if (!project?.id) return;
    try {
      const savedRefinement = window.localStorage.getItem(`project-vision-chat:${project.id}`);
      const savedDesign = window.localStorage.getItem(`project-vision-design:${project.id}`);
      const savedBrief = window.localStorage.getItem(`project-vision-brief:${project.id}`) || "";
      const parsedRefinement = savedRefinement ? JSON.parse(savedRefinement) : [];
      const parsedDesign = savedDesign ? JSON.parse(savedDesign) : [];
      setVisionMessages(Array.isArray(parsedRefinement) ? parsedRefinement.slice(-20) : []);
      setDesignMessages(Array.isArray(parsedDesign) ? parsedDesign.slice(-20) : []);
      setDesignBrief(savedBrief);
      setDesignBriefConfirmed(Boolean(savedBrief));
    } catch {
      setVisionMessages([]);
      setDesignMessages([]);
      setDesignBrief("");
      setDesignBriefConfirmed(false);
    } finally {
      setVisionHistoryReady(true);
    }
  }, [project?.id]);

  useEffect(() => {
    if (!visionHistoryReady || !project?.id) return;
    window.localStorage.setItem(`project-vision-chat:${project.id}`, JSON.stringify(visionMessages.slice(-20)));
    window.localStorage.setItem(`project-vision-design:${project.id}`, JSON.stringify(designMessages.slice(-20)));
    if (designBriefConfirmed && designBrief) {
      window.localStorage.setItem(`project-vision-brief:${project.id}`, designBrief);
    } else {
      window.localStorage.removeItem(`project-vision-brief:${project.id}`);
    }
  }, [visionMessages, designMessages, designBrief, designBriefConfirmed, visionHistoryReady, project?.id]);

  useEffect(() => {
    if (!generating) {
      setGenerationStep(0);
      return undefined;
    }

    setGenerationStep(0);
    const steps = activeGenerationMode === "refine"
      ? REFINEMENT_GENERATION_STEPS
      : INITIAL_GENERATION_STEPS;
    const timer = window.setInterval(() => {
      setGenerationStep((current) => Math.min(current + 1, steps.length - 1));
    }, 5200);

    return () => window.clearInterval(timer);
  }, [generating, activeGenerationMode]);

  async function withSignedUrls(rows) {
    return Promise.all(
      (rows || []).map(async (asset) => {
        const { data, error: signedError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(asset.storage_path, 60 * 60);
        return { ...asset, url: signedError ? "" : data?.signedUrl || "" };
      })
    );
  }

  async function loadAssets(preferredConceptId = "") {
    if (!project?.id || !user?.id) return;
    setLoading(true);
    setError("");

    const { data, error: assetError } = await supabase
      .from("project_vision_assets")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (assetError) {
      const missingMigration = String(assetError.message || "").includes("project_vision_assets");
      setError(
        missingMigration
          ? "Project Vision is not installed in Supabase yet. Run migration 011, then refresh this project."
          : assetError.message
      );
      setAssets([]);
      setLoading(false);
      return;
    }

    const signed = await withSignedUrls(data || []);
    setAssets(signed);
    if (preferredConceptId) setSelectedConceptId(preferredConceptId);
    setLoading(false);
  }

  async function uploadAsset(event, assetType) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user?.id || !project?.id) return;

    setError("");
    setNotice("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Images must be 15 MB or smaller.");
      return;
    }

    setUploading(assetType);

    try {
      const normalized = await normalizeForProjectVision(file);
      const uploadFile = normalized.file;
      const dimensions = normalized.dimensions;
      const storagePath = `${user.id}/${project.id}/${assetType}-${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, uploadFile, { contentType: uploadFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: record, error: recordError } = await supabase
        .from("project_vision_assets")
        .insert({
          project_id: project.id,
          user_id: user.id,
          asset_type: assetType,
          storage_path: storagePath,
          mime_type: uploadFile.type,
          file_size_bytes: uploadFile.size,
          width: dimensions.width,
          height: dimensions.height,
          caption: assetType === "source" ? "Original project photo" : "Actual completed project",
          status: "ready",
        })
        .select("*")
        .single();

      if (recordError) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw recordError;
      }

      const [signedRecord] = await withSignedUrls([record]);
      setAssets((current) => [signedRecord, ...current]);
      if (assetType === "source") {
        setSelectedSourceId(record.id);
        setSelectedConceptId("");
        setNotice("Original photo uploaded. Describe the project and Project Vision will create one proposed concept.");
      } else {
        setNotice("Actual completed-project photo added.");
      }
    } catch (uploadError) {
      setError(uploadError.message || "The image could not be uploaded.");
    } finally {
      setUploading("");
    }
  }

  function createConversationMessage(role, text) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      text,
      createdAt: new Date().toISOString(),
    };
  }

  function appendVisionMessage(role, text) {
    setVisionMessages((current) => [...current, createConversationMessage(role, text)].slice(-20));
  }

  async function requestDesignGuidance({ phase, messages, currentBrief = "" }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Your session expired. Sign in again and retry.");

    const response = await fetch("/api/project-vision/guide", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        projectId: project.id,
        phase,
        messages: messages.map(({ role, text }) => ({ role, text })),
        currentBrief,
        selectedConcept: phase === "refine"
          ? selectedConcept?.caption || `Version ${selectedConcept?.version_number || ""}`
          : "",
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Su could not continue the design conversation.");
    return result;
  }

  async function guideInitialVision(event) {
    event?.preventDefault?.();
    if (designGuideLoading) return;

    const text = designInput.trim();
    if (text.length < 2) {
      setError("Tell Su what you want the finished project to look or feel like.");
      return;
    }

    const userMessage = createConversationMessage("user", text);
    const nextMessages = [...designMessages, userMessage].slice(-20);
    setDesignMessages(nextMessages);
    setDesignInput("");
    setDesignBriefConfirmed(false);
    setDesignGuideLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await requestDesignGuidance({
        phase: "initial",
        messages: nextMessages,
        currentBrief: designBrief,
      });
      const assistantText = result.message || "Tell me a little more about the result you are picturing.";
      setDesignMessages((current) => [...current, createConversationMessage("assistant", assistantText)].slice(-20));
      setDesignBrief(result.brief || "");
      if (result.ready && result.brief) {
        setNotice("Su has translated your answers into a clear design direction. Review it and select Use this vision.");
      }
    } catch (guideError) {
      setError(guideError.message || "Su could not continue the design conversation.");
    } finally {
      setDesignGuideLoading(false);
    }
  }

  function confirmDesignBrief() {
    if (!designBrief) {
      setError("Continue the conversation with Su until the design direction is ready.");
      return;
    }
    setDesignBriefConfirmed(true);
    setStylePreferences(designBrief);
    setNotice("This design direction will guide the proposed remodel. You can still correct Su before generating.");
  }

  async function requestConcepts({ generationMode, visionMessage = "" }) {
    if (!selectedSource || generating) return null;

    const cleanDescription = description.trim();
    if (cleanDescription.length < 10) {
      throw new Error("Describe what you want the finished project to look like.");
    }
    if (generationMode === "refine" && !selectedConcept) {
      throw new Error("Choose a proposed concept before adding your vision.");
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Your session expired. Sign in again and retry.");

    const response = await fetch("/api/project-vision/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        projectId: project.id,
        sourceAssetId: selectedSource.id,
        baseConceptId: generationMode === "refine" ? selectedConcept?.id : "",
        generationMode,
        visionMessage,
        designBrief: designBriefConfirmed ? designBrief : "",
        description: cleanDescription,
        stylePreferences: stylePreferences.trim(),
        revisionNotes: revisionNotes.trim(),
        budgetTier,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The visualization could not be generated.");

    await loadAssets(result.selectedAssetId || "");
    setComparison(50);
    return result;
  }

  async function generateConcept(event) {
    event.preventDefault();
    if (!selectedSource || generating) return;

    setActiveGenerationMode("initial");
    setGenerating(true);
    setError("");
    setNotice("Project Vision is building one faithful, visibly remodeled proposal from the original photo. Keep this page open while Su protects the layout and applies the approved design.");

    try {
      await requestConcepts({ generationMode: "initial" });
      setRevisionNotes("");
      setNotice("Project Vision created the proposed remodel. If it is not exact, tell Su what feels wrong and she will clarify the change before generating another image.");
    } catch (generationError) {
      setError(generationError.message || "Project Vision could not complete this request.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  }

  async function guideRefinement(event) {
    event.preventDefault();
    if (designGuideLoading || generating) return;

    const text = visionInput.trim();
    if (text.length < 2) {
      setError("Tell Su what does not look right or what you want changed.");
      return;
    }
    if (!selectedConcept) {
      setError("Choose a proposed concept before refining your vision.");
      return;
    }

    const userMessage = createConversationMessage("user", text);
    const nextMessages = [...visionMessages, userMessage].slice(-20);
    setVisionMessages(nextMessages);
    setVisionInput("");
    setRefinementBrief("");
    setRefinementReady(false);
    setDesignGuideLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await requestDesignGuidance({
        phase: "refine",
        messages: nextMessages,
        currentBrief: designBriefConfirmed ? designBrief : "",
      });
      const assistantText = result.message || "Tell me a little more about the change you want.";
      setVisionMessages((current) => [...current, createConversationMessage("assistant", assistantText)].slice(-20));
      setRefinementBrief(result.brief || "");
      setRefinementReady(Boolean(result.ready && result.brief));
      if (result.ready && result.brief) {
        setNotice("Su understands the requested change. Review the refinement brief before using another image generation.");
      }
    } catch (guideError) {
      setError(guideError.message || "Su could not continue the refinement conversation.");
    } finally {
      setDesignGuideLoading(false);
    }
  }

  async function applyRefinement() {
    if (!refinementReady || !refinementBrief || generating) return;
    if (!selectedConcept) {
      setError("Choose the concept you want Su to refine.");
      return;
    }

    setActiveGenerationMode("refine");
    setGenerating(true);
    setError("");
    setNotice("Su is applying the confirmed refinement to the selected concept while keeping every unrequested detail locked.");

    try {
      const baseLabel = selectedConcept.caption || `Version ${selectedConcept.version_number}`;
      await requestConcepts({ generationMode: "refine", visionMessage: refinementBrief });
      appendVisionMessage(
        "assistant",
        `I applied the confirmed changes to ${baseLabel}. Review the revised concept and tell me what still does not match your vision.`
      );
      setRefinementBrief("");
      setRefinementReady(false);
      setNotice("Su created one revised concept from your confirmed instructions.");
    } catch (generationError) {
      const messageText = generationError.message || "Project Vision could not complete this refinement.";
      appendVisionMessage("assistant", `I could not complete that change: ${messageText}`);
      setError(messageText);
      setNotice("");
    } finally {
      setGenerating(false);
    }
  }

  async function favoriteConcept(asset) {
    setError("");
    const { error: clearError } = await supabase
      .from("project_vision_assets")
      .update({ is_favorite: false, updated_at: new Date().toISOString() })
      .eq("project_id", project.id)
      .eq("asset_type", "concept");
    if (clearError) {
      setError(clearError.message);
      return;
    }

    const { error: favoriteError } = await supabase
      .from("project_vision_assets")
      .update({ is_favorite: true, updated_at: new Date().toISOString() })
      .eq("id", asset.id)
      .eq("user_id", user.id);

    if (favoriteError) setError(favoriteError.message);
    else {
      setAssets((current) => current.map((item) => ({
        ...item,
        is_favorite: item.id === asset.id,
      })));
      setNotice("Favorite concept updated.");
    }
  }

  function requestDelete(asset) {
    setError("");
    setNotice("");
    setPendingDelete(asset);
  }

  async function confirmDelete() {
    const asset = pendingDelete;
    if (!asset || deleting) return;

    setDeleting(asset.id);
    setError("");
    setNotice("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again and retry.");

      const response = await fetch("/api/project-vision/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          assetId: asset.id,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The image could not be removed.");

      const removedIds = new Set(result.removedIds || [asset.id]);
      setAssets((current) => current.filter((item) => !removedIds.has(item.id)));

      if (removedIds.has(selectedSourceId)) {
        setSelectedSourceId("");
        setSelectedConceptId("");
      } else if (removedIds.has(selectedConceptId)) {
        setSelectedConceptId("");
      }

      setPendingDelete(null);
      setNotice(result.warning || "Image removed successfully.");
      await loadAssets();
    } catch (deleteError) {
      setError(deleteError.message || "The image could not be removed.");
    } finally {
      setDeleting("");
    }
  }

  if (loading) {
    return <div className={styles.loading}>Opening Project Vision…</div>;
  }

  return (
    <div className={styles.visionPage}>
      <section className={styles.intro}>
        <div>
          <p>PROJECT VISION</p>
          <h1>See the potential before construction begins.</h1>
          <span>
            Upload your own property photo. Su helps the homeowner describe the exact look they are searching for, then Project Vision creates a believable remodel that stays consistent with the real property.
          </span>
        </div>
        <button type="button" onClick={() => sourceInputRef.current?.click()} disabled={Boolean(uploading)}>
          {uploading === "source" ? "Uploading…" : "+ Upload Original Photo"}
        </button>
        <input
          ref={sourceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          hidden
          onChange={(event) => uploadAsset(event, "source")}
        />
      </section>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}
      {generating && (() => {
        const steps = activeGenerationMode === "refine" ? REFINEMENT_GENERATION_STEPS : INITIAL_GENERATION_STEPS;
        const progress = Math.round(((generationStep + 1) / steps.length) * 100);
        return (
          <div className={styles.generationProgress} role="status" aria-live="polite">
            <div className={styles.generationProgressTop}>
              <div>
                <strong>{activeGenerationMode === "refine" ? "Su is refining your concept" : "Su is creating your proposed remodel"}</strong>
                <span>{steps[generationStep]}</span>
              </div>
              <b>{progress}%</b>
            </div>
            <div className={styles.generationTrack}><i style={{ width: `${progress}%` }} /></div>
            <small>This progress display explains the current stage. The final image remains one API generation.</small>
          </div>
        );
      })()}

      {!sourceAssets.length ? (
        <section className={styles.empty}>
          <div>+</div>
          <h2>Start with a real photo of the project area.</h2>
          <p>Use a clear, well-lit image that shows the house, room, yard, or structure you want to change.</p>
          <button type="button" onClick={() => sourceInputRef.current?.click()}>Choose Original Photo</button>
          <small>Only images uploaded by the account owner are used. No stock property is substituted.</small>
        </section>
      ) : (
        <>
          <section className={styles.sourceStrip}>
            <div className={styles.sectionTitle}>
              <div><p>ORIGINAL PHOTOS</p><h2>Choose the view to visualize.</h2></div>
              <div className={styles.sectionActions}>
                <span>{sourceAssets.length} uploaded</span>
                {selectedSource && (
                  <button type="button" onClick={() => requestDelete(selectedSource)} disabled={Boolean(deleting)}>
                    Delete selected photo
                  </button>
                )}
              </div>
            </div>
            <div className={styles.thumbnailRow}>
              {sourceAssets.map((asset) => (
                <button
                  type="button"
                  className={`${styles.thumbnail} ${selectedSource?.id === asset.id ? styles.selected : ""}`}
                  onClick={() => { setSelectedSourceId(asset.id); setComparison(50); }}
                  key={asset.id}
                >
                  {asset.url ? <img src={asset.url} alt="Original project view" /> : <span>Photo unavailable</span>}
                  <small>{formatDate(asset.created_at)}</small>
                </button>
              ))}
            </div>
          </section>

          <div className={styles.workGrid}>
            <form className={styles.formCard} onSubmit={generateConcept}>
              <div className={styles.cardHeading}>
                <span>1</span>
                <div><p>DESCRIBE THE RESULT</p><h2>What should change?</h2></div>
              </div>
              <label>
                Project request
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Example: Add a larger outdoor pool behind the house, a modest open-air pool lounge with storage, and a seating patio around the willow tree. Keep the driveway, sheds, cabin, and house exactly where they are."
                  rows="6"
                  required
                />
              </label>
              <label>
                Budget direction
                <select value={budgetTier} onChange={(event) => setBudgetTier(event.target.value)}>
                  <option>Not specified</option>
                  <option>Under $10,000</option>
                  <option>$10,000–$25,000</option>
                  <option>$25,000–$50,000</option>
                  <option>$50,000+</option>
                  <option>Premium</option>
                </select>
              </label>
              <section className={styles.designGuide}>
                <div className={styles.visionChatHeading}>
                  <div>
                    <p>FIND THE EXACT LOOK WITH SU</p>
                    <h3>Describe it naturally. Su will help you narrow it down.</h3>
                    <span>There is no fixed style quiz. Su asks one relevant question at a time based on your answers until the design direction matches what you mean.</span>
                  </div>
                  {designBriefConfirmed && <div className={styles.confirmedBadge}>Vision confirmed</div>}
                </div>

                <div className={styles.visionMessages} aria-live="polite">
                  {!designMessages.length && (
                    <div className={`${styles.visionMessage} ${styles.assistantMessage}`}>
                      <strong>Su</strong>
                      <span>Tell me in your own words what you want this project to look and feel like when it is finished. You do not need to know any design terms.</span>
                    </div>
                  )}
                  {designMessages.map((message) => (
                    <div
                      className={`${styles.visionMessage} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}
                      key={message.id}
                    >
                      <strong>{message.role === "user" ? "You" : "Su"}</strong>
                      <span>{message.text}</span>
                    </div>
                  ))}
                  {designGuideLoading && (
                    <div className={`${styles.visionMessage} ${styles.assistantMessage}`}>
                      <strong>Su</strong>
                      <span>Thinking about the next detail that will help define your look…</span>
                    </div>
                  )}
                </div>

                <div className={styles.visionComposer}>
                  <label htmlFor="project-vision-design-conversation">Your response</label>
                  <textarea
                    id="project-vision-design-conversation"
                    value={designInput}
                    onChange={(event) => setDesignInput(event.target.value)}
                    placeholder="Example: I want it to look updated and finished, but still like my actual home—not too expensive or overly luxurious."
                    rows="3"
                    disabled={designGuideLoading || generating}
                  />
                  <div className={styles.visionComposerActions}>
                    <button type="button" className={styles.guideButton} onClick={guideInitialVision} disabled={designGuideLoading || generating || designInput.trim().length < 2}>
                      {designGuideLoading ? "Su is thinking…" : "Continue with Su"}
                    </button>
                  </div>
                </div>

                {designBrief && (
                  <div className={styles.briefCard}>
                    <div>
                      <p>SU'S UNDERSTANDING OF YOUR VISION</p>
                      <span>{designBrief}</span>
                    </div>
                    <button type="button" onClick={confirmDesignBrief} disabled={designGuideLoading || generating}>
                      {designBriefConfirmed ? "Using this vision" : "Use this vision"}
                    </button>
                    <small>Something is off? Reply to Su above. She will revise this brief from your next response.</small>
                  </div>
                )}
              </section>
              <div className={styles.preserveNote}>
                <strong>Balanced-remodel rule</strong>
                <span>The result should clearly look renovated, but it must remain the same property, layout, structure placement, and camera angle. Unrequested details stay locked.</span>
              </div>
              <button className={styles.generateButton} type="submit" disabled={generating || !selectedSource}>
                {generating ? "Creating faithful remodel…" : concepts.length ? "Generate Another Remodel" : "Generate Proposed Remodel"}
              </button>
              <small className={styles.disclaimer}>AI concepts are planning visuals only. They are not plans, approvals, cost guarantees, or proof of completed work.</small>
            </form>

            <section className={styles.previewCard}>
              <div className={styles.cardHeading}>
                <span>2</span>
                <div><p>COMPARE</p><h2>Original → Proposed</h2></div>
              </div>

              {selectedSource?.url && selectedConcept?.url ? (
                <>
                  <div className={styles.comparison}>
                    <img className={styles.beforeImage} src={selectedSource.url} alt="Original project photo" />
                    <img
                      className={styles.afterImage}
                      src={selectedConcept.url}
                      alt="AI proposed project visualization"
                      style={{ clipPath: `inset(0 ${100 - comparison}% 0 0)` }}
                    />
                    <div className={styles.divider} style={{ left: `${comparison}%` }}><span>↔</span></div>
                    <span className={styles.beforeLabel}>ORIGINAL</span>
                    <span className={styles.afterLabel}>AI CONCEPT</span>
                  </div>
                  <input
                    className={styles.range}
                    type="range"
                    min="0"
                    max="100"
                    value={comparison}
                    onChange={(event) => setComparison(Number(event.target.value))}
                    aria-label="Compare original and proposed images"
                  />
                  <div className={styles.conceptMeta}>
                    <div>
                      <strong>{selectedConcept.caption || `Version ${selectedConcept.version_number}`}</strong>
                      <span>{formatDate(selectedConcept.created_at)} · Conceptual visualization · V{selectedConcept.version_number}</span>
                    </div>
                    <div>
                      <button type="button" onClick={() => favoriteConcept(selectedConcept)}>
                        {selectedConcept.is_favorite ? "★ Favorite" : "☆ Set Favorite"}
                      </button>
                      <button type="button" className={styles.deleteConceptButton} onClick={() => requestDelete(selectedConcept)} disabled={Boolean(deleting)}>
                        Delete concept
                      </button>
                      <a href={selectedConcept.url} target="_blank" rel="noreferrer">Open Image</a>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.awaiting}>
                  {selectedSource?.url && <img src={selectedSource.url} alt="Selected original project photo" />}
                  <div><strong>Your original photo is ready.</strong><span>Describe the result and generate the first concept.</span></div>
                </div>
              )}

              {concepts.length > 0 && (
                <div className={styles.versionList}>
                  <div className={styles.sectionTitle}>
                    <div><p>SAVED CONCEPTS</p><h3>Select a concept to view or refine.</h3></div>
                    <span>{concepts.length}</span>
                  </div>
                  <div className={styles.versionGrid}>
                    {concepts.map((concept) => (
                      <button
                        type="button"
                        className={selectedConcept?.id === concept.id ? styles.selectedVersion : ""}
                        onClick={() => { setSelectedConceptId(concept.id); setComparison(50); }}
                        key={concept.id}
                      >
                        <img src={concept.url} alt={concept.caption || `Project Vision version ${concept.version_number}`} />
                        <span>{concept.caption || `V${concept.version_number}`}{concept.is_favorite ? " · ★" : ""}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {concepts.length > 0 && selectedConcept && (
                <section className={styles.visionChat}>
                  <div className={styles.visionChatHeading}>
                    <div>
                      <p>ADD YOUR VISION</p>
                      <h3>Tell Su what still does not match what you want.</h3>
                      <span>Su will respond to what you say, ask only the clarification she needs, and prepare the exact revision before another image is generated.</span>
                    </div>
                    <div className={styles.selectedConceptBadge}>
                      Refining: {selectedConcept.caption || `Version ${selectedConcept.version_number}`}
                    </div>
                  </div>

                  <div className={styles.visionMessages} aria-live="polite">
                    {!visionMessages.length && (
                      <div className={`${styles.visionMessage} ${styles.assistantMessage}`}>
                        <strong>Su</strong>
                        <span>Tell me what feels wrong, too plain, too dramatic, missing, or different from what you pictured. I will help narrow the change down before using another image generation.</span>
                      </div>
                    )}
                    {visionMessages.map((message) => (
                      <div
                        className={`${styles.visionMessage} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}
                        key={message.id}
                      >
                        <strong>{message.role === "user" ? "You" : "Su"}</strong>
                        <span>{message.text}</span>
                      </div>
                    ))}
                  </div>



                  <form className={styles.visionComposer} onSubmit={guideRefinement}>
                    <label htmlFor="project-vision-refinement">Tell Su what you are looking for</label>
                    <textarea
                      id="project-vision-refinement"
                      value={visionInput}
                      onChange={(event) => setVisionInput(event.target.value)}
                      placeholder="Example: This is too different from my actual home. Keep the exact deck footprint and yard, but make the materials look newer and more finished."
                      rows="4"
                      disabled={generating || designGuideLoading}
                    />
                    <div className={styles.visionComposerActions}>
                      <button type="submit" className={styles.guideButton} disabled={generating || designGuideLoading || visionInput.trim().length < 2}>
                        {designGuideLoading ? "Su is thinking…" : "Continue with Su"}
                      </button>
                    </div>
                    <small>No image is generated while Su is clarifying the look, which helps avoid wasting image credits on the wrong revision.</small>
                  </form>

                  {refinementBrief && (
                    <div className={styles.briefCard}>
                      <div>
                        <p>CONFIRMED REVISION SU WILL APPLY</p>
                        <span>{refinementBrief}</span>
                      </div>
                      <button type="button" onClick={applyRefinement} disabled={!refinementReady || generating || designGuideLoading}>
                        {generating ? "Creating revision…" : "Generate this revision"}
                      </button>
                      <small>Su will use the selected concept as the starting point and keep every unrequested detail unchanged.</small>
                    </div>
                  )}
                </section>
              )}
            </section>
          </div>

          <section className={styles.gallerySection}>
            <div className={styles.sectionTitle}>
              <div><p>IMAGE MANAGEMENT</p><h2>Originals, concepts, and the actual completed result.</h2></div>
            </div>
            <div className={styles.galleryColumns}>
              <article>
                <header><strong>Original uploads</strong><span>{sourceAssets.length}</span></header>
                {sourceAssets.map((asset) => (
                  <div className={styles.assetRow} key={asset.id}>
                    <img src={asset.url} alt="Original project upload" />
                    <span>{formatDate(asset.created_at)}</span>
                    <button type="button" onClick={() => requestDelete(asset)} disabled={deleting === asset.id}>
                      {deleting === asset.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ))}
              </article>
              <article>
                <header><strong>Actual completed photos</strong><span>{actualAssets.length}</span></header>
                {actualAssets.map((asset) => (
                  <div className={styles.assetRow} key={asset.id}>
                    <img src={asset.url} alt="Actual completed project upload" />
                    <span>{formatDate(asset.created_at)}</span>
                    <button type="button" onClick={() => requestDelete(asset)} disabled={deleting === asset.id}>
                      {deleting === asset.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ))}
                {!actualAssets.length && <p className={styles.galleryEmpty}>Add the real after photo when construction is complete.</p>}
                <button className={styles.actualButton} type="button" onClick={() => actualInputRef.current?.click()} disabled={Boolean(uploading)}>
                  {uploading === "actual_after" ? "Uploading…" : "+ Upload Actual After"}
                </button>
                <input
                  ref={actualInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  hidden
                  onChange={(event) => uploadAsset(event, "actual_after")}
                />
              </article>
            </div>
          </section>
        </>
      )}

      {pendingDelete && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => !deleting && setPendingDelete(null)}>
          <div className={styles.deleteModal} role="dialog" aria-modal="true" aria-labelledby="delete-vision-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.deleteIcon}>!</div>
            <div>
              <p>REMOVE IMAGE</p>
              <h2 id="delete-vision-title">
                {pendingDelete.asset_type === "source"
                  ? "Delete this original photo?"
                  : pendingDelete.asset_type === "concept"
                    ? "Delete this AI concept?"
                    : "Delete this completed photo?"}
              </h2>
              <span>
                {pendingDelete.asset_type === "source"
                  ? "Any AI concepts and generation history connected to this original will also be removed. This cannot be undone."
                  : "This image will be permanently removed from the project. This cannot be undone."}
              </span>
            </div>
            <div className={styles.modalButtons}>
              <button type="button" onClick={() => setPendingDelete(null)} disabled={Boolean(deleting)}>Cancel</button>
              <button type="button" className={styles.confirmDeleteButton} onClick={confirmDelete} disabled={Boolean(deleting)}>
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
