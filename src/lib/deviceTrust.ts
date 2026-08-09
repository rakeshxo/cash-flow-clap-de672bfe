import { supabase } from "@/integrations/supabase/client";

/**
 * Stable, privacy-preserving device signature.
 * Combines coarse hardware/browser traits with a canvas + WebGL render hash.
 * No third-party scripts, no cross-site tracking.
 */
const canvasHash = (): string => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 110, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("survey-paradox-fp", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("survey-paradox-fp", 4, 17);
    return canvas.toDataURL().slice(-96);
  } catch {
    return "canvas-error";
  }
};

const webglHash = (): string => {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "no-webgl";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return `${vendor}|${renderer}`;
  } catch {
    return "webgl-error";
  }
};

const sha256Hex = async (value: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

let cached: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cached) return cached;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const parts = [
    nav.userAgent,
    nav.language,
    (nav.languages ?? []).join(","),
    String(nav.hardwareConcurrency ?? 0),
    String(nav.deviceMemory ?? 0),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(navigator.maxTouchPoints ?? 0),
    canvasHash(),
    webglHash(),
  ];
  cached = await sha256Hex(parts.join("::"));
  return cached;
}

export function deviceMeta() {
  return {
    userAgent: navigator.userAgent.slice(0, 400),
    platform: (navigator as Navigator & { platform?: string }).platform ?? "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
  };
}

/** Registers the current device against the signed-in account and returns how many other accounts share it. */
export async function registerCurrentDevice(): Promise<number> {
  try {
    const fingerprint = await getDeviceFingerprint();
    const meta = deviceMeta();
    const { data, error } = await supabase.rpc("register_device", {
      _fingerprint: fingerprint,
      _user_agent: meta.userAgent,
      _platform: meta.platform,
      _timezone: meta.timezone,
    });
    if (error) return 0;
    return Number((data as { other_accounts?: number } | null)?.other_accounts ?? 0);
  } catch {
    return 0;
  }
}

/** Runs the server-side VPN / proxy / Tor check. Never throws. */
export async function runNetworkCheck(context: "signup" | "login" | "withdrawal") {
  try {
    const { data, error } = await supabase.functions.invoke("network-check", { body: { context } });
    if (error) return { checked: false, blocked: false } as const;
    return data as { checked: boolean; blocked: boolean; vpn?: boolean; proxy?: boolean; tor?: boolean };
  } catch {
    return { checked: false, blocked: false } as const;
  }
}
