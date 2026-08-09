import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SALT = Deno.env.get("IP_HASH_SALT") ?? "fallback-salt";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha256 = async (value: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const clientIp = (req: Request) =>
  (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-real-ip") ||
  "";

/** Tor exit-node list, cached in memory for an hour. */
let torList: Set<string> | null = null;
let torFetchedAt = 0;
const isTorExit = async (ip: string) => {
  if (!ip) return false;
  if (!torList || Date.now() - torFetchedAt > 3_600_000) {
    try {
      const res = await fetch("https://check.torproject.org/torbulkexitlist", {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        torList = new Set((await res.text()).split("\n").map((l) => l.trim()).filter(Boolean));
        torFetchedAt = Date.now();
      }
    } catch {
      /* network lookup is best-effort */
    }
  }
  return torList?.has(ip) ?? false;
};

/** ip-api.com free endpoint — no key required. */
const inspectIp = async (ip: string) => {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,proxy,hosting,mobile`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status !== "success") return null;
    return {
      country: data.countryCode as string | null,
      proxy: !!data.proxy,
      hosting: !!data.hosting,
    };
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let context = "signup";
    try {
      const body = await req.json();
      if (typeof body?.context === "string") context = body.context.slice(0, 40);
    } catch {
      /* body optional */
    }

    // Resolve the caller when a session is present; anonymous checks are allowed.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const anonClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await anonClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const ip = clientIp(req);
    if (!ip) return json({ checked: false, blocked: false });

    const ipHash = await sha256(`${SALT}:${ip}`);
    const [info, tor] = await Promise.all([inspectIp(ip), isTorExit(ip)]);

    const isProxy = info?.proxy ?? false;
    const isHosting = info?.hosting ?? false;
    const isVpn = isProxy || isHosting;
    const blocked = isVpn || tor;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    await admin.rpc("internal_record_network_signal", {
      _user_id: userId,
      _ip_hash: ipHash,
      _country: info?.country ?? null,
      _is_vpn: isVpn,
      _is_proxy: isProxy,
      _is_tor: tor,
      _is_hosting: isHosting,
      _context: context,
    });

    return json({ checked: true, blocked, vpn: isVpn, proxy: isProxy, tor, country: info?.country ?? null });
  } catch (err) {
    console.error("network-check failed", err);
    return json({ checked: false, blocked: false });
  }
});
