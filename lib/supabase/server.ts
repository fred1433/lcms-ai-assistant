import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
 
// Ce client est réservé à un usage côté serveur.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey) 