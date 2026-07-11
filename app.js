const guides={
  Fence:{summary:"Fence projects often require zoning review even when a building permit is not required.",documents:["Property survey or site plan","Fence height and material details","HOA approval, when applicable"],steps:["Confirm the property jurisdiction and zoning district.","Check height, setback, corner-visibility, and easement restrictions.","Prepare a site plan showing property lines and the proposed fence location.","Submit the zoning or building application required by the local authority.","Pay applicable fees and wait for approval before construction.","Schedule any required final inspection."]},
  Deck:{summary:"Decks commonly require a building permit, structural plans, and inspections.",documents:["Site plan","Framing and footing plan","Material specifications","Contractor details"],steps:["Confirm setbacks, lot coverage, and flood-zone requirements.","Prepare structural drawings showing footings, framing, stairs, and guards.","Submit the building permit application and supporting documents.","Pay review and permit fees.","Complete footing, framing, and final inspections as required.","Keep final approval with your property records."]},
  Shed:{summary:"Permit requirements often depend on shed size, foundation, utilities, and placement.",documents:["Site plan","Shed dimensions","Foundation details","Electrical plans if applicable"],steps:["Confirm whether the shed size qualifies for an exemption.","Check setbacks, easements, lot coverage, and flood-zone restrictions.","Prepare a site plan and manufacturer drawings.","Submit zoning and building applications when required.","Schedule inspections for foundation, electrical, or final approval."]},
  "Roof replacement":{summary:"Roof-replacement requirements vary by project scope, structural changes, and local licensing rules.",documents:["Scope of work","Roofing material specifications","Contractor license and insurance"],steps:["Confirm whether the work is a repair or full replacement.","Verify local permit and contractor licensing requirements.","Document roof covering, underlayment, flashing, and ventilation.","Submit the permit application when required.","Schedule required inspections and retain closeout documents."]},
  "HVAC replacement":{summary:"HVAC work commonly requires mechanical permits and licensed installation.",documents:["Equipment specifications","Load calculations when required","Contractor license information"],steps:["Confirm equipment type, size, and location.","Verify mechanical, electrical, and fuel-gas permit requirements.","Select a properly licensed contractor.","Submit applications and equipment documentation.","Complete startup, safety, and final inspections."]},
  "Kitchen remodel":{summary:"Permit needs depend on structural, electrical, plumbing, gas, and ventilation changes.",documents:["Floor plan","Electrical layout","Plumbing scope","Structural details if walls change"],steps:["Define whether walls, plumbing, electrical, or gas lines will move.","Confirm required building and trade permits.","Prepare plans and contractor information.","Submit applications before demolition begins.","Complete rough-in and final inspections for each permitted trade."]},
  "Bathroom remodel":{summary:"Bathroom permits commonly depend on plumbing, electrical, ventilation, and structural changes.",documents:["Floor plan","Plumbing scope","Electrical layout","Ventilation specifications"],steps:["Define fixture, plumbing, electrical, and wall changes.","Confirm required building and trade permits.","Prepare drawings and contractor information.","Submit applications before demolition begins.","Complete rough-in, waterproofing, and final inspections when required."]}
};

const form=document.getElementById("planner-form");

form.addEventListener("submit",async(event)=>{
  event.preventDefault();

  const submit=document.getElementById("submit-label");
  submit.textContent="Verifying address and official sources…";

  const payload={
    address:document.getElementById("address").value.trim(),
    zip:document.getElementById("zip").value.trim(),
    project:document.getElementById("project").value,
    approach:document.getElementById("approach").value,
    description:document.getElementById("description").value.trim()
  };

  try{
    const response=await fetch("/api/lookup",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });

    const data=await response.json();

    if(!response.ok){
      throw new Error(data.error||"The address lookup failed.");
    }

    render(data,true,"Official-source data mode");
  }catch(error){
    const guide=guides[payload.project];

    render({
      title:`${payload.project} — lookup unavailable`,
      summary:guide.summary,
      city:"Jurisdiction verification required",
      county:"The real-data service could not be reached",
      steps:guide.steps,
      documents:guide.documents,
      facts:["The address lookup did not complete. Try again or open the official government sources directly."],
      sources:[],
      sourceStatus:"Real address and government-source lookup failed."
    },false,error.message);
  }finally{
    submit.textContent="Build my project roadmap";
  }
});

function render(data,realData,note){
  document.getElementById("result-title").textContent=data.title||"Project roadmap";
  document.getElementById("result-summary").textContent=data.summary||"";
  document.getElementById("result-city").textContent=data.city||"Verification required";
  document.getElementById("result-county").textContent=data.matchedAddress
    ?`${data.county} · Matched address: ${data.matchedAddress}`
    :(data.county||"Confirm with the local authority");

  document.getElementById("steps-list").innerHTML=(data.steps||[])
    .map((x,i)=>`<li><span>${i+1}</span><p>${escapeHtml(x)}</p></li>`).join("");

  document.getElementById("documents-list").innerHTML=(data.documents||[])
    .map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join("");

  document.getElementById("facts-list").innerHTML=(data.facts||[])
    .map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join("");

  document.getElementById("official-links").innerHTML=(data.sources||[])
    .map(source=>`<a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} ↗</a>`).join("");

  document.getElementById("source-status").textContent=data.sourceStatus||"Source status unavailable.";
  document.getElementById("mode-badge").textContent=realData?"REAL DATA MODE":"FALLBACK MODE";
  document.getElementById("ai-note").textContent=realData
    ?"The address was checked and the roadmap includes official government links. Final permit decisions still belong to the governing authority."
    :(note||"The real-data lookup is not active.");

  const section=document.getElementById("results");
  section.classList.remove("hidden");
  setTimeout(()=>section.scrollIntoView({behavior:"smooth"}),60);
}

function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "'":"&#39;",
    '"':"&quot;"
  }[c]));
}

function escapeAttribute(value){
  return String(value).replace(/"/g,"&quot;");
}

document.getElementById("quote-button").addEventListener("click",()=>{
  document.getElementById("quote-message").classList.remove("hidden");
});
