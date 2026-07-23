import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qytzrlupvkqdulffnpez.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_zi6CB203ohT4Qx8GazWqBw_fjsJS51f";

const PILOT_INSTRUCTIONS = `You are Pilot, the AI project guide inside Project Pilot. Guide users from concept to completion with a calm, friendly, professional, and confident voice. Ask one useful question at a time when information is missing. Give clear next actions. Use aviation language lightly and naturally, never as a gimmick. Do not claim that permit, zoning, code, legal, cost, or schedule information is verified unless reliable project data confirms it. When discussing those topics, explain what still needs verification with the relevant authority or qualified professional. Keep responses useful and reasonably concise.`;

function getOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content?.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!accessToken) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    const { projectId, message } = await request.json();
    const cleanMessage = typeof message === "string" ? message.trim() : "";
    if (!projectId || !cleanMessage) {
      return NextResponse.json({ error: "A project and message are required." }, { status: 400 });
    }
    if (cleanMessage.length > 6000) {
      return NextResponse.json({ error: "Please shorten that message to 6,000 characters or fewer." }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,title,description,project_type,status,next_step,location_label,address,jurisdiction")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "That project could not be opened." }, { status: 404 });
    }

    const { error: saveUserError } = await supabase.from("conversations").insert({
      project_id: project.id,
      user_id: user.id,
      role: "user",
      message: cleanMessage,
    });
    if (saveUserError) throw saveUserError;

    const { data: history, error: historyError } = await supabase
      .from("conversations")
      .select("role,message,created_at")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (historyError) throw historyError;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY has not been added to Vercel yet." }, { status: 500 });
    }

    const chronologicalHistory = [...(history || [])].reverse().map((entry) => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: entry.message,
    }));

    const projectContext = `Current project:\nTitle: ${project.title || "Untitled project"}\nType: ${project.project_type || "Not provided"}\nDescription: ${project.description || "Not provided"}\nStatus: ${project.status || "Getting Started"}\nNext step: ${project.next_step || "Not set"}\nLocation: ${project.address || project.location_label || "Not provided"}\nJurisdiction: ${project.jurisdiction || "Not verified"}`;

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: `${PILOT_INSTRUCTIONS}\n\n${projectContext}`,
        input: chronologicalHistory,
        max_output_tokens: 700,
      }),
    });

    const responseData = await openAIResponse.json();
    if (!openAIResponse.ok) {
      console.error("OpenAI error", responseData);
      return NextResponse.json({ error: responseData?.error?.message || "Pilot could not respond right now." }, { status: 502 });
    }

    const reply = getOutputText(responseData);
    if (!reply) {
      return NextResponse.json({ error: "Pilot returned an empty response. Please try again." }, { status: 502 });
    }

    const { data: savedReply, error: saveReplyError } = await supabase
      .from("conversations")
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: "assistant",
        message: reply,
      })
      .select("id,role,message,created_at")
      .single();
    if (saveReplyError) throw saveReplyError;

    return NextResponse.json({ message: savedReply });
  } catch (error) {
    console.error("Pilot route error", error);
    return NextResponse.json({ error: error?.message || "Pilot could not complete that request." }, { status: 500 });
  }
}
