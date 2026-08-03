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
    const normalized = String(value ?? "").trim().toLowerCase();
    return value === undefined || value === null || normalized === "" || normalized === "not sure" || normalized === "not sure yet" || normalized === "i don't know yet";
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


const QUESTION_GUIDANCE = {
  owner_name: {
    prompt: "Who legally owns the property?",
    why: "The permit office uses the owner name to confirm who is responsible for the property and who may authorize the work.",
    example: "Use the name exactly as it appears on the deed or ownership record.",
    placeholder: "Full legal name",
  },
  applicant_phone: {
    prompt: "What phone number should the permit office use?",
    why: "Reviewers may call if something is missing or if they need a quick clarification.",
    example: "Use a number you check regularly.",
    placeholder: "(302) 555-0123",
  },
  applicant_email: {
    prompt: "What email should receive permit updates?",
    why: "Online permit systems usually send account invitations, correction notices, approvals, and inspection updates by email.",
    example: "Use the same email you will use to sign into the official permit portal.",
    placeholder: "name@example.com",
  },
  applicant_role: {
    prompt: "Who will be listed as the permit applicant?",
    why: "The applicant is the person who signs in, receives official notices, and may need to confirm or sign the application.",
    example: "Choose Homeowner if you will submit it yourself. Choose Contractor if your contractor will submit it.",
  },
  parcel_number: {
    prompt: "Do you know the parcel or tax map number?",
    why: "This helps the permit office match the application to the correct property. It is usually found on a tax bill, deed, or county property record.",
    example: "It is okay to skip this for now if you do not have it.",
    placeholder: "Parcel / tax map number",
  },
  estimated_cost: {
    prompt: "About how much will the whole project cost?",
    why: "Many permit offices use the estimated construction value to calculate review or permit fees.",
    example: "Include labor and materials. A reasonable estimate is better than leaving it blank.",
    placeholder: "Example: 18000",
  },
  work_description: {
    prompt: "In plain English, what work will be done?",
    why: "The permit reviewer needs a clear scope so they know which rules, plans, and inspections apply.",
    example: "Replace the existing 12 x 20 deck, add code-compliant stairs and railings, and reuse the current location.",
    placeholder: "Describe what is being removed, built, moved, repaired, or replaced.",
  },
  desired_start_date: {
    prompt: "When would you like the work to begin?",
    why: "This helps Project Pilot flag timing risks, but it does not guarantee the permit will be approved by that date.",
    example: "Choose your preferred start date, not the date construction already began.",
  },
  contractor_name: {
    prompt: "What is the contractor or company name?",
    why: "If the contractor is the applicant, the permit office may require their business and licensing information.",
    example: "Use the legal company name shown on the proposal or license.",
    placeholder: "Contractor or company name",
  },
  contractor_license: {
    prompt: "What is the contractor's license number?",
    why: "Some permit types require the contractor's license or registration before submission.",
    example: "Copy the number from the contractor's license or official proposal.",
    placeholder: "License number",
  },
  structural_work: {
    prompt: "Will the project change anything that helps hold up the structure?",
    why: "Changes to beams, posts, joists, load-bearing walls, foundations, or roof framing may require structural drawings or professional review.",
    example: "Answer Yes for new beams, moving a load-bearing wall, changing deck framing, or adding a foundation.",
  },
  electrical_work: {
    prompt: "Will anyone add, move, or replace electrical wiring or equipment?",
    why: "Electrical work may need a separate permit and inspection.",
    example: "This includes outlets, lights, wiring, panels, pool equipment, or new circuits.",
  },
  plumbing_work: {
    prompt: "Will anyone add, move, or replace water or drain lines?",
    why: "Plumbing work may need a separate state or local permit and inspection.",
    example: "Answer Yes if a sink, toilet, shower, water heater, or drain is moving or being added.",
  },
  mechanical_work: {
    prompt: "Will the project change heating, cooling, ventilation, or gas equipment?",
    why: "HVAC, exhaust, gas, or ventilation changes can trigger a separate trade permit or inspection.",
    example: "Answer Yes for new ductwork, a new exhaust fan, gas line work, or equipment relocation.",
  },
  excavation_work: {
    prompt: "Will anyone dig into the ground?",
    why: "Digging can affect utilities, footings, drainage, septic systems, setbacks, and required inspections.",
    example: "Answer Yes for deck footings, a pool, fence posts, a foundation, or utility trenches.",
  },
  deck_length: {
    prompt: "How long will the deck be?",
    why: "The permit plan needs the deck footprint and dimensions.",
    example: "Measure the longest side in feet.",
    placeholder: "Length in feet",
  },
  deck_width: {
    prompt: "How far will the deck extend out from the home?",
    why: "This dimension affects setbacks, framing, footing locations, and the total deck area.",
    example: "Measure from the home toward the yard.",
    placeholder: "Width in feet",
  },
  deck_height: {
    prompt: "At the highest point, how far will the deck floor be above the ground?",
    why: "Deck height affects stairs, guards, footings, and plan requirements.",
    example: "Measure from the ground to the walking surface, in feet.",
    placeholder: "Height in feet",
  },
  deck_attached: {
    prompt: "Will the deck be connected to the home?",
    why: "An attached deck usually needs a connection detail showing how it is fastened to the house. A freestanding deck uses a different support method.",
    example: "Choose Yes if a ledger or framing will be fastened to the home.",
  },
  deck_stairs: {
    prompt: "Will the deck have stairs?",
    why: "Stairs add plan details and may create additional inspection requirements.",
    example: "Choose Yes even if there are only a few steps.",
  },
  deck_railings: {
    prompt: "Will the deck have guards or railings?",
    why: "Guard height, spacing, and attachment details may need to appear on the permit plan.",
    example: "Choose Yes if railings will be installed around the deck or stairs.",
  },
  deck_material: {
    prompt: "What material will be used for the deck surface?",
    why: "The reviewer may need to understand the product type and how it will be installed.",
    example: "Pressure-treated wood, composite decking, cedar, or another listed product.",
    placeholder: "Decking material",
  },
  fence_length: { prompt: "About how many total feet of fence will be installed?", why: "The permit or zoning review may need the full fence layout.", example: "Add all fence sections together.", placeholder: "Linear feet" },
  fence_height: { prompt: "What is the tallest the fence will be?", why: "Fence height rules often depend on where the fence sits on the property.", example: "Enter the maximum height in feet.", placeholder: "Height in feet" },
  fence_material: { prompt: "What will the fence be made from?", why: "Material and design can affect zoning, visibility, and pool-barrier requirements.", example: "Vinyl privacy, wood, aluminum, chain link, or another material.", placeholder: "Fence material" },
  pool_barrier: { prompt: "Will this fence protect a pool or spa?", why: "Pool barriers usually have special gate, latch, height, and opening requirements.", example: "Choose Yes if the fence is part of the required pool enclosure." },
  structure_length: { prompt: "How long will the structure be?", why: "The permit office needs the building footprint.", example: "Measure the longest side in feet.", placeholder: "Length in feet" },
  structure_width: { prompt: "How wide will the structure be?", why: "The width helps determine the total area and setback review.", example: "Measure the shorter side in feet.", placeholder: "Width in feet" },
  structure_height: { prompt: "How tall will the structure be?", why: "Height can affect zoning and construction requirements.", example: "Use the highest point of the roof.", placeholder: "Height in feet" },
  foundation_type: { prompt: "How will the structure be supported?", why: "The permit plan may need footing, slab, pier, or anchoring details.", example: "Concrete slab, blocks, piers, helical piles, or another system.", placeholder: "Foundation type" },
  structure_utilities: { prompt: "Will the structure have electricity, plumbing, heating, or cooling?", why: "Utilities may trigger separate trade permits and inspections.", example: "Choose Yes if any utility will be added now or as part of this project." },
  roof_area: { prompt: "About how much roof area will be replaced?", why: "The permit office may use the area to understand the scope and value.", example: "Use square feet if known. Your contractor may have this measurement.", placeholder: "Square feet" },
  roof_layers: { prompt: "How many layers of roofing are already on the roof?", why: "The existing layers can affect tear-off requirements and structural load.", example: "Ask the roofer if you are unsure.", placeholder: "Number of layers" },
  roof_material: { prompt: "What roofing material will be installed?", why: "The material helps identify product and code requirements.", example: "Architectural asphalt shingles, metal roofing, membrane, or another product.", placeholder: "New roofing material" },
  roof_deck_repair: { prompt: "Do you expect damaged roof sheathing or decking to be repaired?", why: "Repairing the structural roof deck may change the permit scope.", example: "Choose Not sure if the condition will not be known until tear-off." },
  room_area: { prompt: "About how large is the room?", why: "Room size helps define the project scope and plan.", example: "Length multiplied by width gives the approximate square feet.", placeholder: "Square feet" },
  wall_removal: { prompt: "Will any wall be removed, opened, or moved?", why: "A wall may be load-bearing and could require framing details or professional review.", example: "Choose Yes even for a partial wall opening." },
  fixture_relocation: { prompt: "Will any sink, toilet, shower, tub, or major appliance move?", why: "Moving fixtures often changes plumbing, electrical, or ventilation work.", example: "Choose No if everything stays in the same location." },
  addition_area: { prompt: "How many square feet will the addition add?", why: "The new floor area affects zoning, plans, fees, and code review.", example: "Length multiplied by width gives the approximate area.", placeholder: "Square feet" },
  addition_stories: { prompt: "How many levels will the addition have?", why: "The number of stories affects structural, egress, and plan requirements.", example: "Enter 1 for a single-story addition.", placeholder: "Number of stories" },
  addition_use: { prompt: "What will the new space be used for?", why: "The intended use determines which building and safety rules apply.", example: "Bedroom, family room, garage, sunroom, or another use.", placeholder: "Intended use" },
  addition_foundation: { prompt: "What type of foundation is planned?", why: "The foundation must match the addition design and site conditions.", example: "Crawlspace, slab, basement, piers, or another system.", placeholder: "Foundation type" },
  pool_type: { prompt: "What type of pool or spa is planned?", why: "Different pool types have different plan, barrier, electrical, and setback requirements.", example: "Choose the closest match." },
  pool_length: { prompt: "How long will the pool be?", why: "The site plan needs the pool footprint.", example: "Enter the outside dimension in feet.", placeholder: "Length in feet" },
  pool_width: { prompt: "How wide will the pool be?", why: "The width is needed for setback and site-plan review.", example: "Enter the outside dimension in feet.", placeholder: "Width in feet" },
  pool_depth: { prompt: "What will the maximum pool depth be?", why: "Depth can affect construction details and safety requirements.", example: "Enter the deepest point in feet.", placeholder: "Depth in feet" },
  pool_barrier_plan: { prompt: "How will the pool area be protected?", why: "The permit reviewer may require details for fencing, gates, latches, alarms, or other barriers.", example: "Describe the fence height, gate location, self-closing latch, and any alarms.", placeholder: "Describe the barrier and gate plan" },
  project_dimensions: { prompt: "What are the main project dimensions?", why: "The permit office needs enough measurements to understand the size and location of the work.", example: "Include length, width, height, area, and distance from property lines when known.", placeholder: "Key dimensions" },
  existing_conditions: { prompt: "Is there anything about the existing property that could affect the work?", why: "Existing structures, slopes, utilities, septic systems, flood areas, or prior work can change the permit path.", example: "Mention anything the reviewer should know.", placeholder: "Existing conditions or site concerns" },
};

