import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  contactName?: string;
  companyName?: string;
  dealStage?: string;
  lastInteraction?: string;
  tone?: "Friendly" | "Professional" | "Follow-up" | "Cold outreach" | "Thank you";
  length?: "Short" | "Medium" | "Detailed";
  customNotes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const tone = body.tone ?? "Professional";
    const length = body.length ?? "Medium";
    const lengthGuide =
      length === "Short" ? "60-90 words, 2 short paragraphs."
      : length === "Detailed" ? "180-250 words, 3-4 paragraphs."
      : "100-140 words, 2-3 paragraphs.";

    const system = `You are an expert B2B sales email writer for a CRM platform.
Write a complete email (subject line + body) tailored to the contact and deal context provided.
Tone: ${tone}.
Length: ${lengthGuide}
Output format strictly:
Subject: <subject line>

<email body>

Do not include any preamble or explanation outside the email itself. Use the contact's first name only. Sign off with "Best,".`;

    const userMsg = [
      body.contactName ? `Contact: ${body.contactName}` : null,
      body.companyName ? `Company: ${body.companyName}` : null,
      body.dealStage ? `Deal stage: ${body.dealStage}` : null,
      body.lastInteraction ? `Last interaction: ${body.lastInteraction}` : null,
      body.customNotes ? `Additional notes: ${body.customNotes}` : null,
    ].filter(Boolean).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg || "Write a thoughtful outreach email." },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-email-writer error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
