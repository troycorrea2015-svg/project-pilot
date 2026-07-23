const records = {
  "19963": {
    name: "Milford area, Delaware",
    jurisdiction: "Milford / Kent or Sussex County boundary review",
    status: "Address match plus municipal-boundary confirmation required",
    facts: [
      "Milford Building Inspections & Permitting publishes construction and renovation permit information.",
      "A Milford mailing address may fall inside or outside city limits, so the responsible authority must be confirmed.",
    ],
    sources: [
      { label: "City of Milford Building Inspections & Permitting", url: "https://www.cityofmilford.com/15/Building-Inspections-Permitting" },
      { label: "Milford Planning & Zoning", url: "https://www.cityofmilford.com/78/Planning-Zoning" },
    ],
  },
  "19901": {
    name: "Dover area, Delaware",
    jurisdiction: "City of Dover / Kent County boundary review",
    status: "Address match plus city-boundary confirmation required",
    facts: ["Dover Planning & Inspection publishes permit, zoning, form, and inspection resources."],
    sources: [
      { label: "Dover Planning and Inspections", url: "https://www.cityofdover.com/planning-and-inspections" },
      { label: "Dover Forms and Brochures", url: "https://www.cityofdover.com/pi-forms-and-brochures" },
    ],
  },
  "19947": {
    name: "Georgetown / Sussex County area",
    jurisdiction: "Town of Georgetown / Sussex County boundary review",
    status: "Municipal versus county jurisdiction must be confirmed",
    facts: ["Sussex County publishes building permit, code, and application resources for county-administered properties."],
    sources: [
      { label: "Sussex County Building Permits", url: "https://sussexcountyde.gov/building-permits" },
      { label: "Sussex County Application Forms", url: "https://sussexcountyde.gov/application-forms" },
    ],
  },
  "19941": {
    name: "Ellendale / Sussex County area",
    jurisdiction: "Town of Ellendale / Sussex County boundary review",
    status: "Municipal versus county jurisdiction must be confirmed",
    facts: ["The property location must be checked against municipal boundaries before relying on county permit guidance."],
    sources: [
      { label: "Sussex County Building Permits", url: "https://sussexcountyde.gov/building-permits" },
      { label: "Sussex County Application Forms", url: "https://sussexcountyde.gov/application-forms" },
    ],
  },
  "19968": {
    name: "Milton / Sussex County area",
    jurisdiction: "Town of Milton / Sussex County boundary review",
    status: "Town-boundary and governing-authority confirmation required",
    facts: ["A Milton mailing address does not by itself establish whether town or county requirements govern the property."],
    sources: [
      { label: "Town of Milton Planning and Zoning", url: "https://milton.delaware.gov/" },
      { label: "Sussex County Building Permits", url: "https://sussexcountyde.gov/building-permits" },
    ],
  },
};

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

async function geocode(address, zip) {
  const query = `${address}, DE ${zip}`;
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const payload = await response.json();
  const match = payload?.result?.addressMatches?.[0];
  if (!match) return null;

  return {
    matchedAddress: match.matchedAddress || query,
    coordinates: {
      latitude: Number(match.coordinates?.y),
      longitude: Number(match.coordinates?.x),
    },
  };
}

function fallbackRecord(zip) {
  const delaware = zip.startsWith("19");
  return {
    name: delaware ? "Delaware jurisdiction review" : "Jurisdiction not yet loaded",
    jurisdiction: delaware ? "Municipal or county authority must be confirmed" : "Manual jurisdiction verification required",
    status: "Manual jurisdiction verification required",
    facts: [
      delaware
        ? "Project Pilot does not yet have a dedicated local record for this ZIP code. Use the official state and local resources to confirm the responsible authority."
        : "Project Pilot's beta permit records currently focus on Delaware locations.",
    ],
    sources: delaware
      ? [
          { label: "Delaware FirstMap", url: "https://firstmap.delaware.gov/" },
          { label: "Delaware Contractor Registry", url: "https://contractorregistry.delaware.gov/" },
        ]
      : [{ label: "Search the governing authority", url: "https://www.usa.gov/local-governments" }],
  };
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

    const location = await geocode(address, zip).catch(() => null);
    const record = records[zip] || fallbackRecord(zip);
    const steps = [
      "Confirm the exact municipality or county governing the property.",
      `Ask whether the proposed ${project.toLowerCase()} requires zoning, building, or trade approvals.`,
      "Open the official resources and obtain the current application checklist, fee schedule, and submission instructions.",
      "Prepare the listed plans and property documents.",
      "Do not begin regulated work before required approvals are issued.",
      "Schedule required inspections and save final approval records in the Project Binder.",
    ];

    return Response.json({
      title: `${project} — ${record.name}`,
      jurisdiction: record.jurisdiction,
      summary: record.facts.join(" "),
      matchedAddress: location?.matchedAddress || `${address}, DE ${zip}`,
      addressMatched: Boolean(location),
      coordinates: location?.coordinates || null,
      jurisdictionStatus: record.status,
      steps,
      documents: projectDocs[project] || ["Project scope", "Property or site plan", "Contractor information", "Product or material specifications"],
      sources: record.sources,
      checkedAt: new Date().toISOString(),
      disclaimer: "Project Pilot organizes permit-preparation research. The governing authority remains the source of truth for current requirements.",
    });
  } catch (error) {
    console.error("Permit lookup error", error);
    return Response.json({ error: "Permit Intelligence is temporarily unavailable." }, { status: 500 });
  }
}
