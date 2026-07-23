import {
  COVERAGE_SUMMARY,
  getApplicationMatches,
  resolveAuthority,
  verificationLabel,
} from "../../../lib/permit-registry";

const projectDocs = {
  Fence: ["Property survey or site plan", "Fence height, material, and location", "HOA approval when applicable"],
  Deck: ["Site plan", "Footing and framing plans", "Guard, stair, and attachment details"],
  Shed: ["Site plan", "Shed dimensions and foundation details", "Electrical plans if applicable"],
  "Roof replacement": ["Scope of work", "Material specifications", "Contractor license and insurance"],
  "HVAC replacement": ["Equipment specifications", "Contractor credentials", "Electrical or fuel-gas scope"],
  "Kitchen remodel": ["Floor plan", "Electrical and plumbing scope", "Structural details if walls change"],
  "Bathroom remodel": ["Floor plan", "Plumbing and electrical scope", "Ventilation details"],
  Addition: ["Boundary or site survey", "Architectural plans", "Structural plans", "Trade plans when applicable"],
  "New Home": ["Boundary survey", "Site plan", "Architectural and structural plans", "Utility and trade plans"],
};

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function geographyByName(geographies, target) {
  if (!geographies || typeof geographies !== "object") return null;
  const entry = Object.entries(geographies).find(([key]) => key.toLowerCase().includes(target.toLowerCase()));
  return entry?.[1]?.[0] || null;
}

async function geocodeWithAuthority(address, zip) {
  const query = `${address} ${zip}`;
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Project-Pilot-Permit-Intelligence/1.0" },
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const match = payload?.result?.addressMatches?.[0];
  if (!match) return null;

  const incorporatedPlace = geographyByName(match.geographies, "Incorporated Places");
  const county = geographyByName(match.geographies, "Counties");
  const countySubdivision = geographyByName(match.geographies, "County Subdivisions");
  const state = geographyByName(match.geographies, "States");

  return {
    matchedAddress: match.matchedAddress || query,
    coordinates: {
      latitude: Number(match.coordinates?.y),
      longitude: Number(match.coordinates?.x),
    },
    incorporatedPlace: incorporatedPlace?.NAME || "",
    countyName: county?.NAME || "",
    countySubdivision: countySubdivision?.NAME || "",
    stateName: state?.NAME || "",
    geographySource: "U.S. Census Geocoder",
  };
}

function applicationStatus(primary, authority) {
  if (authority.requiredAuthorities?.length > 1) {
    return {
      code: "multi-authority-workflow",
      label: "Municipal and county steps matched",
      explanation: "This address requires coordinated local and county steps. Project Pilot lists both official authorities in the order they should be reviewed.",
    };
  }

  if (!primary) {
    return {
      code: "not-loaded",
      label: "Application not loaded",
      explanation: "Project Pilot has not yet verified an official application for this authority and project type.",
    };
  }

  if (primary.matchLevel === "exact_application") {
    return {
      code: "exact-application",
      label: "Exact official application located",
      explanation: "Project Pilot matched a direct official application published by the governing authority.",
    };
  }

  if (primary.matchLevel === "official_submission_portal") {
    return {
      code: "official-portal",
      label: "Official application portal located",
      explanation: "The governing authority accepts applications through this official online portal. The user may still need to select the permit type after opening it.",
    };
  }

  if (primary.matchLevel === "official_form_listing") {
    return {
      code: "official-form-listing",
      label: "Official application listing located",
      explanation: "The governing authority publishes the named building permit application on this official forms page.",
    };
  }

  if (primary.matchLevel === "official_municipal_starting_point") {
    return {
      code: "official-municipal-source",
      label: "Official municipal permit source located",
      explanation: "The municipality issues or approves this permit. Open its official site for the current application and instructions; Project Pilot does not substitute an unverified third-party form.",
    };
  }

  if (authority.confidence === "high") {
    return {
      code: "official-process",
      label: "Official application process located",
      explanation: "The governing authority is matched, but it does not publish a single direct application link for this project in Project Pilot's current verified registry.",
    };
  }

  return {
    code: "authority-review",
    label: "Authority confirmation required",
    explanation: "The municipal or county permit office must be confirmed before relying on a specific application.",
  };
}

