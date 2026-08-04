function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function money(value) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return text(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(numeric);
}

function yesNo(value) {
  const normalized = text(value).toLowerCase();
  if (["yes", "true", "1"].includes(normalized)) return "Yes";
  if (["no", "false", "0"].includes(normalized)) return "No";
  return text(value);
}

function valueFor(key, answers, project, user, permitResult) {
  const direct = answers?.[key];
  if (direct !== undefined && direct !== null && text(direct) !== "") return direct;

  const fallbacks = {
    owner_name: project?.owner_name || user?.user_metadata?.full_name || user?.email || "",
    applicant_email: user?.email || "",
    applicant_phone: project?.phone || user?.user_metadata?.phone || "",
    property_address: permitResult?.matchedAddress || project?.address || project?.location_label || "",
    parcel_number: project?.parcel_number || "",
    estimated_cost: project?.budget || "",
    work_description: project?.description || project?.title || "",
    project_title: project?.title || "",
  };
  return fallbacks[key] ?? "";
}

const BASE_FIELDS = [
  ["Applicant", "owner_name", "Property owner full name", true],
  ["Applicant", "applicant_role", "Applicant role", true],
  ["Applicant", "applicant_email", "Applicant email", true],
  ["Applicant", "applicant_phone", "Applicant phone", true],
  ["Property", "property_address", "Property address", true],
  ["Property", "parcel_number", "Parcel / tax map number", false],
  ["Project", "project_title", "Project title", true],
  ["Project", "work_description", "Detailed scope of work", true],
  ["Project", "estimated_cost", "Estimated project cost", true, "money"],
  ["Project", "desired_start_date", "Desired start date", false],
  ["Contractor", "contractor_name", "Contractor / company name", false],
  ["Contractor", "contractor_license", "Contractor license number", false],
  ["Scope", "structural_work", "Structural work included", true, "yesno"],
  ["Scope", "electrical_work", "Electrical work included", true, "yesno"],
  ["Scope", "plumbing_work", "Plumbing work included", true, "yesno"],
  ["Scope", "mechanical_work", "Mechanical / HVAC work included", true, "yesno"],
  ["Scope", "excavation_work", "Excavation or ground disturbance", true, "yesno"],
];

const PROJECT_FIELDS = {
  deck: [
    ["Deck", "deck_length", "Deck length (ft)", true],
    ["Deck", "deck_width", "Deck width (ft)", true],
    ["Deck", "deck_height", "Maximum height above grade (ft)", true],
    ["Deck", "deck_attached", "Deck attached to home", true, "yesno"],
    ["Deck", "deck_stairs", "Stairs included", true, "yesno"],
    ["Deck", "deck_railings", "Guards / railings included", true, "yesno"],
    ["Deck", "deck_material", "Primary decking material", true],
  ],
  fence: [
    ["Fence", "fence_length", "Total fence length (linear ft)", true],
    ["Fence", "fence_height", "Maximum fence height (ft)", true],
    ["Fence", "fence_material", "Fence material", true],
    ["Fence", "pool_barrier", "Fence serves as pool barrier", true, "yesno"],
  ],
  shed: [
    ["Structure", "structure_length", "Structure length (ft)", true],
    ["Structure", "structure_width", "Structure width (ft)", true],
    ["Structure", "structure_height", "Structure height (ft)", true],
    ["Structure", "foundation_type", "Foundation type", true],
    ["Structure", "structure_utilities", "Utilities included", true, "yesno"],
  ],
  roof: [
    ["Roof", "roof_area", "Approximate roof area (sq ft)", true],
    ["Roof", "roof_layers", "Existing roof layers", true],
    ["Roof", "roof_material", "New roofing material", true],
    ["Roof", "roof_deck_repair", "Roof-deck repair expected", true, "yesno"],
  ],
  kitchen: [
    ["Interior", "room_area", "Approximate room area (sq ft)", true],
    ["Interior", "wall_removal", "Wall removal or alteration", true, "yesno"],
    ["Interior", "fixture_relocation", "Fixtures or appliances relocated", true, "yesno"],
  ],
  bathroom: [
    ["Interior", "room_area", "Approximate room area (sq ft)", true],
    ["Interior", "wall_removal", "Wall removal or alteration", true, "yesno"],
    ["Interior", "fixture_relocation", "Plumbing fixtures relocated", true, "yesno"],
  ],
  addition: [
    ["Addition", "addition_area", "Addition area (sq ft)", true],
    ["Addition", "addition_stories", "Number of stories", true],
    ["Addition", "addition_use", "Intended use", true],
    ["Addition", "addition_foundation", "Foundation type", true],
  ],
  pool: [
    ["Pool", "pool_type", "Pool type", true],
    ["Pool", "pool_length", "Pool length (ft)", true],
    ["Pool", "pool_width", "Pool width (ft)", true],
    ["Pool", "pool_depth", "Maximum depth (ft)", true],
    ["Pool", "pool_barrier_plan", "Barrier / gate plan", true],
  ],
  general: [
    ["Project", "project_dimensions", "Key project dimensions", true],
    ["Project", "existing_conditions", "Existing conditions affecting work", false],
  ],
};

