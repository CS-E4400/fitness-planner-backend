import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { CreateWorkoutRequest, UpdateWorkoutRequest, ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

// Schema definitions for Swagger
const exerciseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    sets: { type: 'integer' },
    reps: { type: 'integer' },
    weight_kg: { type: 'number' },
    rest_seconds: { type: 'integer' },
    notes: { type: 'string' }
  }
};

const workoutSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    user_id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    exercises: {
      type: 'array',
      items: exerciseSchema
    },
    duration_minutes: { type: 'integer' },
    difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  }
};

router.get("/", authMiddleware, withSwagger('/api/workouts', 'GET', {
  summary: 'Get user workouts',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, required: false },
    { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, required: false }
  ],
  responses: {
    200: {
      description: 'List of user workouts',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    program_id: { type: 'string' },
                    user_id: { type: 'string' },
                    date: { type: 'string', format: 'date' },
                    duration_min: { type: 'integer' },
                    created_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
    500: createErrorSpec('WORKOUTS_FETCH_FAILED', 'Unable to load your workouts right now. Please try again later')
  }
})(async (c): Promise<Response> => {
  const user = (c as any).get("user");
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.split(" ")[1];
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const supabase = createSupabaseClient(token);

  let query = supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user.id)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching workouts:", error);
    const apiError: ApiError = {
      code: 'WORKOUTS_FETCH_FAILED',
      message: 'Unable to load your workouts right now. Please try again later',
      details: error.message
    };
    return c.json({ error: apiError }, 500);
  }

  return c.json({ data });
}));

router.post("/", authMiddleware, withSwagger('/api/workouts', 'POST', {
  summary: 'Create a new workout',
  security: [{ bearerAuth: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'sets', 'reps'],
                properties: {
                  name: { type: 'string' },
                  sets: { type: 'integer' },
                  reps: { type: 'integer' },
                  weight_kg: { type: 'number' },
                  rest_seconds: { type: 'integer' },
                  notes: { type: 'string' }
                }
              }
            },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Workout created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: workoutSchema
            }
          }
        }
      }
    },
    401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
    500: createErrorSpec('WORKOUT_CREATE_FAILED', 'Unable to save your workout. Please check your data and try again')
  }
})(async (c): Promise<Response> => {
  const user = (c as any).get("user");
  const body: CreateWorkoutRequest = await c.req.json();
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.split(" ")[1];

  const supabase = createSupabaseClient(token);

  const { exercises, ...workoutData } = body;

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      is_final: true
    })
    .select()
    .single();

  if (workoutError) {
    console.error("❌ Supabase insert error:", workoutError);
    const apiError: ApiError = {
      code: 'WORKOUT_CREATE_FAILED',
      message: 'Unable to save your workout. Please check your data and try again',
      details: workoutError.message
    };
    return c.json({ error: apiError }, 500);
  }

  // Insert exercises if present
  if (exercises && exercises.length > 0) {
    const setsToInsert: any[] = [];

    for (const ex of exercises) {
      // The frontend now sends sets_data
      // We need to cast ex to any because the type definition might not match yet
      const exercise = ex as any;

      if (exercise.sets_data && Array.isArray(exercise.sets_data)) {
        for (const set of exercise.sets_data) {
          setsToInsert.push({
            workout_id: workout.id,
            exercise_id: exercise.exercise_id,
            weight: set.weight,
            reps: set.reps,
            rpe: null
          });
        }
      }
    }

    if (setsToInsert.length > 0) {
      const { error: setsError } = await supabase
        .from("workout_sets")
        .insert(setsToInsert);

      if (setsError) {
        console.error("❌ Supabase insert sets error:", setsError);
      }
    }
  }

  return c.json({ data: workout });
}));

router.put("/:id", authMiddleware, withSwagger('/api/workouts/{id}', 'PUT', {
  summary: 'Update a workout',
  security: [{ bearerAuth: [] }],
  parameters: [{
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string' }
  }],
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            exercises: { type: 'array', items: exerciseSchema },
            duration_minutes: { type: 'integer' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Workout updated successfully',
      content: { 'application/json': { schema: { type: 'object', properties: { data: workoutSchema } } } }
    },
    500: createErrorSpec('WORKOUT_UPDATE_FAILED', 'Unable to update workout')
  }
})(async (c): Promise<Response> => {
  const id = c.req.param('id');
  const user = (c as any).get("user");
  const body: UpdateWorkoutRequest = await c.req.json();
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.split(" ")[1];

  const supabase = createSupabaseClient(token);

  // Remove id from body if present to avoid updating primary key
  const { id: _, ...updateData } = body;

  const { data, error } = await supabase
    .from("workouts")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id) // Security: ensure user owns the workout
    .select()
    .single();

  if (error) {
    console.error("❌ Supabase update error:", error);
    const apiError: ApiError = {
      code: 'WORKOUT_UPDATE_FAILED',
      message: 'Unable to update workout',
      details: error.message
    };
    return c.json({ error: apiError }, 500);
  }

  return c.json({ data });
}));

router.delete("/:id", authMiddleware, withSwagger('/api/workouts/{id}', 'DELETE', {
  summary: 'Delete a workout',
  security: [{ bearerAuth: [] }],
  parameters: [{
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string' }
  }],
  responses: {
    200: {
      description: 'Workout deleted successfully',
      content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } }
    },
    500: createErrorSpec('WORKOUT_DELETE_FAILED', 'Unable to delete workout')
  }
})(async (c): Promise<Response> => {
  const id = c.req.param('id');
  const user = (c as any).get("user");
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.split(" ")[1];

  const supabase = createSupabaseClient(token);

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // Security: ensure user owns the workout

  if (error) {
    console.error("❌ Supabase delete error:", error);
    const apiError: ApiError = {
      code: 'WORKOUT_DELETE_FAILED',
      message: 'Unable to delete workout',
      details: error.message
    };
    return c.json({ error: apiError }, 500);
  }

  return c.json({ success: true });
}));

export default router;
