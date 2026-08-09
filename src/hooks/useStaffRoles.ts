import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "admin" | "moderator" | "support" | "finance" | "reviewer" | "user";

export const STAFF_ROLES: { value: StaffRole; label: string; blurb: string }[] = [
  { value: "admin", label: "Admin", blurb: "Full access, including granting roles" },
  { value: "finance", label: "Finance", blurb: "Withdrawals, payout batches, coin adjustments, tax reports" },
  { value: "reviewer", label: "Reviewer", blurb: "Survey claims and identity verification" },
  { value: "moderator", label: "Moderator", blurb: "Content, survey claims, security events, account status" },
  { value: "support", label: "Support", blurb: "User lookup and account status" },
];

/**
 * Loads the signed-in user's roles. `can()` treats admin as a superset of every
 * staff role, mirroring the has_staff_role() check enforced in the database.
 */
export function useStaffRoles() {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (userId: string | null) => {
      if (!userId) {
        if (active) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase.rpc("my_roles");
      if (active) {
        setRoles(((data as string[] | null) ?? []) as StaffRole[]);
        setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // Defer the Supabase call out of the auth callback to avoid deadlocks.
      const uid = session?.user?.id ?? null;
      setTimeout(() => load(uid), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const can = (...allowed: StaffRole[]) => isAdmin || allowed.some((r) => roles.includes(r));
  const isStaff = isAdmin || roles.some((r) => r !== "user");

  return { roles, loading, isAdmin, isStaff, can };
}
