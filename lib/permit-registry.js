const VERIFIED_AT = "2026-07-23";

const BUILDING_PROJECT_KEYS = new Set([
  "deck",
  "fence",
  "shed",
  "roof",
  "hvac",
  "kitchen",
  "bathroom",
  "addition",
  "new-home",
  "general",
]);

const ALL_BUILDING_PROJECT_KEYS = [...BUILDING_PROJECT_KEYS];

export const COVERAGE_SUMMARY = {
  region: "Delmarva Peninsula beta coverage",
  states: ["Delaware", "Maryland", "Virginia"],
  counties: [
    "New Castle County", "Kent County, Delaware", "Sussex County",
    "Cecil County", "Kent County, Maryland", "Queen Anne's County", "Caroline County", "Talbot County",
    "Dorchester County", "Wicomico County", "Somerset County", "Worcester County",
    "Accomack County", "Northampton County",
  ],
  countyCount: 14,
  coverageDescription: "All 3 Delaware counties, Maryland's 9 Eastern Shore counties, and Virginia's 2 Eastern Shore counties",
  verifiedAt: VERIFIED_AT,
};

export function normalizeProjectKey(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "general";
  if (clean.includes("deck") || clean.includes("patio") || clean.includes("porch")) return "deck";
  if (clean.includes("fence") || clean.includes("retaining wall")) return "fence";
  if (clean.includes("shed") || clean.includes("garage") || clean.includes("accessory")) return "shed";
  if (clean.includes("roof") || clean.includes("siding")) return "roof";
  if (clean.includes("hvac") || clean.includes("heating") || clean.includes("air conditioning")) return "hvac";
  if (clean.includes("kitchen")) return "kitchen";
  if (clean.includes("bath")) return "bathroom";
  if (clean.includes("addition") || clean.includes("sunroom")) return "addition";
  if (clean.includes("new home") || clean.includes("new house") || clean.includes("single family")) return "new-home";
  return "general";
}

function application({
  id,
  label,
  url,
  authority,
  matchLevel,
  method,
  format,
  actionLabel,
  description,
  projectKeys = ["general"],
  supporting = false,
}) {
  return {
    id,
    label,
    url,
    authority,
    matchLevel,
    method,
    format,
    actionLabel,
    description,
    projectKeys,
    supporting,
    verifiedAt: VERIFIED_AT,
    sourceType: "official-government",
  };
}

const KENT_MUNICIPAL_INFO = application({
  id: "kent-municipal-routing",
  label: "Kent County Municipal Permit Routing",
  url: "https://www.kentcountyde.gov/Residents/Permits/Building-Permits/Municipal-Information",
  authority: "Kent County",
  matchLevel: "official_requirements_page",
  method: "reference",
  format: "webpage",
  actionLabel: "Review Kent municipal routing",
  description: "Kent County's official list identifies towns that issue their own permits and towns that require local zoning approval before a county building permit.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
  supporting: true,
});

const KENT_MGO = application({
  id: "kent-mgo-building-permit",
  label: "Kent County Building Permit — MyGovernmentOnline",
  url: "https://www.mygovernmentonline.org/",
  authority: "Kent County",
  matchLevel: "official_submission_portal",
  method: "online",
  format: "portal",
  actionLabel: "Open Kent County permit portal",
  description: "Kent County directs building-permit applicants to MyGovernmentOnline for online applications and payments.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
});

const KENT_BUILDING_PAGE = application({
  id: "kent-building-permit-page",
  label: "Kent County Building Permit Requirements",
  url: "https://www.kentcountyde.gov/Residents/Permits/Building-Permits",
  authority: "Kent County",
  matchLevel: "official_application_process",
  method: "reference",
  format: "webpage",
  actionLabel: "Review Kent County requirements",
  description: "Official Kent County building-permit instructions, requirements, and contact information.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
  supporting: true,
});

const SUSSEX_BUILDING_PROCESS = application({
  id: "sussex-building-permit-process",
  label: "Sussex County Building Permit Application Process",
  url: "https://sussexcountyde.gov/building-permits-and-licenses",
  authority: "Sussex County",
  matchLevel: "official_application_process",
  method: "in-person-or-mail-after-confirmation",
  format: "webpage",
  actionLabel: "Open Sussex County permit process",
  description: "Sussex County states that construction, remodeling, and additions require a county-issued building permit, including projects inside municipalities. Most applications are made through the Building Permit Office.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
});

const SUSSEX_MUNICIPAL_REQUIREMENTS = application({
  id: "sussex-municipality-requirements",
  label: "Sussex County Permitting Requirements Within Municipalities",
  url: "https://sussexcountyde.gov/sites/default/files/PDFs/City-TownRequirements-Permitting.pdf",
  authority: "Sussex County",
  matchLevel: "official_requirements_page",
  method: "reference",
  format: "pdf",
  actionLabel: "Review municipality requirements",
  description: "Official Sussex County guidance explaining when county permits remain required inside town or city boundaries and when local review may also apply.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
  supporting: true,
});

const SUSSEX_FORMS = application({
  id: "sussex-building-forms-library",
  label: "Sussex County Building Permit Forms Library",
  url: "https://sussexcountyde.gov/forms?field_form_dept_value%5B%5D=BldgPermits",
  authority: "Sussex County",
  matchLevel: "official_forms_library",
  method: "download-or-print",
  format: "webpage",
  actionLabel: "Open Sussex County forms",
  description: "Official Sussex County building-permit worksheets and supporting forms.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
  supporting: true,
});

const SUSSEX_SINGLE_FAMILY = application({
  id: "sussex-single-family-worksheet",
  label: "Sussex County Single-Family Building Permit Worksheet",
  url: "https://sussexcountyde.gov/sites/default/files/forms/Single%20Family%20Worksheet.pdf",
  authority: "Sussex County",
  matchLevel: "exact_supporting_form",
  method: "download-or-print",
  format: "pdf",
  actionLabel: "Open single-family worksheet",
  description: "Official Sussex County new-construction building-code and permit worksheet, updated April 13, 2026.",
  projectKeys: ["new-home"],
  supporting: true,
});

function municipalityApplication({ name, key, url, phone = "", ownPermit = true, exact = null }) {
  if (exact) return exact;
  return application({
    id: `${key}-official-permit-start`,
    label: `${name} Official Permit and Zoning Information`,
    url,
    authority: name,
    matchLevel: "official_municipal_starting_point",
    method: ownPermit ? "municipal-application" : "local-approval",
    format: "official-website",
    actionLabel: ownPermit ? `Open ${name} permit information` : `Open ${name} zoning approval information`,
    description: ownPermit
      ? `${name} is identified by Kent County as issuing its own building permits. Use the official municipal website to obtain the current application or contact the permit office.`
      : `${name} local zoning approval or a town letter is required before Kent County can issue the building permit.`,
    projectKeys: ALL_BUILDING_PROJECT_KEYS,
  });
}

function requiredAuthority(name, role, url, phone = "") {
  return { name, role, url, phone };
}

const KENT_AUTHORITIES = {};
const SUSSEX_AUTHORITIES = {};