function projectFields(project, address, zip) {
  return [
    { key: "project_type", label: "Project type", value: project, ready: Boolean(project) },
    { key: "project_address", label: "Project address", value: address, ready: Boolean(address) },
    { key: "zip_code", label: "ZIP code", value: zip, ready: Boolean(zip) },
    { key: "scope", label: "Detailed scope of work", value: "", ready: false },
    { key: "owner", label: "Owner / applicant information", value: "", ready: false },
    { key: "contractor", label: "Contractor information", value: "", ready: false },
    { key: "estimated_cost", label: "Estimated project cost", value: "", ready: false },
  ];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const address = clean(body.address);
    const zip = clean(body.zip);
    const project = clean(body.project);

    if (!address || !/^\d{5}$/.test(zip) || !project) {
      return Response.json(
        { error: "A street address, five-digit ZIP code, and project type are required." },
        { status: 400 }
      );
    }

    const location = await geocodeWithAuthority(address, zip).catch(() => null);
    const authority = resolveAuthority({
      incorporatedPlace: location?.incorporatedPlace,
      countyName: location?.countyName,
      stateName: location?.stateName,
      zip,
    });
    const applicationMatch = getApplicationMatches(authority, project);
    const status = applicationStatus(applicationMatch.primary, authority);

    const steps = [
      authority.confidence === "high"
        ? `Review the matched authority workflow: ${authority.name}.`
        : "Confirm the exact municipality or county governing the property.",
      ...(authority.requiredAuthorities || []).map(
        (item, index) => `${index + 1}. ${item.name}: ${item.role}.`
      ),
      applicationMatch.primary
        ? `Open ${applicationMatch.primary.label} and review the current submission instructions.`
        : `Ask the responsible office which application covers the proposed ${project.toLowerCase()}.`,
      "Confirm whether separate zoning, electrical, plumbing, mechanical, fire-marshal, septic, sewer, floodplain, or utility approvals also apply.",
      "Prepare the listed plans, owner information, contractor information, and project cost.",
      "Review every application field before signing or submitting anything.",
      "Save the completed application, receipt, inspections, and final approval in the Project Binder.",
    ];

    const applications = applicationMatch.applications.map((item) => ({
      ...item,
      verificationLabel: verificationLabel(item.matchLevel),
    }));

    return Response.json({
      title: `${project} — ${authority.name}`,
      jurisdiction: authority.name,
      jurisdictionType: authority.type,
      jurisdictionConfidence: authority.confidence,
      jurisdictionReason: authority.reason,
      workflow: authority.workflow,
      requiredAuthorities: authority.requiredAuthorities || [],
      coverage: {
        ...COVERAGE_SUMMARY,
        status: authority.confidence === "low" ? "needs-review" : "supported",
        matchedCounty: authority.county || location?.countyName || "",
        matchedState: authority.state || location?.stateName || "",
      },
      authorityPhone: authority.phone,
      authorityOfficialPage: authority.officialPage,
      summary: `${authority.reason} Project Pilot matched the official application resources currently verified for this authority and project type. Where a municipality does not publish a direct form, the app provides the official municipal source and the required county workflow instead of guessing.`,
      matchedAddress: location?.matchedAddress || `${address} ${zip}`,
      addressMatched: Boolean(location),
      coordinates: location?.coordinates || null,
      locationGeography: {
        incorporatedPlace: location?.incorporatedPlace || "",
        county: location?.countyName || "",
        countySubdivision: location?.countySubdivision || "",
        state: location?.stateName || "",
        source: location?.geographySource || "",
      },
      jurisdictionStatus: authority.confidenceLabel,
      applicationStatus: status,
      exactApplicationAvailable: applicationMatch.exactApplicationAvailable,
      primaryApplication: applications.find((item) => item.id === applicationMatch.primary?.id) || null,
      applications,
      projectKey: applicationMatch.projectKey,
      steps,
      documents: projectDocs[project] || ["Project scope", "Property or site plan", "Contractor information", "Product or material specifications"],
      draftFields: projectFields(project, location?.matchedAddress || address, zip),
      checkedAt: new Date().toISOString(),
      registryVerifiedAt: applications[0]?.verifiedAt || null,
      disclaimer: "Project Pilot links to official sources and organizes application preparation. The governing authority remains the source of truth, and nothing should be submitted without the applicant's review and permission.",
    });
  } catch (error) {
    console.error("Permit lookup error", error);
    return Response.json({ error: "Permit Intelligence is temporarily unavailable." }, { status: 500 });
  }
}
