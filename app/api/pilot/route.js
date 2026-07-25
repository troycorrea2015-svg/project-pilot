import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qytzrlupvkqdulffnpez.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_zi6CB203ohT4Qx8GazWqBw_fjsJS51f";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function inferProjectType(message) {
  const text = message.toLowerCase();
  const types = [
    ["deck", "Deck"], ["garage", "Garage"], ["shed", "Shed"], ["fence", "Fence"],
    ["roof", "Roofing"], ["kitchen", "Kitchen Remodel"], ["bathroom", "Bathroom Remodel"],
    ["addition", "Addition"], ["pool", "Pool"], ["driveway", "Driveway"],
    ["commercial", "Commercial Improvement"], ["remodel", "Remodel"], ["renovation", "Renovation"],
    ["house", "New Home"], ["home", "Home Project"], ["building", "Building Project"],
  ];
  return types.find(([term]) => text.includes(term))?.[1] || "";
}

function inferBudget(message) {
  const match = message.match(/\$?\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s?(k|thousand)?/i);
  if (!match) return "";
  let amount = Number(match[1].replaceAll(",", ""));
  if (match[2]) amount *= 1000;
  if (amount < 100) return "";
  return amount;
}

function inferTimeline(message) {
  const text = message.toLowerCase();
  const match = text.match(/(?:in|within|about)\s+(\d+)\s+(day|days|week|weeks|month|months)/);
  if (match) return `${match[1]} ${match[2]}`;
  if (text.includes("as soon as possible") || text.includes("asap")) return "As soon as possible";
  if (text.includes("this summer")) return "This summer";
  if (text.includes("this fall")) return "This fall";
  if (text.includes("this winter")) return "This winter";
  if (text.includes("this spring")) return "This spring";
  return "";
}

function inferRole(message) {
  const text = message.toLowerCase();
  if (text.includes("contractor") || text.includes("client")) return "Contractor";
  if (text.includes("property manager")) return "Property Manager";
  if (text.includes("project manager")) return "Project Manager";
  if (text.includes("developer") || text.includes("investor")) return "Developer / Investor";
  if (text.includes("my house") || text.includes("my home") || text.includes("homeowner") || text.includes("doing it myself")) return "Owner";
  return "";
}

