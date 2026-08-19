export const PERMIT_PROGRESS_STAGES = [
  { key: "intake", label: "Intake" },
  { key: "prepare", label: "Preparing" },
  { key: "ready", label: "Ready to File" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "inspections", label: "Inspections" },
  { key: "complete", label: "Complete" },
];

const SERVICE_PROGRESS = {
  requested: 6,
  intake_review: 12,
  preparing: 28,
  waiting_on_homeowner: 32,
  ready_for_submission: 55,
  filing: 64,
  submitted: 72,
  corrections: 76,
  approved: 86,
  inspections: 92,
  closeout: 97,
  closed: 100,
  cancelled: 0,
};

const CASE_PROGRESS = {
  draft: 5,
  collecting: 18,
  ready_for_review: 38,
  authorized: 52,
  concierge_requested: 56,
  submitted: 72,
  correction_required: 76,
  approved: 86,
  inspection: 93,
  closed: 100,
  cancelled: 0,
};

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function openTasks(tasks, owner) {
  return (tasks || []).filter((task) =>
    (!owner || task.assigned_to === owner) && !["completed", "cancelled"].includes(normalized(task.status))
  );
}

function completedConciergeTasks(tasks) {
  return (tasks || []).filter((task) => task.assigned_to === "concierge" && normalized(task.status) === "completed");
}

export function effectivePermitServiceStatus(status, tasks = []) {
  const current = normalized(status) || "requested";
  const officialStatuses = new Set(["filing", "submitted", "corrections", "approved", "inspections", "closeout", "closed", "cancelled"]);
  if (officialStatuses.has(current)) return current;

  if (openTasks(tasks, "homeowner").length) return "waiting_on_homeowner";

  const concierge = (tasks || [])
    .filter((task) => task.assigned_to === "concierge")
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const completed = completedConciergeTasks(tasks);
  const firstFive = concierge.slice(0, 5);
  const preparationComplete = firstFive.length >= 5 && firstFive.every((task) => normalized(task.status) === "completed");

  if (preparationComplete) return "ready_for_submission";
  if (completed.length || concierge.some((task, index) => index > 0 && normalized(task.status) === "in_progress")) return "preparing";
  if (current === "ready_for_submission") return "ready_for_submission";
  if (current === "preparing") return "preparing";
  return "intake_review";
}

export function permitProgressPercent(status, tasks = []) {
  const effective = effectivePermitServiceStatus(status, tasks);
  let progress = SERVICE_PROGRESS[effective] ?? 6;
  const concierge = (tasks || []).filter((task) => task.assigned_to === "concierge");
  if (["intake_review", "preparing", "waiting_on_homeowner", "ready_for_submission"].includes(effective) && concierge.length) {
    const completed = completedConciergeTasks(tasks).length;
    const taskProgress = 12 + Math.round((completed / concierge.length) * 43);
    progress = Math.max(progress, Math.min(55, taskProgress));
  }
  return Math.max(0, Math.min(100, progress));
}

export function permitProgressStageIndex(status, tasks = []) {
  const effective = effectivePermitServiceStatus(status, tasks);
  if (["requested", "intake_review"].includes(effective)) return 0;
  if (["preparing", "waiting_on_homeowner"].includes(effective)) return 1;
  if (effective === "ready_for_submission") return 2;
  if (["filing", "submitted", "corrections"].includes(effective)) return 3;
  if (effective === "approved") return 4;
  if (["inspections", "closeout"].includes(effective)) return 5;
  if (effective === "closed") return 6;
  return 0;
}

export function permitCaseJourneyPercent(status) {
  return CASE_PROGRESS[normalized(status)] ?? 5;
}

export function permitCaseStatusForServiceStatus(status) {
  const value = normalized(status);
  if (value === "submitted") return "submitted";
  if (value === "corrections") return "correction_required";
  if (value === "approved") return "approved";
  if (["inspections", "closeout"].includes(value)) return "inspection";
  if (value === "closed") return "closed";
  if (value === "cancelled") return "cancelled";
  return "concierge_requested";
}

