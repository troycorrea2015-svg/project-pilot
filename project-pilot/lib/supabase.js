import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qytzrlupvkqdulffnpez.supabase.co";
const supabasePublishableKey = "sb_publishable_zi6CB203ohT4Qx8GazWqBw_fjsJS51f";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
