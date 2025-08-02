import { createClient} from '@supabase/supabase-js';



const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; //Supabase URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; //Supabase anon public key


const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
