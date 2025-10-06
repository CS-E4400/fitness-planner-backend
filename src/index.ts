import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse, Workout, CreateWorkoutRequest, AuthResponse, LogoutResponse } from './types'
import { authMiddleware } from './middleware/auth'

const app = new Hono()

// CORS middleware
app.use('/*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}))

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Basic health check
app.get('/', (c) => {
  return c.json({ message: 'Fitness Planner Backend is running!' })
})

// Auth endpoints
app.get('/auth/google', async (c): Promise<Response> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${frontendUrl}/auth/callback`
      }
    })

    if (error) {
      return c.json({ error: error.message }, 400)
    }

    return c.redirect(data.url)
  } catch (error) {
    return c.json({ error: 'Failed to initiate Google OAuth' }, 500)
  }
})

app.post('/auth/logout', authMiddleware, async (c): Promise<LogoutResponse> => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return c.json({ success: false, error: error.message }, 400)
    }

    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to logout' }, 500)
  }
})

// Get current user session
app.get('/auth/session', authMiddleware, async (c): Promise<AuthResponse> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return c.json({ user: null, session: null, error: error.message })
    }

    return c.json({ user, session: null }) // Session details are handled by frontend
  } catch (error) {
    return c.json({ user: null, session: null, error: 'Failed to get session' })
  }
})

// Protected endpoint to get user workouts
app.get('/api/workouts', authMiddleware, async (c): Promise<ApiResponse<Workout[]>> => {
  const user = c.get('user')

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

// Protected endpoint to create a workout
app.post('/api/workouts', authMiddleware, async (c): Promise<ApiResponse<Workout>> => {
  const user = c.get('user')
  const body: CreateWorkoutRequest = await c.req.json()

  const workoutData = {
    ...body,
    user_id: user.id
  }

  const { data, error } = await supabase
    .from('workouts')
    .insert(workoutData)
    .select()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data: data[0] })
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}