export function getQuestionGuidance(question) {
  const guidance = QUESTION_GUIDANCE[question?.key] || {};
  return {
    prompt: guidance.prompt || question?.label || "Permit question",
    why: guidance.why || "This answer helps the permit office understand the applicant, property, or proposed work.",
    example: guidance.example || "Answer as accurately as you can. You can return and change it later.",
    placeholder: guidance.placeholder || "Enter your answer",
  };
}

export function answerNeedsFollowUp(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return !normalized || normalized === "not sure" || normalized === "not sure yet" || normalized === "i don't know yet";
}

export function getDocumentGuidance(item) {
  const key = String(item?.key || "").toLowerCase();
  const label = String(item?.label || "Required document");
  if (key.includes("ownership")) return { plain: "A deed, long-term lease, mobile-home title, or other record showing who owns the property.", how: "Check your closing documents, county recorder records, or property files." };
  if (key.includes("application_id")) return { plain: "The applicant's name, contact details, and identification information.", how: "Project Pilot already stores most contact details. Keep a photo ID available if the authority asks for it." };
  if (key.includes("site") || label.toLowerCase().includes("plot")) return { plain: "A simple overhead drawing showing the property lines, house, proposed work, and distances to nearby property lines.", how: "Start with a survey if you have one. Mark the project location and measurements clearly." };
  if (key.includes("deck_plan") || key.includes("connection")) return { plain: "A drawing showing the deck size, posts, beams, joists, stairs, railings, footings, and how it connects to the house.", how: "A contractor, designer, manufacturer plan, or code-compliant deck plan may be needed." };
  if (key.includes("floor_plan")) return { plain: "A top-down drawing of the room before and after the work.", how: "Show walls, doors, windows, fixtures, appliances, and dimensions." };
  if (key.includes("trade_scope")) return { plain: "A description or drawing showing the electrical, plumbing, ventilation, or mechanical work.", how: "Ask the licensed trade contractor to identify what will be added, moved, or replaced." };
  if (key.includes("structural") || key.includes("architectural")) return { plain: "Construction drawings showing how the project will be built safely.", how: "Larger or structural projects may require drawings from a qualified design professional." };
  if (key.includes("contractor")) return { plain: "The contractor's license, registration, and insurance information when required.", how: "Ask the contractor for current copies before submission." };
  if (key.includes("municipal")) return { plain: "Written zoning or municipal approval from the town or city when the property is inside municipal limits.", how: "Contact the town zoning office or follow the local application link shown by Project Pilot." };
  if (key.includes("pool") || key.includes("barrier")) return { plain: "Pool construction details and the safety barrier, gate, latch, alarm, or enclosure plan.", how: "Use the pool contractor or manufacturer specifications and show the barrier on the site plan." };
  if (key.includes("energy")) return { plain: "Energy-code information showing insulation, windows, doors, and equipment performance when required.", how: "Your contractor, designer, or energy professional may prepare this." };
  return { plain: label, how: "Upload the clearest current document you have. Project Pilot will keep it linked to this permit case." };
}

