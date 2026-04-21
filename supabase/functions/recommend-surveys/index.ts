import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Verify user from JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch profile + surveys
    const [profileR, surveysR] = await Promise.all([
      admin.from("profiles").select(
        "age_range,gender,country,employment_status,job_title,industry,income_range,interests,shopping_habits,marital_status,has_kids,education,background_completed",
      ).eq("user_id", userId).maybeSingle(),
      admin.from("surveys").select("id,title,description,category,reward_cents,estimated_minutes,target_audience")
        .not("created_by", "is", null),
    ]);

    const profile = profileR.data;
    const surveys = surveysR.data ?? [];
    if (!profile?.background_completed) {
      return new Response(JSON.stringify({ error: "Background not completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (surveys.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a survey-matching engine. Given a respondent profile and a list of surveys, score each survey 0-100 for how well it matches the respondent (higher = better fit). Consider demographics, employment, lifestyle, and household. Return concise reasons.`;

    const userPrompt = `Respondent profile:\n${JSON.stringify(profile, null, 2)}\n\nSurveys:\n${JSON.stringify(
      surveys.map((s: any) => ({ id: s.id, title: s.title, description: s.description, category: s.category })),
      null,
      2,
    )}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "rank_surveys",
              description: "Return a ranked list of surveys with match scores.",
              parameters: {
                type: "object",
                properties: {
                  rankings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        survey_id: { type: "string" },
                        score: { type: "integer", minimum: 0, maximum: 100 },
                        reason: { type: "string" },
                      },
                      required: ["survey_id", "score", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["rankings"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "rank_surveys" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      throw new Error("AI gateway failed");
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { rankings: [] };
    const rankings: { survey_id: string; score: number; reason: string }[] =
      args.rankings ?? [];

    // Validate survey_ids exist
    const validIds = new Set(surveys.map((s: any) => s.id));
    const filtered = rankings.filter((r) => validIds.has(r.survey_id));

    // Replace cache
    await admin.from("survey_recommendations").delete().eq("user_id", userId);
    if (filtered.length > 0) {
      await admin.from("survey_recommendations").insert(
        filtered.map((r) => ({
          user_id: userId,
          survey_id: r.survey_id,
          score: r.score,
          reason: r.reason,
        })),
      );
    }

    return new Response(JSON.stringify({ recommendations: filtered }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-surveys error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