KENT_AUTHORITIES["bowersbeach"] = {
  key: "kent-bowersbeach",
  name: "Town of Bowers Beach",
  type: "municipality",
  county: "Kent County",
  phone: "302-335-1039",
  officialPage: "https://bowersbeach.delaware.gov/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Bowers Beach", "Building permit authority", "https://bowersbeach.delaware.gov/", "302-335-1039")],
  applications: [
      municipalityApplication({ name: "Town of Bowers Beach", key: "bowersbeach", url: "https://bowersbeach.delaware.gov/", phone: "302-335-1039", ownPermit: true }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["camden"] = {
  key: "kent-camden",
  name: "Town of Camden",
  type: "municipality",
  county: "Kent County",
  phone: "302-697-2299",
  officialPage: "https://camden.delaware.gov/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Camden", "Building permit authority", "https://camden.delaware.gov/", "302-697-2299")],
  applications: [
      municipalityApplication({ name: "Town of Camden", key: "camden", url: "https://camden.delaware.gov/", phone: "302-697-2299", ownPermit: true }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["cheswold"] = {
  key: "kent-cheswold",
  name: "Town of Cheswold",
  type: "municipality",
  county: "Kent County",
  phone: "302-734-6991",
  officialPage: "https://cheswold.delaware.gov/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Cheswold", "Building permit authority", "https://cheswold.delaware.gov/", "302-734-6991")],
  applications: [
      municipalityApplication({ name: "Town of Cheswold", key: "cheswold", url: "https://cheswold.delaware.gov/", phone: "302-734-6991", ownPermit: true }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["clayton"] = {
  key: "kent-clayton",
  name: "Town of Clayton",
  type: "municipality",
  county: "Kent County",
  phone: "302-653-8419",
  officialPage: "https://clayton.delaware.gov/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Clayton", "Building permit authority", "https://clayton.delaware.gov/", "302-653-8419")],
  applications: [
      municipalityApplication({ name: "Town of Clayton", key: "clayton", url: "https://clayton.delaware.gov/", phone: "302-653-8419", ownPermit: true }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["dover"] = {
  key: "kent-dover",
  name: "City of Dover",
  type: "municipality",
  county: "Kent County",
  phone: "302-736-7011",
  officialPage: "https://www.cityofdover.com/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("City of Dover", "Building permit authority", "https://www.cityofdover.com/", "302-736-7011")],
  applications: [
      application({
        id: "dover-building-permit-pdf",
        label: "City of Dover Building Permit Application",
        url: "https://www.cityofdover.com/media/Planning%20and%20Inspections/Forms%20and%20Brochures/Forms/Building%20Permit%20Application.pdf",
        authority: "City of Dover",
        matchLevel: "exact_application",
        method: "download-or-print",
        format: "pdf",
        actionLabel: "Open exact Dover application",
        description: "Direct official City of Dover building permit application PDF.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
      }),
      application({
        id: "dover-forms-page",
        label: "Dover Planning and Inspections Forms",
        url: "https://www.cityofdover.gov/planning-and-inspections-forms",
        authority: "City of Dover",
        matchLevel: "official_forms_library",
        method: "reference",
        format: "webpage",
        actionLabel: "Review Dover supplemental forms",
        description: "Official City of Dover forms library for related trade permits and supporting applications.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
        supporting: true,
      }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["frederica"] = {
  key: "kent-frederica",
  name: "Town of Frederica",
  type: "municipality",
  county: "Kent County",
  phone: "302-335-5417",
  officialPage: "https://frederica.delaware.gov/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Frederica", "Building permit authority", "https://frederica.delaware.gov/", "302-335-5417")],
  applications: [
      municipalityApplication({ name: "Town of Frederica", key: "frederica", url: "https://frederica.delaware.gov/", phone: "302-335-5417", ownPermit: true }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["harrington"] = {
  key: "kent-harrington",
  name: "Town of Harrington",
  type: "municipality",
  county: "Kent County",
  phone: "302-398-3530",
  officialPage: "https://harrington.delaware.gov/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Harrington", "Building permit authority", "https://harrington.delaware.gov/", "302-398-3530")],
  applications: [
      municipalityApplication({ name: "Town of Harrington", key: "harrington", url: "https://harrington.delaware.gov/", phone: "302-398-3530", ownPermit: true }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["milford"] = {
  key: "kent-milford",
  name: "City of Milford",
  type: "municipality",
  county: "Kent County",
  phone: "302-424-3712",
  officialPage: "https://www.cityofmilford.com/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("City of Milford", "Building permit authority", "https://www.cityofmilford.com/", "302-424-3712")],
  applications: [
      application({
        id: "milford-civic-access-building",
        label: "City of Milford Building Permit — Civic Access",
        url: "https://cityofmilfordde-energovweb.tylerhost.net/apps/selfservice",
        authority: "City of Milford",
        matchLevel: "official_submission_portal",
        method: "online",
        format: "portal",
        actionLabel: "Open Milford permit application",
        description: "Milford directs building permit applicants to its official Civic Access portal.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
      }),
      application({
        id: "milford-building-department",
        label: "Milford Building Inspections and Permitting",
        url: "https://www.cityofmilford.com/15/Building-Inspections-Permitting",
        authority: "City of Milford",
        matchLevel: "official_department_page",
        method: "reference",
        format: "webpage",
        actionLabel: "Review Milford requirements",
        description: "Official Milford department page for permit and inspection requirements.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
        supporting: true,
      }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["smyrna"] = {
  key: "kent-smyrna",
  name: "Town of Smyrna",
  type: "municipality",
  county: "Kent County",
  phone: "302-653-9231",
  officialPage: "https://smyrna.delaware.gov/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Smyrna", "Building permit authority", "https://smyrna.delaware.gov/", "302-653-9231")],
  applications: [
      municipalityApplication({ name: "Town of Smyrna", key: "smyrna", url: "https://smyrna.delaware.gov/", phone: "302-653-9231", ownPermit: true }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["wyoming"] = {
  key: "kent-wyoming",
  name: "Town of Wyoming",
  type: "municipality",
  county: "Kent County",
  phone: "302-697-2966",
  officialPage: "https://wyoming.delaware.gov/license-applications-permits/",
  confidenceLabel: "Municipal boundary matched",
  workflow: "municipal-permit",
  requiredAuthorities: [requiredAuthority("Town of Wyoming", "Building permit authority", "https://wyoming.delaware.gov/license-applications-permits/", "302-697-2966")],
  applications: [
      application({
        id: "wyoming-building-permit-application",
        label: "Town of Wyoming Building Permit Application",
        url: "https://wyoming.delaware.gov/info/forms/building-permit-application-6/",
        authority: "Town of Wyoming",
        matchLevel: "exact_application",
        method: "download-or-print",
        format: "official-form-page",
        actionLabel: "Open exact Wyoming application",
        description: "Official Town of Wyoming building permit application page.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
      }),
      application({
        id: "wyoming-permits-page",
        label: "Wyoming License Applications and Permits",
        url: "https://wyoming.delaware.gov/license-applications-permits/",
        authority: "Town of Wyoming",
        matchLevel: "official_forms_library",
        method: "reference",
        format: "webpage",
        actionLabel: "Review Wyoming permit options",
        description: "Official Wyoming page listing residential, new-construction, commercial, and demolition permit applications.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
        supporting: true,
      }),
      KENT_MUNICIPAL_INFO,
    ],
};

KENT_AUTHORITIES["farmington"] = {
  key: "kent-farmington",
  name: "Town of Farmington zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-519-0085",
  officialPage: "https://www.farmingtondelaware.com/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Farmington", "Zoning permit or letter of approval", "https://www.farmingtondelaware.com/", "302-519-0085"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Farmington", key: "farmington", url: "https://www.farmingtondelaware.com/", phone: "302-519-0085", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["felton"] = {
  key: "kent-felton",
  name: "Town of Felton zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-284-9365",
  officialPage: "https://felton.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Felton", "Zoning permit or letter of approval", "https://felton.delaware.gov/", "302-284-9365"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Felton", key: "felton", url: "https://felton.delaware.gov/", phone: "302-284-9365", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["hartly"] = {
  key: "kent-hartly",
  name: "Town of Hartly zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-922-2814",
  officialPage: "https://hartly.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Hartly", "Zoning permit or letter of approval", "https://hartly.delaware.gov/", "302-922-2814"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Hartly", key: "hartly", url: "https://hartly.delaware.gov/", phone: "302-922-2814", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["houston"] = {
  key: "kent-houston",
  name: "Town of Houston zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-632-0853",
  officialPage: "https://houston.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Houston", "Zoning permit or letter of approval", "https://houston.delaware.gov/", "302-632-0853"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Houston", key: "houston", url: "https://houston.delaware.gov/", phone: "302-632-0853", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["kenton"] = {
  key: "kent-kenton",
  name: "Town of Kenton zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-389-8270",
  officialPage: "https://kenton.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Kenton", "Zoning permit or letter of approval", "https://kenton.delaware.gov/", "302-389-8270"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Kenton", key: "kenton", url: "https://kenton.delaware.gov/", phone: "302-389-8270", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["leipsic"] = {
  key: "kent-leipsic",
  name: "Town of Leipsic zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-736-0595",
  officialPage: "https://leipsic.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Leipsic", "Zoning permit or letter of approval", "https://leipsic.delaware.gov/", "302-736-0595"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Leipsic", key: "leipsic", url: "https://leipsic.delaware.gov/", phone: "302-736-0595", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["littlecreek"] = {
  key: "kent-littlecreek",
  name: "Town of Little Creek zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "TownofLittleCreek@gmail.com",
  officialPage: "https://littlecreek.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Little Creek", "Zoning permit or letter of approval", "https://littlecreek.delaware.gov/", "TownofLittleCreek@gmail.com"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Little Creek", key: "littlecreek", url: "https://littlecreek.delaware.gov/", phone: "TownofLittleCreek@gmail.com", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["magnolia"] = {
  key: "kent-magnolia",
  name: "Town of Magnolia zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-335-5891",
  officialPage: "https://magnolia.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Magnolia", "Zoning permit or letter of approval", "https://magnolia.delaware.gov/", "302-335-5891"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Magnolia", key: "magnolia", url: "https://magnolia.delaware.gov/", phone: "302-335-5891", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["viola"] = {
  key: "kent-viola",
  name: "Town of Viola zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-632-4428",
  officialPage: "https://viola.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Viola", "Zoning permit or letter of approval", "https://viola.delaware.gov/", "302-632-4428"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Viola", key: "viola", url: "https://viola.delaware.gov/", phone: "302-632-4428", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

KENT_AUTHORITIES["woodside"] = {
  key: "kent-woodside",
  name: "Town of Woodside zoning + Kent County building",
  type: "shared-municipal-county",
  county: "Kent County",
  phone: "302-531-6883",
  officialPage: "https://woodside.delaware.gov/",
  confidenceLabel: "Municipal boundary and county workflow matched",
  workflow: "local-approval-then-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Woodside", "Zoning permit or letter of approval", "https://woodside.delaware.gov/", "302-531-6883"),
    requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
  ],
  applications: [
    KENT_MGO,
    municipalityApplication({ name: "Town of Woodside", key: "woodside", url: "https://woodside.delaware.gov/", phone: "302-531-6883", ownPermit: false }),
    KENT_MUNICIPAL_INFO,
    KENT_BUILDING_PAGE,
  ],
};

SUSSEX_AUTHORITIES["bethanybeach"] = {
  key: "sussex-bethanybeach",
  name: "Town of Bethany Beach + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.townofbethanybeach.com/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Bethany Beach", "Local municipal requirements", "https://www.townofbethanybeach.com/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "bethanybeach-municipal-requirements",
      label: "Town of Bethany Beach Permit and Zoning Information",
      url: "https://www.townofbethanybeach.com/",
      authority: "Town of Bethany Beach",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Bethany Beach requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["bethel"] = {
  key: "sussex-bethel",
  name: "Town of Bethel + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://bethel.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Bethel", "Local municipal requirements", "https://bethel.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "bethel-municipal-requirements",
      label: "Town of Bethel Permit and Zoning Information",
      url: "https://bethel.delaware.gov/",
      authority: "Town of Bethel",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Bethel requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["blades"] = {
  key: "sussex-blades",
  name: "Town of Blades + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://blades.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Blades", "Local municipal requirements", "https://blades.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "blades-municipal-requirements",
      label: "Town of Blades Permit and Zoning Information",
      url: "https://blades.delaware.gov/",
      authority: "Town of Blades",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Blades requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["bridgeville"] = {
  key: "sussex-bridgeville",
  name: "Town of Bridgeville + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://bridgeville.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Bridgeville", "Local municipal requirements", "https://bridgeville.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "bridgeville-municipal-requirements",
      label: "Town of Bridgeville Permit and Zoning Information",
      url: "https://bridgeville.delaware.gov/",
      authority: "Town of Bridgeville",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Bridgeville requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["dagsboro"] = {
  key: "sussex-dagsboro",
  name: "Town of Dagsboro + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://dagsboro.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Dagsboro", "Local municipal requirements", "https://dagsboro.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "dagsboro-municipal-requirements",
      label: "Town of Dagsboro Permit and Zoning Information",
      url: "https://dagsboro.delaware.gov/",
      authority: "Town of Dagsboro",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Dagsboro requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["delmar"] = {
  key: "sussex-delmar",
  name: "Town of Delmar + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.townofdelmar.us/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Delmar", "Local municipal requirements", "https://www.townofdelmar.us/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "delmar-municipal-requirements",
      label: "Town of Delmar Permit and Zoning Information",
      url: "https://www.townofdelmar.us/",
      authority: "Town of Delmar",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Delmar requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["deweybeach"] = {
  key: "sussex-deweybeach",
  name: "Town of Dewey Beach + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.townofdeweybeach.com/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Dewey Beach", "Local municipal requirements", "https://www.townofdeweybeach.com/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "deweybeach-municipal-requirements",
      label: "Town of Dewey Beach Permit and Zoning Information",
      url: "https://www.townofdeweybeach.com/",
      authority: "Town of Dewey Beach",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Dewey Beach requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["ellendale"] = {
  key: "sussex-ellendale",
  name: "Town of Ellendale + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://ellendale.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Ellendale", "Local municipal requirements", "https://ellendale.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "ellendale-municipal-requirements",
      label: "Town of Ellendale Permit and Zoning Information",
      url: "https://ellendale.delaware.gov/",
      authority: "Town of Ellendale",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Ellendale requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["fenwickisland"] = {
  key: "sussex-fenwickisland",
  name: "Town of Fenwick Island + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://fenwickisland.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Fenwick Island", "Local municipal requirements", "https://fenwickisland.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "fenwickisland-municipal-requirements",
      label: "Town of Fenwick Island Permit and Zoning Information",
      url: "https://fenwickisland.delaware.gov/",
      authority: "Town of Fenwick Island",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Fenwick Island requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["frankford"] = {
  key: "sussex-frankford",
  name: "Town of Frankford + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://frankford.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Frankford", "Local municipal requirements", "https://frankford.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "frankford-municipal-requirements",
      label: "Town of Frankford Permit and Zoning Information",
      url: "https://frankford.delaware.gov/",
      authority: "Town of Frankford",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Frankford requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["georgetown"] = {
  key: "sussex-georgetown",
  name: "Town of Georgetown + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.georgetowndel.com/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Georgetown", "Local municipal requirements", "https://www.georgetowndel.com/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "georgetown-municipal-requirements",
      label: "Town of Georgetown Permit and Zoning Information",
      url: "https://www.georgetowndel.com/",
      authority: "Town of Georgetown",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Georgetown requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["greenwood"] = {
  key: "sussex-greenwood",
  name: "Town of Greenwood + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://greenwood.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Greenwood", "Local municipal requirements", "https://greenwood.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "greenwood-municipal-requirements",
      label: "Town of Greenwood Permit and Zoning Information",
      url: "https://greenwood.delaware.gov/",
      authority: "Town of Greenwood",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Greenwood requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["henlopenacres"] = {
  key: "sussex-henlopenacres",
  name: "Town of Henlopen Acres + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://henlopenacres.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Henlopen Acres", "Local municipal requirements", "https://henlopenacres.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "henlopenacres-municipal-requirements",
      label: "Town of Henlopen Acres Permit and Zoning Information",
      url: "https://henlopenacres.delaware.gov/",
      authority: "Town of Henlopen Acres",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Henlopen Acres requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["laurel"] = {
  key: "sussex-laurel",
  name: "Town of Laurel + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.townoflaurel.net/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Laurel", "Local municipal requirements", "https://www.townoflaurel.net/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "laurel-municipal-requirements",
      label: "Town of Laurel Permit and Zoning Information",
      url: "https://www.townoflaurel.net/",
      authority: "Town of Laurel",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Laurel requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["lewes"] = {
  key: "sussex-lewes",
  name: "City of Lewes + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.ci.lewes.de.us/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("City of Lewes", "Local municipal requirements", "https://www.ci.lewes.de.us/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "lewes-municipal-requirements",
      label: "City of Lewes Permit and Zoning Information",
      url: "https://www.ci.lewes.de.us/",
      authority: "City of Lewes",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open City of Lewes requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["milford"] = {
  key: "sussex-milford",
  name: "City of Milford + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.cityofmilford.com/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("City of Milford", "Local municipal requirements", "https://www.cityofmilford.com/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    application({
        id: "milford-civic-access-building",
        label: "City of Milford Building Permit — Civic Access",
        url: "https://cityofmilfordde-energovweb.tylerhost.net/apps/selfservice",
        authority: "City of Milford",
        matchLevel: "official_submission_portal",
        method: "online",
        format: "portal",
        actionLabel: "Open Milford permit application",
        description: "Milford directs building permit applicants to its official Civic Access portal.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
      }),
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "milford-municipal-requirements",
      label: "City of Milford Permit and Zoning Information",
      url: "https://www.cityofmilford.com/",
      authority: "City of Milford",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open City of Milford requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["millsboro"] = {
  key: "sussex-millsboro",
  name: "Town of Millsboro + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.millsboro.org/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Millsboro", "Local municipal requirements", "https://www.millsboro.org/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "millsboro-municipal-requirements",
      label: "Town of Millsboro Permit and Zoning Information",
      url: "https://www.millsboro.org/",
      authority: "Town of Millsboro",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Millsboro requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["millville"] = {
  key: "sussex-millville",
  name: "Town of Millville + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://millville.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Millville", "Local municipal requirements", "https://millville.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "millville-municipal-requirements",
      label: "Town of Millville Permit and Zoning Information",
      url: "https://millville.delaware.gov/",
      authority: "Town of Millville",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Millville requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["milton"] = {
  key: "sussex-milton",
  name: "Town of Milton + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://milton.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Milton", "Local municipal requirements", "https://milton.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    application({
        id: "milton-building-permit-form",
        label: "Town of Milton Building Permit Application",
        url: "https://milton.delaware.gov/printable-forms/",
        authority: "Town of Milton",
        matchLevel: "official_form_listing",
        method: "download-or-print",
        format: "official-forms-page",
        actionLabel: "Open Milton building application",
        description: "Milton's official printable-forms page lists the Town Building Permit Application.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
      }),
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "milton-municipal-requirements",
      label: "Town of Milton Permit and Zoning Information",
      url: "https://milton.delaware.gov/",
      authority: "Town of Milton",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Milton requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["oceanview"] = {
  key: "sussex-oceanview",
  name: "Town of Ocean View + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.oceanviewde.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Ocean View", "Local municipal requirements", "https://www.oceanviewde.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "oceanview-municipal-requirements",
      label: "Town of Ocean View Permit and Zoning Information",
      url: "https://www.oceanviewde.gov/",
      authority: "Town of Ocean View",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Ocean View requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["rehobothbeach"] = {
  key: "sussex-rehobothbeach",
  name: "City of Rehoboth Beach + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.rehobothbeachde.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("City of Rehoboth Beach", "Local municipal requirements", "https://www.rehobothbeachde.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "rehobothbeach-municipal-requirements",
      label: "City of Rehoboth Beach Permit and Zoning Information",
      url: "https://www.rehobothbeachde.gov/",
      authority: "City of Rehoboth Beach",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open City of Rehoboth Beach requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["seaford"] = {
  key: "sussex-seaford",
  name: "City of Seaford + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://www.seafordde.com/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("City of Seaford", "Local municipal requirements", "https://www.seafordde.com/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "seaford-municipal-requirements",
      label: "City of Seaford Permit and Zoning Information",
      url: "https://www.seafordde.com/",
      authority: "City of Seaford",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open City of Seaford requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["selbyville"] = {
  key: "sussex-selbyville",
  name: "Town of Selbyville + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://selbyville.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Selbyville", "Local municipal requirements", "https://selbyville.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "selbyville-municipal-requirements",
      label: "Town of Selbyville Permit and Zoning Information",
      url: "https://selbyville.delaware.gov/",
      authority: "Town of Selbyville",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Selbyville requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["slaughterbeach"] = {
  key: "sussex-slaughterbeach",
  name: "Town of Slaughter Beach + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://slaughterbeach.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of Slaughter Beach", "Local municipal requirements", "https://slaughterbeach.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "slaughterbeach-municipal-requirements",
      label: "Town of Slaughter Beach Permit and Zoning Information",
      url: "https://slaughterbeach.delaware.gov/",
      authority: "Town of Slaughter Beach",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of Slaughter Beach requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};

SUSSEX_AUTHORITIES["southbethany"] = {
  key: "sussex-southbethany",
  name: "Town of South Bethany + Sussex County",
  type: "shared-municipal-county",
  county: "Sussex County",
  phone: "302-855-7720",
  officialPage: "https://southbethany.delaware.gov/",
  confidenceLabel: "Municipal boundary and county permit workflow matched",
  workflow: "municipal-review-plus-county-permit",
  requiredAuthorities: [
    requiredAuthority("Town of South Bethany", "Local municipal requirements", "https://southbethany.delaware.gov/", ""),
    requiredAuthority("Sussex County", "County building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
  ],
  applications: [
    SUSSEX_BUILDING_PROCESS,
    application({
      id: "southbethany-municipal-requirements",
      label: "Town of South Bethany Permit and Zoning Information",
      url: "https://southbethany.delaware.gov/",
      authority: "Town of South Bethany",
      matchLevel: "official_municipal_starting_point",
      method: "local-review",
      format: "official-website",
      actionLabel: "Open Town of South Bethany requirements",
      description: "Contact or review the official municipal site for local zoning, building, floodplain, rental, or other municipal requirements before county permit issuance.",
      projectKeys: ALL_BUILDING_PROJECT_KEYS,
      supporting: true,
    }),
    SUSSEX_MUNICIPAL_REQUIREMENTS,
    SUSSEX_FORMS,
    SUSSEX_SINGLE_FAMILY
  ],
};


const MARYLAND_MUNICIPAL_DIRECTORY = application({
  id: "maryland-municipality-directory",
  label: "Maryland Municipalities by County",
  url: "https://msa.maryland.gov/msa/mdmanual/01glance/html/munic.html",
  authority: "State of Maryland",
  matchLevel: "official_requirements_page",
  method: "reference",
  format: "webpage",
  actionLabel: "Confirm Maryland municipality",
  description: "Official Maryland directory for confirming the incorporated town or city responsible for local zoning and land-use review.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
  supporting: true,
});

const VIRGINIA_LOCAL_GOVERNMENT_DIRECTORY = application({
  id: "virginia-local-government-directory",
  label: "Virginia Local Government Directory",
  url: "https://www.virginia.gov/local-government/",
  authority: "Commonwealth of Virginia",
  matchLevel: "official_requirements_page",
  method: "reference",
  format: "webpage",
  actionLabel: "Confirm Virginia locality",
  description: "Official Virginia directory for confirming local government contact information and municipal boundaries.",
  projectKeys: ALL_BUILDING_PROJECT_KEYS,
  supporting: true,
});

function countyPermitApplication({ id, label, url, authority, phone, matchLevel = "official_application_process", method = "online-or-contact", format = "webpage", actionLabel = "Open official permit process", description, supporting = false }) {
  return application({
    id,
    label,
    url,
    authority,
    matchLevel,
    method,
    format,
    actionLabel,
    description,
    projectKeys: ALL_BUILDING_PROJECT_KEYS,
    supporting,
  });
}

function countyAuthority({ key, name, state, phone, officialPage, applicationResources, confidenceLabel, municipalMode = "local-zoning-plus-county-building" }) {
  return {
    key,
    name,
    state,
    type: "county",
    county: name,
    phone,
    officialPage,
    confidenceLabel: confidenceLabel || `Unincorporated ${name} matched`,
    workflow: "county-permit",
    municipalMode,
    requiredAuthorities: [requiredAuthority(name, "Building permit, plan review, and inspections", officialPage, phone)],
    applications: applicationResources,
  };
}

const NEW_CASTLE_ESERVICES = countyPermitApplication({
  id: "new-castle-eservices",
  label: "New Castle County eServices Permit Application",
  url: "https://www.newcastlede.gov/2507/Get-a-Permit",
  authority: "New Castle County",
  phone: "302-395-5400",
  matchLevel: "official_submission_portal",
  method: "online",
  format: "portal",
  actionLabel: "Open New Castle County permit application",
  description: "New Castle County processes building, demolition, and utility permits through its official eServices and ePlans workflow.",
});

const WILMINGTON_PERMITS = countyPermitApplication({
  id: "wilmington-building-permit",
  label: "City of Wilmington Building Permit Application",
  url: "https://www.wilmingtonde.gov/government/city-departments/land-use-and-planning/land-use/permits-applications",
  authority: "City of Wilmington",
  phone: "302-576-3050",
  matchLevel: "official_form_listing",
  method: "download-or-submit",
  format: "webpage",
  actionLabel: "Open Wilmington permit applications",
  description: "The City of Wilmington publishes its building, HVAC, plumbing, and related permit applications on this official page.",
});

const MD_COUNTY_AUTHORITIES = {
  "cecilcounty": countyAuthority({
    key: "md-cecil-county", name: "Cecil County", state: "Maryland", phone: "410-996-5235",
    officialPage: "https://www.ccgov.org/government/land-use-development-services/permits-and-inspections-division",
    applicationResources: [
      countyPermitApplication({ id: "cecil-permits", label: "Cecil County Permits and Inspections", url: "https://www.ccgov.org/government/land-use-development-services/permits-and-inspections-division", authority: "Cecil County", phone: "410-996-5235", description: "Official Cecil County permit and inspection division for building, electrical, plumbing, HVAC, and related approvals." }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "kentcounty": countyAuthority({
    key: "md-kent-county", name: "Kent County", state: "Maryland", phone: "410-778-7423",
    officialPage: "https://www.kentcounty.com/planning/building-permits",
    applicationResources: [
      countyPermitApplication({ id: "md-kent-building", label: "Kent County Building Permit Requirements", url: "https://www.kentcounty.com/planning/building-permits", authority: "Kent County, Maryland", phone: "410-778-7423", description: "Official Kent County building permit requirements, checklists, and Planning and Zoning contact information." }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "queenannescounty": countyAuthority({
    key: "md-queen-annes-county", name: "Queen Anne's County", state: "Maryland", phone: "410-758-4088",
    officialPage: "https://www.qac.org/294/PermittingZoning",
    applicationResources: [
      countyPermitApplication({ id: "queen-annes-portal", label: "Queen Anne's County Citizen Self Service Permit Portal", url: "https://www.qac.org/1455/PZ-Citizen-Self-Service-Portal", authority: "Queen Anne's County", phone: "410-758-4088", matchLevel: "official_submission_portal", method: "online", format: "portal", actionLabel: "Open Queen Anne's permit portal", description: "Official portal for permit applications, payments, document uploads, status checks, and permit printing." }),
      countyPermitApplication({ id: "queen-annes-forms", label: "Queen Anne's County Building Permit Forms", url: "https://www.qac.org/392/Forms", authority: "Queen Anne's County", phone: "410-758-4088", matchLevel: "official_form_listing", method: "download", format: "webpage", actionLabel: "Open Queen Anne's forms", description: "Official forms page containing the Building Permit Application and trade permit applications.", supporting: true }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "carolinecounty": countyAuthority({
    key: "md-caroline-county", name: "Caroline County", state: "Maryland", phone: "410-479-8100",
    officialPage: "https://www.carolinemd.org/288/Building-Permits-Zoning-Certificates",
    applicationResources: [
      countyPermitApplication({ id: "caroline-lama", label: "Caroline County Online Permit Application", url: "https://caroline.onlama.com/", authority: "Caroline County", phone: "410-479-8100", matchLevel: "official_submission_portal", method: "online", format: "portal", actionLabel: "Apply through Caroline County portal", description: "Caroline County directs applicants to its official LAMA portal for building permits and zoning certificates." }),
      countyPermitApplication({ id: "caroline-requirements", label: "Caroline County Building Permit Requirements", url: "https://www.carolinemd.org/288/Building-Permits-Zoning-Certificates", authority: "Caroline County", phone: "410-479-8100", description: "Official project requirements, checklists, inspections, fees, and other-agency approvals.", supporting: true }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "talbotcounty": countyAuthority({
    key: "md-talbot-county", name: "Talbot County", state: "Maryland", phone: "410-770-6840",
    officialPage: "https://www.talbotcountymd.gov/permits",
    applicationResources: [
      countyPermitApplication({ id: "talbot-opengov", label: "Talbot County Online Permitting Service", url: "https://www.talbotcountymd.gov/permits", authority: "Talbot County", phone: "410-770-6840", matchLevel: "official_submission_portal", method: "online", format: "portal", actionLabel: "Open Talbot County permitting", description: "Talbot County provides online permit applications, document uploads, payments, inspections, and status tracking through OpenGov." }),
      countyPermitApplication({ id: "talbot-building-pdf", label: "Talbot County Building Permit / Zoning Certificate Application", url: "https://www.talbotcountymd.gov/uploads/File/PlanningPermits/PI/Building%20Permit%20CURRENT.pdf", authority: "Talbot County", phone: "410-770-6840", matchLevel: "exact_application", method: "download", format: "pdf", actionLabel: "Open Talbot building permit application", description: "Official Talbot County Building Permit and Zoning Certificate Application.", supporting: true }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "dorchestercounty": countyAuthority({
    key: "md-dorchester-county", name: "Dorchester County", state: "Maryland", phone: "410-228-9636",
    officialPage: "https://dorchestercountymd.com/departments/planning-zoning/",
    applicationResources: [
      countyPermitApplication({ id: "dorchester-evolve", label: "Dorchester County Online Permitting and Plan Review", url: "https://evolvepublic.infovisionsoftware.com/Dorchester/", authority: "Dorchester County", phone: "410-228-9636", matchLevel: "official_submission_portal", method: "online", format: "portal", actionLabel: "Open Dorchester permit portal", description: "Official Dorchester County online permitting and plan-review portal for residential permits." }),
      countyPermitApplication({ id: "dorchester-application", label: "Dorchester County Permit Application", url: "https://dorchestercountymd.com/wp-content/uploads/2022/09/PERMIT-APPLICATION-FINAL-DEC-2020-Rightsized.pdf", authority: "Dorchester County", phone: "410-228-9636", matchLevel: "exact_application", method: "download", format: "pdf", actionLabel: "Open Dorchester permit application", description: "Official Dorchester County application for permits, licensing, and inspections.", supporting: true }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "wicomicocounty": countyAuthority({
    key: "md-wicomico-county", name: "Wicomico County", state: "Maryland", phone: "410-548-4810",
    officialPage: "https://www.wicomicocounty.org/274/Permits-Inspections-Licenses-and-Fire-Pr",
    applicationResources: [
      countyPermitApplication({ id: "wicomico-residential", label: "Wicomico County Residential Building Permit Application", url: "https://www.wicomicocounty.org/documentcenter/view/1187", authority: "Wicomico County", phone: "410-548-4810", matchLevel: "exact_application", method: "download-or-email", format: "pdf", actionLabel: "Open Wicomico residential application", description: "Official Wicomico County residential building permit application and plan-review requirements." }),
      countyPermitApplication({ id: "wicomico-permits", label: "Wicomico County Permits and Inspections", url: "https://www.wicomicocounty.org/274/Permits-Inspections-Licenses-and-Fire-Pr", authority: "Wicomico County", phone: "410-548-4810", description: "Official residential, commercial, electrical, plumbing, floodplain, and fire-protection permit resources.", supporting: true }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "somersetcounty": countyAuthority({
    key: "md-somerset-county", name: "Somerset County", state: "Maryland", phone: "410-651-1424",
    officialPage: "https://www.somersetmd.us/departments/departments_-_n_-_z/planning_and_zoning/building_and_permitting.php",
    applicationResources: [
      countyPermitApplication({ id: "somerset-residential", label: "Somerset County Residential Building Permit Application", url: "https://cms7files1.revize.com/somersetcountymd/Building%20Permit%20Request%20Form.pdf", authority: "Somerset County", phone: "410-651-1424", matchLevel: "exact_application", method: "download-or-contact", format: "pdf", actionLabel: "Open Somerset building application", description: "Official Somerset County residential building permit request form." }),
      countyPermitApplication({ id: "somerset-building", label: "Somerset County Building and Permitting", url: "https://www.somersetmd.us/departments/departments_-_n_-_z/planning_and_zoning/building_and_permitting.php", authority: "Somerset County", phone: "410-651-1424", description: "Official Somerset County building and permitting contact and requirements.", supporting: true }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
  "worcestercounty": countyAuthority({
    key: "md-worcester-county", name: "Worcester County", state: "Maryland", phone: "410-632-1200",
    officialPage: "https://www.co.worcester.md.us/departments/drp/deptlist",
    applicationResources: [
      countyPermitApplication({ id: "worcester-application", label: "Worcester County Permit Application", url: "https://www.co.worcester.md.us/sites/default/files/departments/drp/Permit_App.pdf", authority: "Worcester County", phone: "410-632-1200", matchLevel: "exact_application", method: "download-and-submit", format: "pdf", actionLabel: "Open Worcester permit application", description: "Official Worcester County building, zoning, and demolition permit application for unincorporated areas." }),
      countyPermitApplication({ id: "worcester-checklist", label: "Worcester County Permit Submittal Checklist", url: "https://www.co.worcester.md.us/sites/default/files/DRP%20Permit%20Checklist%20%20updated%203.27.24.pdf", authority: "Worcester County", phone: "410-632-1200", matchLevel: "exact_supporting_form", method: "download", format: "pdf", actionLabel: "Open Worcester permit checklist", description: "Official Worcester County minimum submittal checklist.", supporting: true }),
      MARYLAND_MUNICIPAL_DIRECTORY,
    ],
  }),
};

const VA_COUNTY_AUTHORITIES = {
  "accomackcounty": countyAuthority({
    key: "va-accomack-county", name: "Accomack County", state: "Virginia", phone: "757-787-5720",
    officialPage: "https://www.accomack.gov/330/Building-Permits-Code-Inspections",
    municipalMode: "county-building-except-chincoteague",
    applicationResources: [
      countyPermitApplication({ id: "accomack-applications", label: "Accomack County Permit Applications and Documents", url: "https://www.accomack.gov/341/Permit-Applications-Documents", authority: "Accomack County", phone: "757-787-5720", matchLevel: "official_form_listing", method: "download-or-portal", format: "webpage", actionLabel: "Open Accomack permit applications", description: "Official Accomack County building applications, deck specifications, residential site-plan checklists, and supporting forms." }),
      countyPermitApplication({ id: "accomack-inspections", label: "Accomack County Building Permits and Code Inspections", url: "https://www.accomack.gov/330/Building-Permits-Code-Inspections", authority: "Accomack County", phone: "757-787-5720", description: "Accomack County enforces the statewide building code throughout the county and incorporated towns except Chincoteague.", supporting: true }),
      VIRGINIA_LOCAL_GOVERNMENT_DIRECTORY,
    ],
  }),
  "northamptoncounty": countyAuthority({
    key: "va-northampton-county", name: "Northampton County", state: "Virginia", phone: "757-678-0445",
    officialPage: "https://www.co.northampton.va.us/i_want_to_/apply_for/building_permit",
    applicationResources: [
      countyPermitApplication({ id: "northampton-building", label: "Northampton County Building Permit Application Process", url: "https://www.co.northampton.va.us/i_want_to_/apply_for/building_permit", authority: "Northampton County", phone: "757-678-0445", matchLevel: "official_application_process", method: "download-and-submit", format: "webpage", actionLabel: "Open Northampton building permit process", description: "Official Northampton County building permit application process and submission instructions." }),
      countyPermitApplication({ id: "northampton-forms", label: "Northampton County Permit Guides, Policies and Forms", url: "https://www.co.northampton.va.us/government/departments_elected_offices/planning_permiting_enforcement/building/building_forms", authority: "Northampton County", phone: "757-678-0445", matchLevel: "official_forms_library", method: "download", format: "webpage", actionLabel: "Open Northampton permit forms", description: "Official Northampton County permit applications, guides, and policies.", supporting: true }),
      VIRGINIA_LOCAL_GOVERNMENT_DIRECTORY,
    ],
  }),
};

const DELMARVA_FALLBACKS = {
  Delaware: {
    key: "delaware-regional-review",
    name: "Delaware permit authority review",
    type: "manual-review",
    state: "Delaware",
    county: "",
    phone: "",
    officialPage: "https://delaware.gov/guides/municipalities/",
    confidenceLabel: "Delaware authority confirmation required",
    workflow: "manual-review",
    requiredAuthorities: [],
    applications: [application({ id: "delaware-directory", label: "Delaware Incorporated Municipalities Directory", url: "https://delaware.gov/guides/municipalities/", authority: "State of Delaware", matchLevel: "authority_confirmation_required", method: "reference", format: "webpage", actionLabel: "Open Delaware municipality directory", description: "Official state directory for confirming the local government responsible for the project address.", projectKeys: ALL_BUILDING_PROJECT_KEYS })],
  },
  Maryland: {
    key: "maryland-eastern-shore-review",
    name: "Maryland Eastern Shore authority review",
    type: "manual-review",
    state: "Maryland",
    county: "",
    phone: "",
    officialPage: "https://msa.maryland.gov/msa/mdmanual/01glance/html/munic.html",
    confidenceLabel: "Maryland authority confirmation required",
    workflow: "manual-review",
    requiredAuthorities: [],
    applications: [MARYLAND_MUNICIPAL_DIRECTORY],
  },
  Virginia: {
    key: "virginia-eastern-shore-review",
    name: "Virginia Eastern Shore authority review",
    type: "manual-review",
    state: "Virginia",
    county: "",
    phone: "",
    officialPage: "https://www.virginia.gov/local-government/",
    confidenceLabel: "Virginia authority confirmation required",
    workflow: "manual-review",
    requiredAuthorities: [],
    applications: [VIRGINIA_LOCAL_GOVERNMENT_DIRECTORY],
  },
};

function municipalityWrappedAuthority(base, incorporatedPlace, stateName) {
  const isAccomack = base.key === "va-accomack-county";
  const isChincoteague = cleanPlaceName(incorporatedPlace) === "chincoteague";
  if (isAccomack && isChincoteague) {
    const chincoteague = countyPermitApplication({
      id: "chincoteague-building-permit",
      label: "Town of Chincoteague Building Permit Process",
      url: "https://chincoteague-va.gov/how-to-obtain-a-building-permit/",
      authority: "Town of Chincoteague",
      phone: "757-336-6519",
      matchLevel: "official_application_process",
      method: "municipal-application",
      format: "webpage",
      actionLabel: "Open Chincoteague permit process",
      description: "Chincoteague maintains its own Building and Zoning Office and does not use Accomack County for building permits.",
    });
    return {
      ...base,
      key: "va-chincoteague",
      name: "Town of Chincoteague",
      type: "municipality",
      phone: "757-336-6519",
      officialPage: "https://chincoteague-va.gov/how-to-obtain-a-building-permit/",
      confidenceLabel: "Chincoteague municipal authority matched",
      workflow: "municipal-permit",
      requiredAuthorities: [requiredAuthority("Town of Chincoteague", "Building and zoning permit authority", "https://chincoteague-va.gov/how-to-obtain-a-building-permit/", "757-336-6519")],
      applications: [chincoteague, VIRGINIA_LOCAL_GOVERNMENT_DIRECTORY],
    };
  }

  const directory = stateName === "Maryland" ? MARYLAND_MUNICIPAL_DIRECTORY : stateName === "Virginia" ? VIRGINIA_LOCAL_GOVERNMENT_DIRECTORY : null;
  const municipalRole = isAccomack
    ? "Local zoning approval; Accomack County building permit unless the locality states otherwise"
    : "Local zoning, land-use, floodplain, or municipal permit confirmation";

  return {
    ...base,
    key: `${base.key}-${cleanPlaceName(incorporatedPlace)}`,
    name: `${incorporatedPlace} / ${base.name}`,
    type: "multi-authority",
    confidenceLabel: "Incorporated place and county matched",
    workflow: "municipal-review-plus-county-permit",
    requiredAuthorities: [
      requiredAuthority(incorporatedPlace, municipalRole, directory?.url || base.officialPage, ""),
      requiredAuthority(base.name, "County building-permit process unless the municipality issues its own permit", base.officialPage, base.phone),
    ],
    applications: [...base.applications],
  };
}

const AUTHORITIES = {
  newCastleCounty: {
    key: "new-castle-county",
    name: "New Castle County",
    state: "Delaware",
    type: "county",
    county: "New Castle County",
    phone: "302-395-5400",
    officialPage: "https://www.newcastlede.gov/2507/Get-a-Permit",
    confidenceLabel: "Unincorporated New Castle County matched",
    workflow: "county-permit",
    requiredAuthorities: [
      requiredAuthority("New Castle County", "Building permit, plan review, and inspections", "https://www.newcastlede.gov/2507/Get-a-Permit", "302-395-5400"),
    ],
    applications: [NEW_CASTLE_ESERVICES],
  },
  kentCounty: {
    key: "kent-county",
    name: "Kent County",
    type: "county",
    county: "Kent County",
    phone: "302-744-2451",
    officialPage: "https://www.kentcountyde.gov/Residents/Permits/Building-Permits",
    confidenceLabel: "Unincorporated Kent County matched",
    workflow: "county-permit",
    requiredAuthorities: [
      requiredAuthority("Kent County", "Building permit, plan review, and inspections", "https://www.kentcountyde.gov/Residents/Permits/Building-Permits", "302-744-2451"),
    ],
    applications: [KENT_MGO, KENT_BUILDING_PAGE, KENT_MUNICIPAL_INFO],
  },
  sussexCounty: {
    key: "sussex-county",
    name: "Sussex County",
    type: "county",
    county: "Sussex County",
    phone: "302-855-7720",
    officialPage: "https://sussexcountyde.gov/building-permits-and-licenses",
    confidenceLabel: "Unincorporated Sussex County matched",
    workflow: "county-permit",
    requiredAuthorities: [
      requiredAuthority("Sussex County", "Building permit", "https://sussexcountyde.gov/building-permits-and-licenses", "302-855-7720"),
    ],
    applications: [SUSSEX_BUILDING_PROCESS, SUSSEX_FORMS, SUSSEX_SINGLE_FAMILY],
  },
  delawareFallback: {
    key: "delaware-fallback",
    name: "Delaware local jurisdiction review",
    type: "manual-review",
    county: "",
    phone: "",
    officialPage: "https://delaware.gov/guides/municipalities/",
    confidenceLabel: "Manual authority confirmation required",
    workflow: "manual-review",
    requiredAuthorities: [],
    applications: [
      application({
        id: "delaware-municipality-directory",
        label: "Delaware Incorporated Municipalities Directory",
        url: "https://delaware.gov/guides/municipalities/",
        authority: "State of Delaware",
        matchLevel: "authority_confirmation_required",
        method: "reference",
        format: "webpage",
        actionLabel: "Open Delaware municipality directory",
        description: "Official state directory for confirming the local government responsible for an address outside the current two-county release area.",
        projectKeys: ALL_BUILDING_PROJECT_KEYS,
      }),
    ],
  },
};

function cleanPlaceName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(city|town|village|municipality|cdp|borough)\b/g, "")
    .replace(/[^a-z]/g, "")
    .trim();
}

const PLACE_ALIASES = {
  bowers: "bowersbeach",
  bowersbeach: "bowersbeach",
  littlecreek: "littlecreek",
  bethanybeach: "bethanybeach",
  deweybeach: "deweybeach",
  fenwickisland: "fenwickisland",
  henlopenacres: "henlopenacres",
  oceanview: "oceanview",
  rehobothbeach: "rehobothbeach",
  slaughterbeach: "slaughterbeach",
  southbethany: "southbethany",
};

function authorityWithConfidence(authority, confidence, reason) {
  return { ...authority, confidence, reason, coverage: COVERAGE_SUMMARY };
}

function normalizeStateName(value, zip = "") {
  const clean = String(value || "").toLowerCase();
  if (clean.includes("delaware") || clean === "de") return "Delaware";
  if (clean.includes("maryland") || clean === "md") return "Maryland";
  if (clean.includes("virginia") || clean === "va") return "Virginia";
  if (String(zip).startsWith("19")) return "Delaware";
  if (String(zip).startsWith("21")) return "Maryland";
  if (String(zip).startsWith("23")) return "Virginia";
  return "";
}

function normalizedCountyKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function resolveAuthority({ incorporatedPlace, countyName, stateName, zip }) {
  const rawPlace = cleanPlaceName(incorporatedPlace);
  const place = PLACE_ALIASES[rawPlace] || rawPlace;
  const county = String(countyName || "").toLowerCase();
  const state = normalizeStateName(stateName, zip);
  const countyKey = normalizedCountyKey(countyName);

  if (state === "Delaware") {
    if (county.includes("new castle")) {
      if (place === "wilmington") {
        return authorityWithConfidence(
          {
            key: "wilmington-de",
            name: "City of Wilmington",
            state: "Delaware",
            type: "municipality",
            county: "New Castle County",
            phone: "302-576-3050",
            officialPage: "https://www.wilmingtonde.gov/government/city-departments/land-use-and-planning/land-use/permits-applications",
            confidenceLabel: "Wilmington municipal authority matched",
            workflow: "municipal-permit",
            requiredAuthorities: [requiredAuthority("City of Wilmington", "Building, zoning, and trade permit authority", "https://www.wilmingtonde.gov/government/city-departments/land-use-and-planning/land-use/permits-applications", "302-576-3050")],
            applications: [WILMINGTON_PERMITS],
          },
          "high",
          "The U.S. Census address geography places the property inside the City of Wilmington, which publishes its own building and trade permit applications."
        );
      }
      if (place) {
        return authorityWithConfidence(
          municipalityWrappedAuthority(AUTHORITIES.newCastleCounty, incorporatedPlace, state),
          "medium",
          `The address matched ${incorporatedPlace} in New Castle County. Confirm municipal zoning or local approval before relying on the county permit route.`
        );
      }
      return authorityWithConfidence(
        AUTHORITIES.newCastleCounty,
        "high",
        "The address matched unincorporated New Castle County, so Project Pilot routed the project to the county eServices permit workflow."
      );
    }

    if (county.includes("kent")) {
      if (place && KENT_AUTHORITIES[place]) {
        return authorityWithConfidence(
          KENT_AUTHORITIES[place],
          "high",
          `The U.S. Census address geography places the property inside ${incorporatedPlace}. Project Pilot loaded the official Kent County municipal-routing classification for this town.`
        );
      }
      if (place && !KENT_AUTHORITIES[place]) {
        return authorityWithConfidence(
          municipalityWrappedAuthority(AUTHORITIES.kentCounty, incorporatedPlace, state),
          "medium",
          `The address matched Kent County and an incorporated place named ${incorporatedPlace}. Confirm the town's current zoning or permit role before submission.`
        );
      }
      return authorityWithConfidence(
        AUTHORITIES.kentCounty,
        "high",
        "The address matched Kent County and the Census geocoder did not return an incorporated municipality. Project Pilot routed the project to Kent County's online building-permit process."
      );
    }

    if (county.includes("sussex")) {
      if (place && SUSSEX_AUTHORITIES[place]) {
        return authorityWithConfidence(
          SUSSEX_AUTHORITIES[place],
          "high",
          `The U.S. Census address geography places the property inside ${incorporatedPlace}. Sussex County requires county building permits for construction activity, and local municipal requirements may also apply.`
        );
      }
      if (place && !SUSSEX_AUTHORITIES[place]) {
        return authorityWithConfidence(
          municipalityWrappedAuthority(AUTHORITIES.sussexCounty, incorporatedPlace, state),
          "medium",
          `The address matched Sussex County and an incorporated place named ${incorporatedPlace}. Confirm municipal limits and local requirements before submission.`
        );
      }
      return authorityWithConfidence(
        AUTHORITIES.sussexCounty,
        "high",
        "The address matched unincorporated Sussex County, so Project Pilot routed the project to the Sussex County Building Permit Office."
      );
    }

    return authorityWithConfidence(
      DELMARVA_FALLBACKS.Delaware,
      "low",
      "The address appears to be in Delaware, but the county or incorporated-place match needs confirmation."
    );
  }

  if (state === "Maryland") {
    const base = MD_COUNTY_AUTHORITIES[countyKey];
    if (!base) {
      return authorityWithConfidence(
        DELMARVA_FALLBACKS.Maryland,
        "low",
        "The address appears to be in Maryland, but the county is outside the nine-county Eastern Shore beta area or could not be confirmed."
      );
    }

    if (place) {
      return authorityWithConfidence(
        municipalityWrappedAuthority(base, incorporatedPlace, state),
        "medium",
        `The Census geocoder matched ${incorporatedPlace} in ${base.name}. Project Pilot loaded the county permit process and flagged the municipality for local zoning or permit confirmation.`
      );
    }

    return authorityWithConfidence(
      base,
      "high",
      `The address matched unincorporated ${base.name}, so Project Pilot loaded the official county permit process and application resources.`
    );
  }

  if (state === "Virginia") {
    const base = VA_COUNTY_AUTHORITIES[countyKey];
    if (!base) {
      return authorityWithConfidence(
        DELMARVA_FALLBACKS.Virginia,
        "low",
        "The address appears to be in Virginia, but the county is outside Accomack and Northampton counties or could not be confirmed."
      );
    }

    if (place) {
      const wrapped = municipalityWrappedAuthority(base, incorporatedPlace, state);
      return authorityWithConfidence(
        wrapped,
        cleanPlaceName(incorporatedPlace) === "chincoteague" ? "high" : "medium",
        cleanPlaceName(incorporatedPlace) === "chincoteague"
          ? "The address matched the Town of Chincoteague, which maintains its own Building and Zoning Office."
          : `The address matched ${incorporatedPlace} in ${base.name}. Project Pilot loaded the county building-permit route and flagged the incorporated town for local zoning confirmation.`
      );
    }

    return authorityWithConfidence(
      base,
      "high",
      `The address matched unincorporated ${base.name}, so Project Pilot loaded the official county building-permit process.`
    );
  }

  return authorityWithConfidence(
    { ...DELMARVA_FALLBACKS.Delaware, name: "Local permit authority review", state: "" },
    "low",
    "This beta currently supports the Delmarva Peninsula: Delaware, Maryland's Eastern Shore, and Virginia's Eastern Shore."
  );
}

export function getApplicationMatches(authority, projectValue) {
  const projectKey = normalizeProjectKey(projectValue);
  const matches = authority.applications.filter(
    (item) => item.projectKeys.includes(projectKey) || item.projectKeys.includes("general")
  );
  const sorted = [...matches].sort((a, b) => Number(a.supporting) - Number(b.supporting));
  const primary = sorted.find((item) => !item.supporting) || sorted[0] || null;

  return {
    projectKey,
    primary,
    applications: sorted,
    exactApplicationAvailable: Boolean(
      primary && ["exact_application", "official_submission_portal", "official_form_listing"].includes(primary.matchLevel)
    ),
  };
}

export function verificationLabel(matchLevel) {
  const labels = {
    exact_application: "Exact official application",
    official_submission_portal: "Official application portal",
    official_form_listing: "Official application listing",
    exact_supporting_form: "Exact supporting form",
    official_application_process: "Official application process",
    official_portal: "Official permit portal",
    official_department_page: "Official department page",
    official_forms_library: "Official forms library",
    official_requirements_page: "Official requirements page",
    official_municipal_starting_point: "Official municipal permit source",
    authority_confirmation_required: "Authority confirmation required",
  };
  return labels[matchLevel] || "Official resource";
}
