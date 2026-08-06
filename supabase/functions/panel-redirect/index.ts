import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APP_URL = "https://pollpay.surveyparadox.com";

const page = (title: string, message: string, tone: "good" | "bad") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#07080d;color:#e6f1f5;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.card{max-width:420px;padding:40px 32px;text-align:center;border-radius:20px;
background:rgba(18,22,32,.85);border:1px solid ${tone === "good" ? "rgba(45,226,203,.35)" : "rgba(255,74,138,.35)"};
box-shadow:0 0 60px ${tone === "good" ? "rgba(45,226,203,.12)" : "rgba(255,74,138,.12)"}}
h1{font-size:22px;margin:0 0 10px;letter-spacing:.02em;color:${tone === "good" ? "#2de2cb" : "#ff4a8a"}}
p{margin:0 0 24px;color:#93a4b3;line-height:1.5;font-size:15px}
a{display:inline-block;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600;
background:${tone === "good" ? "#2de2cb" : "#232a38"};color:${tone === "good" ? "#04140f" : "#e6f1f5"}}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p>
<a href="${APP_URL}/dashboard">Back to dashboard</a></div></body></html>`;

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });

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
      return html(page("Verification failed", "This return link is not valid. If you completed a survey, your reward will be settled automatically shortly.", "bad"), 401);
    }
    if (!rawUid || !status) {
      return html(page("Missing information", "The return link is incomplete. Your submission stays pending and will be reconciled automatically.", "bad"), 400);
    }

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
      return html(page("Could not verify yet", "We could not confirm your completion right now. It will be reconciled automatically — no need to retake the survey.", "bad"), 500);
    }

    const result = data as Record<string, unknown>;
    console.log("panel-redirect settled", trackingUid, status, JSON.stringify(result));

    if (!result?.ok) {
      return html(page("Nothing to settle", "We could not match this return to one of your submissions. Contact support if you believe this is an error.", "bad"), 200);
    }
    if (result.already_settled) {
      return html(page("Already recorded", "This submission was already processed. Check your activity feed for the outcome.", "good"));
    }
    if (result.settled === "approved") {
      return html(page("Completion verified", `Nice work — ${result.coins} coins have been added to your balance.`, "good"));
    }
    return html(page("Not rewarded", "Your session did not qualify for a reward this time. Plenty of other surveys are waiting.", "bad"));
  } catch (e) {
    console.error("panel-redirect error:", e instanceof Error ? e.message : String(e));
    return html(page("Something went wrong", "We hit an unexpected error. Your submission is safe and will be reconciled automatically.", "bad"), 500);
  }
});
