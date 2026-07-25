"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ProductAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function recordPageView() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user || cancelled) return;

      await Promise.allSettled([
        supabase.from("product_events").insert({
          user_id: user.id,
          event_name: "page_view",
          page_path: pathname || "/",
          metadata: {},
        }),
        supabase.from("profiles").update({
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", user.id),
      ]);
    }

    recordPageView();
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
