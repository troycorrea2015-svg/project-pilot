export const PERMIT_CASE_STATUSES = [
  { key: "draft", label: "Draft" },
  { key: "collecting", label: "Collecting information" },
  { key: "ready_for_review", label: "Ready for review" },
  { key: "authorized", label: "Authorized" },
  { key: "concierge_requested", label: "Concierge requested" },
  { key: "submitted", label: "Submitted" },
  { key: "correction_required", label: "Correction required" },
  { key: "approved", label: "Approved" },
  { key: "inspection", label: "Inspections" },
  { key: "closed", label: "Closed" },
];

const BASE_QUESTIONS = [
  { key: "owner_name", label: "Property owner full name", type: "text", required: true, section: "Applicant" },
  { key: "applicant_phone", label: "Applicant phone", type: "tel", required: true, section: "Applicant" },
  { key: "applicant_email", label: "Applicant email", type: "email", required: true, section: "Applicant" },
  { key: "applicant_role", label: "Who will submit the application?", type: "select", options: ["Homeowner", "Contractor", "Authorized agent"], required: true, section: "Applicant" },
  { key: "parcel_number", label: "Parcel / tax map number", type: "text", required: false, section: "Property" },
  { key: "estimated_cost", label: "Estimated project cost", type: "number", required: true, section: "Project" },
  { key: "work_description", label: "Detailed scope of work", type: "textarea", required: true, section: "Project" },
  { key: "desired_start_date", label: "Desired start date", type: "date", required: false, section: "Project" },
  { key: "contractor_name", label: "Contractor / company name", type: "text", requiredWhen: { key: "applicant_role", value: "Contractor" }, section: "Contractor" },
  { key: "contractor_license", label: "Contractor license number", type: "text", requiredWhen: { key: "applicant_role", value: "Contractor" }, section: "Contractor" },
  { key: "structural_work", label: "Does the project change structural framing?", type: "yesno", required: true, section: "Scope" },
  { key: "electrical_work", label: "Does the project include electrical work?", type: "yesno", required: true, section: "Scope" },
  { key: "plumbing_work", label: "Does the project include plumbing work?", type: "yesno", required: true, section: "Scope" },
  { key: "mechanical_work", label: "Does the project include HVAC / mechanical work?", type: "yesno", required: true, section: "Scope" },
  { key: "excavation_work", label: "Will there be excavation or ground disturbance?", type: "yesno", required: true, section: "Scope" },
];

