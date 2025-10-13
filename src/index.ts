import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse, Workout, CreateWorkoutRequest, AuthResponse } from './types'
import { authMiddleware } from './middleware/auth'

const app = new Hono()

// 🧱 CORS setup
app.use('/*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}))

// 🔑 Environment variables check
const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// 🌐 Public Supabase client (anon key)
const supabasePublic = createClient(supabaseUrl, anonKey)

// 🩺 Health check
app.get('/', (c) => c.json({ message: '✅ Fitness Planner Backend is running!' }))

// 🔐 OAuth login (Google)
app.get('/auth/google', async (c): Promise<Response> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  try {
    const { data, error } = await supabasePublic.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${frontendUrl}/auth/callback` }
    })

    if (error) return c.json({ error: error.message }, 400)
    return c.redirect(data.url)
  } catch (error) {
    return c.json({ error: 'Failed to initiate Google OAuth' }, 500)
  }
})

// 🔒 Get current session (example protected route)
app.get('/auth/session', authMiddleware, async (c): Promise<AuthResponse> => {
  try {
    const user = c.get('user')
    return c.json({ user, session: null })
  } catch {
    return c.json({ user: null, session: null, error: 'Failed to get session' })
  }
})

// 📦 Get workouts (protected)
app.get('/api/workouts', authMiddleware, async (c): Promise<ApiResponse<Workout[]>> => {
  const user = c.get('user')
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.split(' ')[1]

  if (!token) return c.json({ error: 'Missing token' }, 401)

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('❌ Error fetching workouts:', error)
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

// 🏋️ Create a workout (protected)
app.post('/api/workouts', authMiddleware, async (c): Promise<ApiResponse<Workout>> => {
  const user = c.get('user')
  const body: CreateWorkoutRequest = await c.req.json()
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.split(' ')[1]

  if (!token) return c.json({ error: 'Missing token' }, 401)

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const workoutData = {
    ...body,
    user_id: user.id
  }

  const { data, error } = await supabase
    .from('workouts')
    .insert(workoutData)
    .select()

  if (error) {
    console.error('❌ Supabase insert error:', error)
    console.log('🧩 Sent data:', workoutData)
    return c.json({ error: error.message }, 500)
  }

  console.log('✅ Workout created for user:', user.email)
  return c.json({ data: data[0] })
})

// 🚀 Export for Bun
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
