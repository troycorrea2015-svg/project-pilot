module.exports = async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"OPENAI_API_KEY is not configured"});
  const {address="",zip="",project="",approach="",description=""}=req.body||{};
  const prompt=`You are Project Pilot, a careful home-project planning assistant. Create a concise preliminary roadmap for this project. Property: ${address}, ZIP ${zip}. Project: ${project}. Approach: ${approach}. Details: ${description||"Not provided"}. Do not claim that a permit is definitely required and do not invent exact fees, timelines, code citations, or government links. Explain that the property jurisdiction must be verified from official sources. Return ONLY valid JSON with these keys: title, summary, city, county, steps (array of 5-7 strings), documents (array of 3-6 strings). Use city as "Jurisdiction verification required" and county as "Confirm from the full property address" unless the location is certain from the supplied information.`;
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.4-mini",input:prompt})});
    if(!response.ok){const detail=await response.text();return res.status(502).json({error:"AI request failed",detail});}
    const result=await response.json();
    const text=result.output_text||result.output?.flatMap(x=>x.content||[]).map(x=>x.text||"").join("")||"";
    const cleaned=text.replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
    const data=JSON.parse(cleaned);
    return res.status(200).json({...data,ai:true});
  }catch(error){return res.status(500).json({error:"Unable to create roadmap",detail:error.message});}
}
