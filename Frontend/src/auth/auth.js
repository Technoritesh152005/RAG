import {createClient} from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if(!supabaseUrl || supabaseAnonKey){
    throw new Error('Supabase credentials is not been Provided.')
}

export const supabaseClient = createClient(supabaseUrl,supabaseAnonKey,{
    auth:{
        //if refresh keep the connection alive
        persistSession:true,
        //ifa access token expires generate new. dont re login
        autoRefreshToken:true,
        detectSessionInUrl:true
    }
})