function inferAddress(message) {
  const match = message.match(/\b\d{1,6}\s+[A-Za-z0-9.' -]+\s(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|highway|hwy|way|circle|cir)\b[^\n,]*/i);
  return match ? match[0].trim() : "";
}

function buildPlainLanguageHelp(message, project) {
  const text = message.toLowerCase();
  const projectType = project.project_type || "project";

  const definitions = [
    ["setback", "A setback is the minimum distance required between your project and a property line, road, waterway, or another structure. The exact distance depends on the property and governing office."],
    ["zoning", "Zoning rules decide whether a project is allowed at a location and where it may be placed. Zoning approval may be needed before a building permit."],
    ["jurisdiction", "The jurisdiction is the town, city, county, or state office responsible for the project address. A mailing address does not always identify the correct governing office."],
    ["inspection", "An inspection is an official review of completed work. Some projects require several inspections at different stages before the work can be approved."],
    ["permit", `A permit is official approval that may be required before work begins. For this ${projectType}, Project Pilot can organize likely requirements and official starting points, but the governing office must confirm the final answer.`],
    ["estimate", "An estimate is a planning range, not a guaranteed price. Use it to compare options, then confirm real pricing with contractors, suppliers, or signed proposals."],
    ["flight plan", "The Flight Plan is Project Pilot's name for the step-by-step Project Plan. It shows what has been completed and what should happen next."],
    ["waypoint", "A waypoint is simply a project step. Project Pilot now uses the plain-language label Project Step in most places."],
    ["binder", "The Project Binder is the Files & Documents area where plans, photos, estimates, approvals, contracts, receipts, and inspection records are stored."],
  ];

  const match = definitions.find(([term]) => text.includes(term));
  if (match && (text.includes("what") || text.includes("mean") || text.includes("explain") || text.includes("confused") || text.includes("help"))) {
    return match[1];
  }

  if (text.includes("what should i do next") || text.includes("next step") || text.includes("where do i start")) {
    return project.next_step
      ? `Your next recommended step is: ${project.next_step}. Open the related section from the left menu, and I can explain any part that is unclear.`
      : "Start by describing the work you want completed, the project address, and your preferred timeline. I will use that information to organize the next steps.";
  }

  if (text.includes("what am i missing") || text.includes("missing information") || text.includes("missing documents")) {
    const missing = [];
    if (!project.project_type) missing.push("project type");
    if (!project.description) missing.push("a short project description");
    if (!project.address) missing.push("project address");
    if (!project.target_timeline) missing.push("target timeline");
    if (!project.budget) missing.push("planning budget");
    if (!project.permit_research) missing.push("permit and approval check");
    if (!missing.length) return "The main setup information is present. Review the Project Plan for incomplete steps and add any plans, quotes, approvals, or photos to Files & Documents.";
    return `The main items still missing are: ${missing.join(", ")}. You do not have to complete everything at once—start with the first item and I will guide you forward.`;
  }

  if (text.includes("confused") || text.includes("i don't understand") || text.includes("i do not understand") || text.includes("help me")) {
    return "I can help. Tell me the exact word, requirement, button, or message that is confusing. I will explain it in plain language and give you one clear next action.";
  }

  return "";
}

function buildGuidedReply(project, extracted, accountRole) {
  const known = {
    type: extracted.project_type || project.project_type,
    address: extracted.address || project.address,
    role: extracted.project_role || project.project_role,
    timeline: extracted.target_timeline || project.target_timeline,
    budget: extracted.budget || project.budget,
    description: project.description,
  };

  if (!known.type) {
    if (accountRole === "Contractor") return "Let’s open the client job correctly. What work are you estimating, permitting, or preparing to complete?";
    if (accountRole === "Property Manager") return "Let’s define the property project first. What maintenance, renovation, compliance, or capital work needs to be completed?";
    if (accountRole === "Developer") return "Let’s define the development opportunity first. What are you planning to build, renovate, or evaluate?";
    return "Let’s define the project in simple steps. What are you planning to build, repair, or renovate?";
  }
  if (!known.description) {
    return `I’ve marked this as a ${known.type} project. Give me a short description of the work and what you want the finished result to accomplish.`;
  }
  if (!known.address) {
    return "Good progress. What is the project address? You can enter the street address now; map pin placement is coming in the next build.";
  }
  if (!known.role) {
    return "Who will be managing the work: the property owner, a contractor, a property manager, or a developer?";
  }
  if (!known.timeline) {
    return "When would you ideally like the project completed? A rough season, month, or number of weeks is enough.";
  }
  if (!known.budget) {
    return "Do you have a working budget range? You can give a rough number, and it can be changed later.";
  }

  if (!project.permit_research) {
    return `Your basic project setup is complete. I’ve captured the project type, location, role, timeline, and budget. Open Permits & Approvals next to match the address, organize the jurisdiction questions, and build the permit-preparation checklist.`;
  }

  const jurisdiction = project.permit_research?.jurisdiction || project.jurisdiction || "the governing authority";
  return `The permit check is saved for ${jurisdiction}. Review the official resources, prepare the listed documents, and confirm current requirements directly with the governing authority. Then keep plans, approvals, and inspection records in Files & Documents.`;
}

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

    const body = await request.json();
    const projectId = body.projectId;
    const message = clean(body.message);
    if (!projectId || !message) return NextResponse.json({ error: "A project and message are required." }, { status: 400 });

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();
    if (projectError || !project) return NextResponse.json({ error: "That project could not be opened." }, { status: 404 });

    const { error: saveUserError } = await supabase.from("conversations").insert({
      project_id: project.id, user_id: user.id, role: "user", message,
    });
    if (saveUserError) throw saveUserError;

    const helpReply = buildPlainLanguageHelp(message, project);
    if (helpReply) {
      const { data: savedHelpReply, error: saveHelpError } = await supabase
        .from("conversations")
        .insert({ project_id: project.id, user_id: user.id, role: "assistant", message: helpReply })
        .select("id,role,message,created_at")
        .single();
      if (saveHelpError) throw saveHelpError;
      return NextResponse.json({ message: savedHelpReply, project, mode: "guided-help" });
    }

    const extracted = {
      project_type: project.project_type || inferProjectType(message),
      address: project.address || inferAddress(message),
      project_role: project.project_role || inferRole(message) || user.user_metadata?.role || "",
      target_timeline: project.target_timeline || inferTimeline(message),
      budget: project.budget || inferBudget(message),
    };

    let description = project.description;
    if (project.project_type && !description && message.length > 20 && !inferAddress(message)) description = message;
    if (!project.project_type && extracted.project_type && message.length > 20) description = message;

    const completed = [extracted.project_type, description, extracted.address, extracted.project_role, extracted.target_timeline, extracted.budget].filter(Boolean).length;
    const progress = Math.max(project.progress || 5, Math.min(48, 8 + completed * 7));
    const ready = completed >= 6;
    const permitChecked = Boolean(project.permit_research?.jurisdictionStatus);
    const update = {
      project_type: extracted.project_type || null,
      description: description || null,
      address: extracted.address || null,
      location_label: extracted.address || project.location_label || "Location not added",
      project_role: extracted.project_role || null,
      target_timeline: extracted.target_timeline || null,
      budget: extracted.budget || null,
      progress,
      status: ready ? "Planning" : "Getting Started",
      next_step: ready
        ? permitChecked
          ? "Review the permit checklist and add supporting project documents"
          : "Check permits and approvals for the project location"
        : "Continue setup with Project Assistant",
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects").update(update).eq("id", project.id).eq("user_id", user.id).select().single();
    if (updateError) throw updateError;

    const reply = buildGuidedReply(updatedProject, extracted, user.user_metadata?.role || "Homeowner");
    const { data: savedReply, error: saveReplyError } = await supabase
      .from("conversations")
      .insert({ project_id: project.id, user_id: user.id, role: "assistant", message: reply })
      .select("id,role,message,created_at").single();
    if (saveReplyError) throw saveReplyError;

    return NextResponse.json({ message: savedReply, project: updatedProject, mode: "guided" });
  } catch (error) {
    console.error("Pilot route error", error);
    return NextResponse.json({ error: error?.message || "Project Assistant could not complete that request." }, { status: 500 });
  }
}