export function buildSubmissionGuide({ blueprint, permitResult }) {
  const jurisdiction = String(blueprint?.jurisdiction || "").toLowerCase();
  const applicationUrl = blueprint?.applicationUrl || "";
  const incorporatedPlace = permitResult?.locationGeography?.incorporatedPlace || "";
  const commonFinish = [
    { id: "reference", title: "Save the application number", plain: "Copy the confirmation or application number into Project Pilot. This is how you will track the case and contact the permit office.", action: "Record the number below" },
    { id: "monitor", title: "Watch for review messages", plain: "The permit office may ask for missing information or corrected plans. Project Pilot can translate the message and prepare your next steps.", action: "Return here when a message arrives" },
    { id: "approval", title: "Download the approved permit", plain: "Do not begin permit-required work until the authority issues the permit. Save the permit and approved plans in Project Pilot.", action: "Mark approved when issued" },
  ];

  if (jurisdiction.includes("new castle")) {
    return [
      { id: "account", title: "Create or open your eServices account", plain: "Use the same applicant email entered in Project Pilot. The person named as the applicant should be the person who signs into ePlans.", action: "Open eServices", url: applicationUrl },
      { id: "eapply", title: "Start the permit application in eApply", plain: "Choose the permit type, then copy the prepared applicant, property, project, and contractor information from your Project Pilot packet.", action: "Use the prepared answers" },
      { id: "invitation", title: "Wait for the ePlans invitation", plain: "After the initial application is processed, New Castle County sends an email inviting the applicant to upload plans and documents.", action: "Check the applicant email" },
      { id: "upload", title: "Upload plans and documents in ePlans", plain: "Upload each required plan and supporting document, then complete the assigned Upload and Submit task.", action: "Use the document checklist" },
      { id: "prescreen", title: "Complete prescreen corrections", plain: "County staff first check whether the submission is complete. If they ask for a missing file, upload it and complete the assigned task again.", action: "Resolve missing items" },
      ...commonFinish,
    ];
  }

  if (jurisdiction.includes("kent")) {
    const municipal = incorporatedPlace ? [{ id: "town", title: `Confirm ${incorporatedPlace} approval`, plain: "Projects inside a town may need town zoning approval before or alongside the county building permit.", action: "Save the town approval" }] : [];
    return [
      { id: "account", title: "Create or open your MyGovernmentOnline account", plain: "Use the applicant email entered in Project Pilot so official notices go to the correct person.", action: "Open MyGovernmentOnline", url: applicationUrl },
      ...municipal,
      { id: "application", title: "Start the building permit application", plain: "Choose the project type and copy the prepared property, scope, cost, contractor, and trade information from Project Pilot.", action: "Use the prepared answers" },
      { id: "documents", title: "Upload the required plans and approvals", plain: "Use the Project Pilot checklist so the application is not delayed by missing documents.", action: "Upload the linked files" },
      { id: "trade", title: "Handle separate trade permits", plain: "Electrical and plumbing work may require separate State of Delaware permits. A licensed subcontractor normally obtains them; a qualifying homeowner may need the state homeowner process.", action: "Confirm who is responsible" },
      { id: "submit", title: "Review, certify, and submit", plain: "Check every answer, complete the portal certification, and pay any required government fee.", action: "Submit in the official portal" },
      ...commonFinish,
    ];
  }

  if (jurisdiction.includes("sussex")) {
    return [
      { id: "account", title: "Create or open your Sussex County account", plain: "Sign in to Citizen Self Service using the applicant email entered in Project Pilot.", action: "Open Citizen Self Service", url: applicationUrl },
      { id: "permits", title: "Open Permits and Inspections", plain: "Choose the permit application that best matches the project. Use the jurisdiction and application route Project Pilot identified.", action: "Start the application" },
      { id: "application", title: "Enter the prepared project information", plain: "Copy the owner, applicant, property, cost, scope, contractor, and project-specific answers from your Project Pilot packet.", action: "Use the prepared answers" },
      { id: "documents", title: "Upload the required documents", plain: "Use the Project Pilot checklist to attach the site plan, construction plans, approvals, and supporting records.", action: "Upload the linked files" },
      { id: "submit", title: "Review, certify, and submit", plain: "Check every answer, complete any required certification, and pay the government fee shown by the portal.", action: "Submit in the official portal" },
      ...commonFinish,
    ];
  }

  return [
    { id: "account", title: "Open the official permit application", plain: "Create an account or sign in using the applicant information saved in Project Pilot.", action: "Open official application", url: applicationUrl },
    { id: "application", title: "Copy the prepared answers", plain: "Use the Project Pilot permit packet to complete the owner, property, project, contractor, and scope fields.", action: "Use the prepared answers" },
    { id: "documents", title: "Upload the required documents", plain: "Attach each file from the Project Pilot document checklist.", action: "Upload the linked files" },
    { id: "submit", title: "Review and submit", plain: "Confirm the information, complete any required signature or certification, and pay the government fee.", action: "Submit in the official portal" },
    ...commonFinish,
  ];
}