function normalizeProjectType(value) {
  const clean = text(value).toLowerCase();
  if (clean.includes("deck") || clean.includes("porch") || clean.includes("patio")) return "deck";
  if (clean.includes("fence") || clean.includes("retaining")) return "fence";
  if (clean.includes("shed") || clean.includes("garage") || clean.includes("accessory")) return "shed";
  if (clean.includes("roof") || clean.includes("siding")) return "roof";
  if (clean.includes("kitchen")) return "kitchen";
  if (clean.includes("bath")) return "bathroom";
  if (clean.includes("addition") || clean.includes("sunroom")) return "addition";
  if (clean.includes("pool") || clean.includes("spa") || clean.includes("hot tub")) return "pool";
  return "general";
}

function formatValue(raw, format) {
  if (format === "money") return money(raw);
  if (format === "yesno") return yesNo(raw);
  return text(raw);
}

function fieldRows(definitions, answers, project, user, permitResult) {
  return definitions.map(([section, key, label, required, format]) => {
    const raw = valueFor(key, answers, project, user, permitResult);
    const value = formatValue(raw, format);
    return { section, key, label, value, required: Boolean(required), source: answers?.[key] !== undefined ? "Permit interview" : "Project profile" };
  });
}

function documentRows(permitCase) {
  const checklist = Array.isArray(permitCase?.checklist) ? permitCase.checklist : [];
  const links = permitCase?.document_links || {};
  return checklist.map((item) => ({
    key: item.key,
    label: item.label,
    required: Boolean(item.required),
    linked: Boolean(links[item.key]),
    documentId: links[item.key] || "",
    source: item.source || "Permit checklist",
  }));
}

function jurisdictionKey(value) {
  const normalized = text(value).toLowerCase();
  if (normalized.includes("new castle")) return "new_castle";
  if (normalized.includes("kent")) return "kent";
  if (normalized.includes("sussex")) return "sussex";
  return "general";
}

const PORTAL_LABELS = {
  new_castle: {
    owner_name: "Property Owner / Applicant Name",
    applicant_email: "Applicant Email",
    applicant_phone: "Applicant Phone",
    property_address: "Project Address",
    parcel_number: "Tax Parcel Number",
    work_description: "Description of Work",
    estimated_cost: "Estimated Construction Cost",
    contractor_name: "Contractor Name",
    contractor_license: "Contractor License / Registration",
  },
  kent: {
    owner_name: "Applicant / Owner",
    applicant_email: "Email Address",
    applicant_phone: "Phone Number",
    property_address: "Job Site Address",
    parcel_number: "Tax Account / Parcel",
    work_description: "Detailed Scope of Work",
    estimated_cost: "Job Value",
    contractor_name: "General Contractor",
    contractor_license: "License Number",
  },
  sussex: {
    owner_name: "Property Owner Name",
    applicant_email: "Applicant Email",
    applicant_phone: "Applicant Telephone",
    property_address: "Location of Work",
    parcel_number: "Tax Map and Parcel",
    work_description: "Proposed Work",
    estimated_cost: "Estimated Cost",
    contractor_name: "Contractor / Builder",
    contractor_license: "License / Registration Number",
  },
  general: {
    owner_name: "Owner / Applicant Name",
    applicant_email: "Applicant Email",
    applicant_phone: "Applicant Phone",
    property_address: "Project Address",
    parcel_number: "Parcel / Tax Map Number",
    work_description: "Scope / Description of Work",
    estimated_cost: "Estimated Project Cost",
    contractor_name: "Contractor Name",
    contractor_license: "Contractor License",
  },
};