export function projectProgressForPermitStatus(status) {
  const value = normalized(status);
  if (["requested", "intake_review"].includes(value)) return 45;
  if (["preparing", "waiting_on_homeowner"].includes(value)) return 50;
  if (value === "ready_for_submission") return 57;
  if (value === "filing") return 60;
  if (value === "submitted") return 63;
  if (value === "corrections") return 64;
  if (value === "approved") return 67;
  if (["inspections", "closeout"].includes(value)) return 72;
  if (value === "closed") return 75;
  return 45;
}

export function projectStatusForPermitStatus(status) {
  const value = normalized(status);
  if (["requested", "intake_review"].includes(value)) return "Permit Intake";
  if (["preparing", "waiting_on_homeowner"].includes(value)) return "Permit Preparation";
  if (value === "ready_for_submission") return "Permit Ready to File";
  if (value === "filing") return "Permit Filing";
  if (value === "submitted") return "Permit Submitted";
  if (value === "corrections") return "Permit Review Corrections";
  if (value === "approved") return "Permit Approved";
  if (["inspections", "closeout"].includes(value)) return "Permit Inspections";
  if (value === "closed") return "Permit Complete";
  if (value === "cancelled") return "Permit Service Cancelled";
  return "Permitting";
}

export function nextActionForPermitStatus(status) {
  const value = normalized(status);
  if (value === "requested" || value === "intake_review") return "Project Pilot is verifying the permit authority and requirements.";
  if (value === "preparing") return "Project Pilot is preparing the application information and permit package.";
  if (value === "waiting_on_homeowner") return "Complete the highlighted applicant-controlled action so permit work can continue.";
  if (value === "ready_for_submission") return "The permit package is ready for the official filing step.";
  if (value === "filing") return "Project Pilot is coordinating the official filing step.";
  if (value === "submitted") return "The application is submitted. Project Pilot is monitoring agency review.";
  if (value === "corrections") return "Project Pilot is working through the permit reviewer corrections.";
  if (value === "approved") return "The permit is approved. Review inspection requirements before work advances.";
  if (value === "inspections") return "Project Pilot is tracking required permit inspections.";
  if (value === "closeout") return "Project Pilot is organizing final approvals and permit closeout.";
  if (value === "closed") return "Permit process complete. Continue with the remaining project or final closeout.";
  return "Continue the permit workflow.";
}

export function serviceSummaryForStatus(status) {
  const value = normalized(status);
  if (value === "intake_review") return "Payment is confirmed. Project Pilot is reviewing the saved project and verifying the official permit route.";
  if (value === "preparing") return "Project Pilot is actively preparing the permit requirements, application information, and supporting package.";
  if (value === "waiting_on_homeowner") return "Project Pilot is paused only for an applicant-controlled item. Complete it and the workflow will resume.";
  if (value === "ready_for_submission") return "The preparation work is complete and the permit package is ready for the official filing step.";
  if (value === "filing") return "Project Pilot is coordinating the allowed filing and agency steps.";
  if (value === "submitted") return "The permit application is submitted and under agency review.";
  if (value === "corrections") return "Reviewer comments were received and Project Pilot is coordinating the correction response.";
  if (value === "approved") return "The permit is approved. Project Pilot is moving into inspection and completion tracking.";
  if (value === "inspections") return "Required inspections are being scheduled, tracked, and recorded.";
  if (value === "closeout") return "Final approvals and closeout records are being organized.";
  if (value === "closed") return "The permit process is complete and the final permit record is saved with the project.";
  return "Project Pilot has your permit request and is beginning the workflow.";
}

export function serviceStatusFromPermitCaseStatus(status) {
  const value = normalized(status);
  if (["draft", "collecting"].includes(value)) return "intake_review";
  if (value === "ready_for_review") return "preparing";
  if (value === "authorized") return "ready_for_submission";
  if (value === "concierge_requested") return "preparing";
  if (value === "submitted") return "submitted";
  if (value === "correction_required") return "corrections";
  if (value === "approved") return "approved";
  if (value === "inspection") return "inspections";
  if (value === "closed") return "closed";
  if (value === "cancelled") return "cancelled";
  return "intake_review";
}
