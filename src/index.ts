import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

const app = new Hono()

// CORS middleware
app.use('/*', cors())

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

// Example endpoint to get data from Supabase
app.get('/api/workouts', async (c) => {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json(data)
})

// Example endpoint to create a workout
app.post('/api/workouts', async (c) => {
  const body = await c.req.json()
  const { data, error } = await supabase
    .from('workouts')
    .insert(body)
    .select()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json(data[0])
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}