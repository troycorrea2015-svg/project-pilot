"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import styles from "./ProjectVision.module.css";

const BUCKET = "project-vision";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_NORMALIZED_EDGE = 2048;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const QUICK_VISION_PROMPTS = [
  "Keep the layout, but make the materials more modern.",
  "Make this more affordable without changing the main design.",
  "Add more privacy and keep everything else the same.",
  "Make the project area larger without moving the home.",
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
  const [visionInput, setVisionInput] = useState("");
  const [visionMessages, setVisionMessages] = useState([]);
  const [visionHistoryReady, setVisionHistoryReady] = useState(false);

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
    if (!project?.id) return;
    try {
      const saved = window.localStorage.getItem(`project-vision-chat:${project.id}`);
      const parsed = saved ? JSON.parse(saved) : [];
      setVisionMessages(Array.isArray(parsed) ? parsed.slice(-20) : []);
    } catch {
      setVisionMessages([]);
    } finally {
      setVisionHistoryReady(true);
    }
  }, [project?.id]);

  useEffect(() => {
    if (!visionHistoryReady || !project?.id) return;
    window.localStorage.setItem(
      `project-vision-chat:${project.id}`,
      JSON.stringify(visionMessages.slice(-20))
    );
  }, [visionMessages, visionHistoryReady, project?.id]);

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
        setNotice("Original photo uploaded. Describe the project and Project Vision will create 3 options.");
      } else {
        setNotice("Actual completed-project photo added.");
      }
    } catch (uploadError) {
      setError(uploadError.message || "The image could not be uploaded.");
    } finally {
      setUploading("");
    }
  }

  function appendVisionMessage(role, text) {
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      text,
      createdAt: new Date().toISOString(),
    };
    setVisionMessages((current) => [...current, message].slice(-20));
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

    setGenerating(true);
    setError("");
    setNotice("Project Vision is editing your original photo and creating 3 options. Keep this page open until they are saved.");

    try {
      const result = await requestConcepts({ generationMode: "initial" });
      setRevisionNotes("");
      setNotice(`Project Vision created ${Number(result?.generatedCount || 3)} options. Choose one, then use Add Your Vision to keep refining it.`);
    } catch (generationError) {
      setError(generationError.message || "Project Vision could not complete this request.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  }

  async function refineVision(event) {
    event.preventDefault();
    if (generating) return;

    const message = visionInput.trim();
    if (message.length < 3) {
      setError("Tell Su what you want changed in the selected concept.");
      return;
    }
    if (!selectedConcept) {
      setError("Choose a proposed concept before adding your vision.");
      return;
    }

    appendVisionMessage("user", message);
    setVisionInput("");
    setGenerating(true);
    setError("");
    setNotice("Su is applying your vision to the selected concept and creating 3 refined options.");

    try {
      const baseLabel = selectedConcept.caption || `Version ${selectedConcept.version_number}`;
      const result = await requestConcepts({ generationMode: "refine", visionMessage: message });
      const count = Number(result?.generatedCount || 3);
      appendVisionMessage(
        "assistant",
        `I used ${baseLabel} as the starting point and created ${count} refined options. Choose the closest one, then tell me what to change next.`
      );
      setNotice(`Su created ${count} refinements from your selected concept.`);
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
            Upload your own property photo. Project Vision preserves the property and camera angle, creates 3 initial options, and then lets the homeowner talk Su through additional changes.
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
              <label>
                Style or materials <small>(optional)</small>
                <input
                  value={stylePreferences}
                  onChange={(event) => setStylePreferences(event.target.value)}
                  placeholder="Modern, rustic, stamped concrete, dark siding…"
                />
              </label>
              <label>
                Revision to make <small>(optional)</small>
                <textarea
                  value={revisionNotes}
                  onChange={(event) => setRevisionNotes(event.target.value)}
                  placeholder="Example: Make the pool larger and move it closer to the back-right corner."
                  rows="3"
                />
              </label>
              <div className={styles.preserveNote}>
                <strong>Scene-lock rule</strong>
                <span>Initial options start from the original photo. Add Your Vision refinements start from the concept you select while locking every unrequested detail in place.</span>
              </div>
              <button className={styles.generateButton} type="submit" disabled={generating || !selectedSource}>
                {generating ? "Creating 3 Project Vision options…" : concepts.length ? "Generate 3 New Options" : "Generate 3 Proposed Options"}
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
                    <div><p>SAVED OPTIONS</p><h3>Choose a direction to refine.</h3></div>
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
                      <h3>Talk Su through the changes.</h3>
                      <span>Select the closest concept, then describe or speak exactly what should change next.</span>
                    </div>
                    <div className={styles.selectedConceptBadge}>
                      Refining: {selectedConcept.caption || `Version ${selectedConcept.version_number}`}
                    </div>
                  </div>

                  <div className={styles.visionMessages} aria-live="polite">
                    {!visionMessages.length && (
                      <div className={`${styles.visionMessage} ${styles.assistantMessage}`}>
                        <strong>Su</strong>
                        <span>Choose the closest option and type the changes you want. For example: “Keep this exact layout, make the railing black, use gray composite boards, and remove the furniture.”</span>
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

                  <div className={styles.quickVisionPrompts}>
                    {QUICK_VISION_PROMPTS.map((prompt) => (
                      <button type="button" onClick={() => setVisionInput(prompt)} key={prompt}>
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <form className={styles.visionComposer} onSubmit={refineVision}>
                    <label htmlFor="project-vision-refinement">Add your vision</label>
                    <textarea
                      id="project-vision-refinement"
                      value={visionInput}
                      onChange={(event) => setVisionInput(event.target.value)}
                      placeholder="Type exactly what Su should keep, remove, move, resize, recolor, or replace. Unrequested details will stay locked."
                      rows="4"
                      disabled={generating}
                    />
                    <div className={styles.visionComposerActions}>
                      <button type="submit" className={styles.refineButton} disabled={generating || visionInput.trim().length < 3}>
                        {generating ? "Creating 3 refinements…" : "Generate 3 refinements"}
                      </button>
                    </div>
                    <small>Su uses the selected concept as the starting point and applies only the changes you request.</small>
                  </form>
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
