import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await sb.from("lexicon_entries").select("id,lemma,pos")
  .in("lemma", ["travel","trip","journey","house","home","price","cost","fee","charge"])
  .eq("pos","noun");
console.log(JSON.stringify(data, null, 2));
