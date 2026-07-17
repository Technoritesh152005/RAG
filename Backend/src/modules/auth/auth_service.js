import {createClient} from '@supabase/supabase-js'

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
)

export async function verifyToken (token){
  const  {data : {user} , error} = await supabaseClient.auth.getUser(token)

  if(error || !user){
    throw new Error('Invalid or Expired Token')
  }
  return user
}