const PROJECT_QUESTIONS = {
  deck: [
    { key: "deck_length", label: "Deck length (ft)", type: "number", required: true, section: "Deck" },
    { key: "deck_width", label: "Deck width (ft)", type: "number", required: true, section: "Deck" },
    { key: "deck_height", label: "Maximum deck height above grade (ft)", type: "number", required: true, section: "Deck" },
    { key: "deck_attached", label: "Will the deck attach to the home?", type: "yesno", required: true, section: "Deck" },
    { key: "deck_stairs", label: "Will the deck include stairs?", type: "yesno", required: true, section: "Deck" },
    { key: "deck_railings", label: "Will guards / railings be installed?", type: "yesno", required: true, section: "Deck" },
    { key: "deck_material", label: "Primary decking material", type: "text", required: true, section: "Deck" },
  ],
  fence: [
    { key: "fence_length", label: "Total fence length (linear ft)", type: "number", required: true, section: "Fence" },
    { key: "fence_height", label: "Maximum fence height (ft)", type: "number", required: true, section: "Fence" },
    { key: "fence_material", label: "Fence material", type: "text", required: true, section: "Fence" },
    { key: "pool_barrier", label: "Will this fence serve as a pool barrier?", type: "yesno", required: true, section: "Fence" },
  ],
  shed: [
    { key: "structure_length", label: "Structure length (ft)", type: "number", required: true, section: "Structure" },
    { key: "structure_width", label: "Structure width (ft)", type: "number", required: true, section: "Structure" },
    { key: "structure_height", label: "Structure height (ft)", type: "number", required: true, section: "Structure" },
    { key: "foundation_type", label: "Foundation type", type: "text", required: true, section: "Structure" },
    { key: "structure_utilities", label: "Will the structure have utilities?", type: "yesno", required: true, section: "Structure" },
  ],
  roof: [
    { key: "roof_area", label: "Approximate roof area (sq ft)", type: "number", required: true, section: "Roof" },
    { key: "roof_layers", label: "Existing roof layers", type: "number", required: true, section: "Roof" },
    { key: "roof_material", label: "New roofing material", type: "text", required: true, section: "Roof" },
    { key: "roof_deck_repair", label: "Is roof-deck repair expected?", type: "yesno", required: true, section: "Roof" },
  ],
  kitchen: [
    { key: "room_area", label: "Approximate room area (sq ft)", type: "number", required: true, section: "Interior" },
    { key: "wall_removal", label: "Will any wall be removed or altered?", type: "yesno", required: true, section: "Interior" },
    { key: "fixture_relocation", label: "Will plumbing fixtures or appliances move?", type: "yesno", required: true, section: "Interior" },
  ],
  bathroom: [
    { key: "room_area", label: "Approximate room area (sq ft)", type: "number", required: true, section: "Interior" },
    { key: "wall_removal", label: "Will any wall be removed or altered?", type: "yesno", required: true, section: "Interior" },
    { key: "fixture_relocation", label: "Will plumbing fixtures move?", type: "yesno", required: true, section: "Interior" },
  ],
  addition: [
    { key: "addition_area", label: "Addition area (sq ft)", type: "number", required: true, section: "Addition" },
    { key: "addition_stories", label: "Number of stories", type: "number", required: true, section: "Addition" },
    { key: "addition_use", label: "Intended use of the addition", type: "text", required: true, section: "Addition" },
    { key: "addition_foundation", label: "Foundation type", type: "text", required: true, section: "Addition" },
  ],
  pool: [
    { key: "pool_type", label: "Pool type", type: "select", options: ["In-ground", "Above-ground", "Spa / hot tub"], required: true, section: "Pool" },
    { key: "pool_length", label: "Pool length (ft)", type: "number", required: true, section: "Pool" },
    { key: "pool_width", label: "Pool width (ft)", type: "number", required: true, section: "Pool" },
    { key: "pool_depth", label: "Maximum depth (ft)", type: "number", required: true, section: "Pool" },
    { key: "pool_barrier_plan", label: "Describe the required barrier / gate plan", type: "textarea", required: true, section: "Pool" },
  ],
  general: [
    { key: "project_dimensions", label: "Key project dimensions", type: "text", required: true, section: "Project" },
    { key: "existing_conditions", label: "Existing conditions that affect the work", type: "textarea", required: false, section: "Project" },
  ],
};

const PROJECT_DOCUMENTS = {
  deck: [
    ["site_plan", "Site / plot plan showing deck location and setbacks"],
    ["deck_plan", "Deck plan with dimensions, framing, stairs, guards, and footings"],
    ["connection_detail", "Ledger / house connection detail or freestanding detail"],
  ],
  fence: [
    ["site_plan", "Site / plot plan showing property lines and fence location"],
    ["fence_detail", "Fence height, material, gate, and post detail"],
  ],
  shed: [
    ["site_plan", "Site / plot plan showing structure location and setbacks"],
    ["structure_plans", "Structure plans or manufacturer specifications"],
    ["foundation_detail", "Foundation / anchoring detail"],
  ],
  roof: [
    ["roof_scope", "Roofing scope, material specifications, and affected area"],
    ["contractor_credentials", "Contractor license and insurance, when applicable"],
  ],
  kitchen: [
    ["floor_plan", "Existing and proposed floor plan"],
    ["trade_scope", "Electrical, plumbing, and mechanical scope"],
  ],
  bathroom: [
    ["floor_plan", "Existing and proposed floor plan"],
    ["trade_scope", "Electrical, plumbing, ventilation, and waterproofing scope"],
  ],
  addition: [
    ["site_plan", "Site / plot plan with setbacks and addition footprint"],
    ["architectural_plans", "Architectural plans, elevations, and sections"],
    ["structural_plans", "Structural plans and calculations when required"],
    ["energy_documents", "Energy-code documentation when required"],
  ],
  pool: [
    ["site_plan", "Site / plot plan showing pool, equipment, setbacks, and barriers"],
    ["pool_specs", "Pool manufacturer / construction specifications"],
    ["barrier_plan", "Fence, gate, alarm, or barrier details"],
  ],
  general: [
    ["site_or_floor_plan", "Site plan or floor plan showing the proposed work"],
    ["project_drawings", "Project drawings, specifications, or scope"],
  ],
};

const PROJECT_INSPECTIONS = {
  deck: ["Footing / excavation", "Framing", "Final"],
  fence: ["Location / setback when required", "Final"],
  shed: ["Foundation", "Framing", "Electrical when applicable", "Final"],
  roof: ["In-progress when required", "Final"],
  kitchen: ["Rough electrical", "Rough plumbing", "Rough mechanical", "Framing when applicable", "Final"],
  bathroom: ["Rough plumbing", "Rough electrical", "Waterproofing when required", "Final"],
  addition: ["Footing", "Foundation", "Framing", "Rough trades", "Insulation", "Final"],
  pool: ["Excavation / bonding", "Electrical", "Barrier", "Final"],
  general: ["Required rough inspection", "Final"],
};

