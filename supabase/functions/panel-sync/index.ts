import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SETTLEABLE = new Set(["completed", "complete", "quotafull", "terminate", "terminated", "security"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const panelBase = (Deno.env.get("PANEL_BASE_URL") ?? "").replace(/\/+$/, "");
    const panelKey = Deno.env.get("PANEL_API_KEY") ?? "";
    if (!panelBase || !panelKey) return json({ error: "Panel integration is not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const userId = userData.user.id;

    let scopeAll = false;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.scope === "all") {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) return json({ error: "Not authorized" }, 403);
        scopeAll = true;
      }
    }

    let query = admin
      .from("survey_claims")
      .select("id, tracking_uid, user_id")
      .eq("status", "pending")
      .not("tracking_uid", "is", null)
      .order("submitted_at", { ascending: true })
      .limit(scopeAll ? 200 : 25);
    if (!scopeAll) query = query.eq("user_id", userId);

    const { data: claims, error: claimsErr } = await query;
    if (claimsErr) {
      console.error("panel-sync: claim lookup failed:", claimsErr.message);
      return json({ error: "Could not load pending submissions" }, 500);
    }
    if (!claims?.length) return json({ checked: 0, settled: 0, results: [] });

    const results: Array<Record<string, unknown>> = [];
    let settled = 0;

    for (const claim of claims) {
      const statusUrl = `${panelBase}/api/survey-status?uid=${encodeURIComponent(claim.tracking_uid!)}`;
      let panelStatus: string | null = null;

      try {
        const res = await fetch(statusUrl, { headers: { "X-API-KEY": panelKey, Accept: "application/json" } });
        if (res.status === 404) {
          results.push({ tracking_uid: claim.tracking_uid, panel_status: "not_found" });
          continue;
        }
        if (!res.ok) {
          const detail = await res.text();
          console.error(`panel-sync: panel returned [${res.status}]: ${detail}`);
          results.push({ tracking_uid: claim.tracking_uid, error: `panel_${res.status}` });
          continue;
        }
        const body = await res.json();
        panelStatus = typeof body?.status === "string" ? body.status.toLowerCase().trim() : null;
      } catch (e) {
        console.error("panel-sync: fetch failed:", e instanceof Error ? e.message : String(e));
        results.push({ tracking_uid: claim.tracking_uid, error: "panel_unreachable" });
        continue;
      }

      if (!panelStatus || !SETTLEABLE.has(panelStatus)) {
        results.push({ tracking_uid: claim.tracking_uid, panel_status: panelStatus ?? "unknown" });
        continue;
      }

      const { data: settleRes, error: settleErr } = await admin.rpc("panel_settle_claim", {
        _tracking_uid: claim.tracking_uid,
        _panel_status: panelStatus,
      });
      if (settleErr) {
        console.error("panel-sync: settle failed:", settleErr.message);
        results.push({ tracking_uid: claim.tracking_uid, error: settleErr.message });
        continue;
      }
      const r = settleRes as Record<string, unknown>;
      if (r?.ok && !r.already_settled) settled++;
      results.push({ tracking_uid: claim.tracking_uid, panel_status: panelStatus, ...r });
    }

    console.log(`panel-sync: checked ${claims.length}, settled ${settled}`);
    return json({ checked: claims.length, settled, results });
  } catch (e) {
    console.error("panel-sync error:", e instanceof Error ? e.message : String(e));
    return json({ error: "Unexpected error" }, 500);
  }
});
