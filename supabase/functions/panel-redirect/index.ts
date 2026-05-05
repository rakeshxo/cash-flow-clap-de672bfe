// Panel redirect handler — verifies completion status from external panel
// URL format: /functions/v1/panel-redirect?status=complete&uid=XXX&token=SECRET
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUS_MAP: Record<string, "approved" | "rejected"> = {
  complete: "approved",
  quotafull: "rejected",
  terminate: "rejected",
  security: "rejected",
};

const html = (title: string, body: string, color: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,sans-serif;background:#0a0a14;color:#e5e7eb;padding:1rem}
  .card{max-width:420px;width:100%;padding:2rem;border-radius:1rem;
    background:rgba(20,20,35,.85);border:1px solid ${color};box-shadow:0 0 40px ${color}55;text-align:center}
  h1{margin:0 0 .75rem;font-size:1.5rem;color:${color}}
  p{margin:0 0 1.5rem;color:#a1a1aa;line-height:1.5}
  a{display:inline-block;padding:.75rem 1.5rem;border-radius:.5rem;background:${color};
    color:#0a0a14;font-weight:600;text-decoration:none}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${body}</p>
<a href="/dashboard">Back to dashboard</a></div></body></html>`;

const respond = (title: string, body: string, color: string, status = 200) =>
  new Response(html(title, body, color), {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const statusParam = (url.searchParams.get("status") ?? "").toLowerCase();
  const uid = url.searchParams.get("uid") ?? "";
  const token = url.searchParams.get("token") ?? "";

  const expected = Deno.env.get("PANEL_REDIRECT_SECRET") ?? "";
  if (!expected || token !== expected) {
    return respond("Invalid token", "This redirect could not be verified.", "#ef4444", 403);
  }
  if (!uid || !STATUS_MAP[statusParam]) {
    return respond("Invalid request", "Missing or unknown status/uid.", "#ef4444", 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Look up the claim
  const { data: claim, error: lookupErr } = await supabase
    .from("survey_claims")
    .select("id, user_id, survey_id, reward_cents, status")
    .eq("tracking_uid", uid)
    .maybeSingle();

  if (lookupErr || !claim) {
    return respond("Not found", "We couldn't find your survey claim.", "#ef4444", 404);
  }

  const newStatus = STATUS_MAP[statusParam];

  // If already finalized, just show the result page
  if (claim.status === "approved" || claim.status === "rejected") {
    if (claim.status === "approved") {
      return respond("Already verified ✓", `You've already been credited +${claim.reward_cents} coins for this survey.`, "#22d3ee");
    }
    return respond("Already recorded", "This survey response was already processed.", "#a78bfa");
  }

  // Update claim
  const { error: updErr } = await supabase
    .from("survey_claims")
    .update({ status: newStatus, reviewed_at: new Date().toISOString() })
    .eq("id", claim.id);

  if (updErr) {
    return respond("Error", "Could not update claim. Please try again.", "#ef4444", 500);
  }

  if (newStatus === "approved") {
    // Award coins via coin_transactions (trigger-free path: insert tx record)
    await supabase.from("coin_transactions").insert({
      user_id: claim.user_id,
      amount: claim.reward_cents,
      type: "survey",
      description: "Survey completion verified by panel",
      reference_id: claim.survey_id,
    });
    await supabase.from("notifications").insert({
      user_id: claim.user_id,
      title: "Survey approved!",
      body: `You earned +${claim.reward_cents} coins.`,
      icon: "coin",
    });
    return respond("Completed! 🎉", `+${claim.reward_cents} coins have been added to your account.`, "#22d3ee");
  }

  const reasons: Record<string, string> = {
    quotafull: "Quota was full — sorry, you arrived just after it filled up.",
    terminate: "You didn't qualify for this survey based on your answers.",
    security: "This response was flagged. No coins were awarded.",
  };
  const reason = reasons[statusParam] ?? "No coins awarded.";
  await supabase.from("notifications").insert({
    user_id: claim.user_id,
    title: "Survey rejected",
    body: reason,
    icon: "bell",
  });
  return respond("Not eligible", reason, "#a78bfa");
});
