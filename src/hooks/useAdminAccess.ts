import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          return;
        }

        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        if (error) {
          console.error("[useAdminAccess] RPC error:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(!!data);
      } catch (e) {
        console.error("[useAdminAccess]", e);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, []);

  return { isAdmin, isLoading };
}
