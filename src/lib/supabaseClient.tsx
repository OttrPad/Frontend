import { createClient} from '@supabase/supabase-js';



const supabaseUrl = 'https://agmtvkietedgnlrzzidr.supabase.co'; // Your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbXR2a2lldGVkZ25scnp6aWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjU4MzAsImV4cCI6MjA2OTQ0MTgzMH0.wBUE3M4fbZyWJDdQGkmwgT9KJkn0z1bHgiW58sC6O4U'; // Your Supabase anon public key


const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
