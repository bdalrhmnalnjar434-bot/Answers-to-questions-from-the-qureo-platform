
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// بيانات مشروع Supabase
const SUPABASE_URL = "https://sahvdumhzceqjjxucbde.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XHvZPlq7i8NER1XuV555kw__tYTRgJh";

// UID الخاص بحساب المالك
export const OWNER_UID = "14ed95f2-62d5-4313-9861-5c0a6139409d";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