export function normalizePermitProjectType(value) {
  const clean = String(value || "").toLowerCase();
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

function uniqueDocuments(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildPermitBlueprint({ project, permitResult, user }) {
  const projectType = normalizePermitProjectType(project?.project_type || project?.title || project?.description);
  const questions = [...BASE_QUESTIONS, ...(PROJECT_QUESTIONS[projectType] || PROJECT_QUESTIONS.general)];
  const baseDocuments = [
    { key: "ownership", label: "Proof of ownership or owner authorization", required: true, source: "Project Pilot" },
    { key: "application_id", label: "Applicant identification and contact information", required: true, source: "Project Pilot" },
  ];
  const projectDocuments = (PROJECT_DOCUMENTS[projectType] || PROJECT_DOCUMENTS.general).map(([key, label]) => ({ key, label, required: true, source: "Project type" }));
  const authorityDocuments = (permitResult?.documents || []).slice(0, 8).map((label, index) => ({
    key: `authority_${index + 1}`,
    label: String(label),
    required: true,
    source: permitResult?.jurisdiction || "Matched authority",
  }));
  const incorporatedPlace = permitResult?.locationGeography?.incorporatedPlace;
  const municipalDocuments = incorporatedPlace
    ? [{ key: "municipal_approval", label: `${incorporatedPlace} zoning or municipal approval, when required`, required: true, source: "Jurisdiction route" }]
    : [];

  const application = permitResult?.primaryApplication || null;
  const prefilledAnswers = {
    applicant_email: user?.email || "",
    estimated_cost: project?.budget ? String(project.budget) : "",
    work_description: project?.description || "",
  };

  return {
    projectType,
    questions,
    checklist: uniqueDocuments([...baseDocuments, ...projectDocuments, ...authorityDocuments, ...municipalDocuments]),
    inspections: (PROJECT_INSPECTIONS[projectType] || PROJECT_INSPECTIONS.general).map((name, index) => ({
      id: `inspection-${index + 1}`,
      name,
      status: "not_scheduled",
      scheduled_at: "",
      result: "",
      notes: "",
    })),
    jurisdiction: permitResult?.jurisdiction || project?.jurisdiction || "Jurisdiction confirmation required",
    jurisdictionConfidence: permitResult?.jurisdictionConfidence || "review",
    applicationUrl: application?.url || "",
    applicationLabel: application?.label || "Official application not yet matched",
    submissionMethod: application?.method || "Guided submission",
    prefilledAnswers,
  };
}

export function questionIsRequired(question, answers = {}) {
  if (question.required) return true;
  if (question.requiredWhen) return answers?.[question.requiredWhen.key] === question.requiredWhen.value;
  return false;
}

export function calculatePermitReadiness({ permitCase, blueprint }) {
  if (!permitCase || !blueprint) return { score: 0, missingAnswers: [], missingDocuments: [], authorized: false };
  const answers = permitCase.answers || {};
  const documentLinks = permitCase.document_links || {};
  const requiredQuestions = blueprint.questions.filter((question) => questionIsRequired(question, answers));
  const missingAnswers = requiredQuestions.filter((question) => {
    const value = answers[question.key];
    return value === undefined || value === null || String(value).trim() === "";
  });
  const requiredDocuments = blueprint.checklist.filter((item) => item.required);
  const missingDocuments = requiredDocuments.filter((item) => !documentLinks[item.key]);
  const jurisdictionReady = Boolean(permitCase.jurisdiction && permitCase.jurisdiction_confidence !== "low");
  const answerRatio = requiredQuestions.length ? (requiredQuestions.length - missingAnswers.length) / requiredQuestions.length : 1;
  const documentRatio = requiredDocuments.length ? (requiredDocuments.length - missingDocuments.length) / requiredDocuments.length : 1;
  const authorized = Boolean(permitCase.authorization_confirmed_at && permitCase.authorization_name);
  const score = Math.round((jurisdictionReady ? 15 : 5) + answerRatio * 45 + documentRatio * 35 + (authorized ? 5 : 0));
  return { score: Math.max(0, Math.min(score, 100)), missingAnswers, missingDocuments, authorized };
}

export function statusLabel(status) {
  return PERMIT_CASE_STATUSES.find((item) => item.key === status)?.label || "In progress";
}
