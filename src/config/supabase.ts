import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Public Supabase client (anon key)
export const supabasePublic = createClient(env.supabaseUrl!, env.anonKey!)

// Create authenticated Supabase client with token
export const createSupabaseClient = (token: string) => {
  return createClient(env.supabaseUrl!, env.serviceRoleKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
}