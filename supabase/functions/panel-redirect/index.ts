import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APP_URL = "https://pollpay.surveyparadox.com";

/** Send the respondent back into the app, which renders the outcome UI. */
const back = (result: string, coins = 0) =>
  new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: `${APP_URL}/survey-return?result=${encodeURIComponent(result)}&coins=${coins}`,
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    const rawUid = (url.searchParams.get("uid") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim();

    const expected = Deno.env.get("PANEL_REDIRECT_SECRET") ?? "";
    if (!expected || token !== expected) {
      console.error("panel-redirect: bad token");
      return back("invalid");
    }
    if (!rawUid || !status) return back("incomplete");

    // Panel sends uid as "<trackingUid>_<panelSurveyRowId>" — the tracking uid is the first segment.
    const trackingUid = rawUid.split("_")[0];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase.rpc("panel_settle_claim", {
      _tracking_uid: trackingUid,
      _panel_status: status,
    });

    if (error) {
      console.error("panel_settle_claim failed:", error.message);
      return back("error");
    }

    const result = data as Record<string, unknown>;
    console.log("panel-redirect settled", trackingUid, status, JSON.stringify(result));

    if (!result?.ok) return back("unmatched");
    if (result.already_settled) return back("already");
    if (result.settled === "approved") return back("approved", Number(result.coins ?? 0));
    if (result.settled === "pending") return back("pending");
    return back("rejected");
  } catch (e) {
    console.error("panel-redirect error:", e instanceof Error ? e.message : String(e));
    return back("error");
  }
});
