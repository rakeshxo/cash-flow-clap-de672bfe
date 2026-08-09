import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeCheck, ShieldAlert, Clock } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

const DOC_TYPES = [
  { id: "passport", label: "Passport" },
  { id: "national_id", label: "National ID" },
  { id: "drivers_license", label: "Driver's licence" },
];

export const KYC_COIN_THRESHOLD = 5000;

/** Identity verification required before payouts above the coin threshold. */
export const KycPanel = ({ onStatusChange }: { onStatusChange?: (s: string) => void }) => {
  const [status, setStatus] = useState<string>("none");
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [docType, setDocType] = useState("passport");
  const [docRef, setDocRef] = useState("");

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return setLoading(false);
    const { data } = await supabase
      .from("kyc_verifications")
      .select("status, admin_note")
      .eq("user_id", uid)
      .maybeSingle();
    const s = data?.status ?? "none";
    setStatus(s);
    setNote(data?.admin_note ?? null);
    onStatusChange?.(s);
    setLoading(false);
  }, [onStatusChange]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (fullName.trim().length < 3) return toast.error("Enter your full legal name");
    if (!dob) return toast.error("Enter your date of birth");
    if (country.trim().length < 2) return toast.error("Enter your country");
    if (docRef.trim().length < 4) return toast.error("Enter a valid document number");
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_kyc", {
      _full_name: fullName.trim(),
      _dob: dob,
      _country: country.trim(),
      _doc_type: docType,
      _doc_reference: docRef.trim(),
    });
    setSubmitting(false);
    if (error) return toastError(error, "We couldn't submit your verification.");
    toast.success("Verification submitted — our team reviews it within 24h.");
    load();
  };

  if (loading) return null;

  if (status === "approved") {
    return (
      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
        <p className="flex items-center gap-2 font-display font-bold text-primary">
          <BadgeCheck className="h-5 w-5" /> Identity verified
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You can request payouts of any size, including above {KYC_COIN_THRESHOLD.toLocaleString()} coins.
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="flex items-center gap-2 font-display font-bold text-foreground">
          <Clock className="h-5 w-5" /> Verification under review
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We're checking your details. Large payouts unlock as soon as this is approved.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <p className="flex items-center gap-2 font-display font-bold text-foreground">
        <ShieldAlert className="h-5 w-5" /> Verify your identity
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Required for payouts above {KYC_COIN_THRESHOLD.toLocaleString()} coins. Your details are stored securely and
        reviewed only by our payouts team.
      </p>
      {status === "rejected" && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Previous submission rejected. {note || "Please check your details and resubmit."}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-2 block">Full legal name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} placeholder="As printed on your ID" />
        </div>
        <div>
          <Label className="mb-2 block">Date of birth</Label>
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div>
          <Label className="mb-2 block">Country of residence</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} placeholder="e.g. India" />
        </div>
        <div>
          <Label className="mb-2 block">Document type</Label>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDocType(d.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  docType === d.id ? "bg-gradient-hero text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-2 block">Document number</Label>
          <Input value={docRef} onChange={(e) => setDocRef(e.target.value)} maxLength={60} placeholder="Document / ID number" />
        </div>
      </div>

      <Button className="mt-5 w-full" onClick={submit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit for verification"}
      </Button>
    </div>
  );
};