export function buildPermitApplicationPacket({ permitCase, project, user, permitResult }) {
  const answers = permitCase?.answers || {};
  const projectType = normalizeProjectType(permitCase?.project_type || project?.project_type || project?.title || project?.description);
  const fields = fieldRows([...BASE_FIELDS, ...(PROJECT_FIELDS[projectType] || PROJECT_FIELDS.general)], answers, project, user, permitResult);
  const documents = documentRows(permitCase);
  const missingFields = fields.filter((field) => field.required && !text(field.value));
  const missingDocuments = documents.filter((document) => document.required && !document.linked);
  const jurisdiction = permitCase?.jurisdiction || permitResult?.jurisdiction || project?.jurisdiction || "Jurisdiction confirmation required";
  const jurisdictionCode = jurisdictionKey(jurisdiction);
  const portalLabels = PORTAL_LABELS[jurisdictionCode] || PORTAL_LABELS.general;
  const portalFields = fields.map((field, index) => ({
    id: `${field.key}-${index}`,
    key: field.key,
    section: field.section,
    portalLabel: portalLabels[field.key] || field.label,
    projectPilotLabel: field.label,
    value: field.value,
    required: field.required,
  }));

  const completionBase = fields.filter((field) => field.required).length + documents.filter((document) => document.required).length;
  const completed = completionBase - missingFields.length - missingDocuments.length;
  const completion = completionBase ? Math.max(0, Math.min(100, Math.round((completed / completionBase) * 100))) : 0;

  return {
    version: "3.3.0",
    generatedAt: new Date().toISOString(),
    permitCaseId: permitCase?.id || "",
    projectId: project?.id || "",
    projectType,
    projectTitle: project?.title || "Permit application",
    jurisdiction,
    jurisdictionCode,
    jurisdictionConfidence: permitCase?.jurisdiction_confidence || permitResult?.jurisdictionConfidence || "review",
    applicationLabel: permitCase?.application_label || permitResult?.primaryApplication?.label || "Official permit application",
    applicationUrl: permitCase?.application_url || permitResult?.primaryApplication?.url || "",
    submissionMethod: permitCase?.submission_method || permitResult?.primaryApplication?.method || "Guided portal submission",
    fields,
    documents,
    portalFields,
    missingFields,
    missingDocuments,
    completion,
    ready: missingFields.length === 0 && missingDocuments.length === 0,
    legalActionsRemaining: ["Applicant identity or portal login", "Applicant certification or signature", "Government fee payment", "Professional seals or licensed-trade submissions when required"],
  };
}

export function groupPacketFields(fields = []) {
  return fields.reduce((groups, field) => {
    const key = field.section || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(field);
    return groups;
  }, {});
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildPacketHtml(packet) {
  const groups = groupPacketFields(packet?.fields || []);
  const groupHtml = Object.entries(groups).map(([section, fields]) => `
    <section>
      <h2>${escapeHtml(section)}</h2>
      <table><tbody>${fields.map((field) => `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(field.value || "Not provided")}</td></tr>`).join("")}</tbody></table>
    </section>`).join("");
  const documents = (packet?.documents || []).map((document) => `<li class="${document.linked ? "ok" : "missing"}">${document.linked ? "✓" : "○"} ${escapeHtml(document.label)}</li>`).join("");
  const legal = (packet?.legalActionsRemaining || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(packet?.projectTitle || "Permit Application Packet")}</title><style>body{font-family:Arial,sans-serif;color:#10213d;max-width:900px;margin:0 auto;padding:36px}header{border-bottom:4px solid #2f6df6;padding-bottom:18px;margin-bottom:26px}h1{margin:0;font-size:30px}header p{color:#5d6f88}section{margin:24px 0}h2{font-size:18px;color:#2f6df6;border-bottom:1px solid #dce6f2;padding-bottom:8px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dce6f2;padding:10px;text-align:left;vertical-align:top}th{width:36%;background:#f5f8fc}ul{padding-left:22px}.ok{color:#17663a}.missing{color:#9a4d21}.notice{padding:14px;background:#eef4ff;border:1px solid #cbdcff;border-radius:8px}.footer{margin-top:34px;font-size:12px;color:#62748c}</style></head><body><header><h1>Project Pilot Permit Application Packet</h1><p><strong>${escapeHtml(packet?.projectTitle)}</strong><br>${escapeHtml(packet?.jurisdiction)} · ${escapeHtml(packet?.applicationLabel)}<br>Generated ${escapeHtml(new Date(packet?.generatedAt || Date.now()).toLocaleString())}</p></header><div class="notice"><strong>Package readiness: ${Number(packet?.completion || 0)}%</strong><br>This packet prepares the application information and supporting-document checklist. The applicant must still complete any legally required login, identity, certification, signature, payment, or professional-seal step.</div>${groupHtml}<section><h2>Supporting Documents</h2><ul>${documents}</ul></section><section><h2>Applicant-Controlled Final Actions</h2><ul>${legal}</ul></section><p class="footer">Project Pilot assists with application preparation and administrative coordination. The governing authority remains the source of truth for final requirements and approval.</p></body></html>`;
}

function csvCell(value) {
  const escaped = text(value).replaceAll('"', '""');
  return `"${escaped}"`;
}

export function buildPortalCsv(packet) {
  const rows = [["Section", "Official portal field", "Project Pilot source", "Prepared value", "Required"]];
  for (const field of packet?.portalFields || []) {
    rows.push([field.section, field.portalLabel, field.projectPilotLabel, field.value, field.required ? "Yes" : "No"]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function packetFileBase(packet) {
  return text(packet?.projectTitle || "permit-application")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "permit-application";
}
