// import { createClient} from '@supabase/supabase-js';



// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; //Supabase URL
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; //Supabase anon public key


// const supabase = createClient(supabaseUrl, supabaseKey);

// export default supabase;


// supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Reuse one instance across HMR/refreshes
const g = globalThis as unknown as { __sb?: SupabaseClient };
export const supabase = g.__sb ?? createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
g.__sb = supabase;

export default supabase;
