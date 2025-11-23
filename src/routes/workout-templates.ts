import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { CreateWorkoutTemplateRequest, ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const templateExerciseSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        template_id: { type: 'string' },
        exercise_id: { type: 'string' },
        sets: { type: 'integer' },
        reps: { type: 'integer' },
        weight: { type: 'number' },
        rest_seconds: { type: 'integer' },
        notes: { type: 'string' },
        order_index: { type: 'integer' },
        exercise: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                muscle_group: { type: 'string' }
            }
        }
    }
};

const workoutTemplateSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        template_exercises: {
            type: 'array',
            items: templateExerciseSchema
        }
    }
};

router.get("/", authMiddleware, withSwagger('/api/workout-templates', 'GET', {
    summary: 'Get user workout templates',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'List of workout templates',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: workoutTemplateSchema
                            }
                        }
                    }
                }
            }
        },
        401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
        500: createErrorSpec('TEMPLATES_FETCH_FAILED', 'Unable to load your templates')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];
    const isPublic = c.req.query('public') === 'true';

    const supabase = createSupabaseClient(token);

    let query = supabase
        .from("workout_templates")
        .select(`
      *,
      template_exercises (
        *,
        exercise:exercises (
          name,
          muscle_group
        )
      )
    `);

    if (isPublic) {
        query = query.eq('is_public', true);
    } else {
        query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("❌ Error fetching templates:", error);
        const apiError: ApiError = {
            code: 'TEMPLATES_FETCH_FAILED',
            message: 'Unable to load your templates',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

router.post("/", authMiddleware, withSwagger('/api/workout-templates', 'POST', {
    summary: 'Create a new workout template',
    security: [{ bearerAuth: [] }],
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['name', 'exercises'],
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        exercises: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['exercise_id', 'sets', 'reps', 'weight'],
                                properties: {
                                    exercise_id: { type: 'string' },
                                    sets: { type: 'integer' },
                                    reps: { type: 'integer' },
                                    weight: { type: 'number' },
                                    rest_seconds: { type: 'integer' },
                                    notes: { type: 'string' },
                                    order_index: { type: 'integer' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Template created successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: workoutTemplateSchema
                        }
                    }
                }
            }
        },
        500: createErrorSpec('TEMPLATE_CREATE_FAILED', 'Unable to save your template')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const body: CreateWorkoutTemplateRequest = await c.req.json();
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    // 1. Create Template
    const { data: templateData, error: templateError } = await supabase
        .from("workout_templates")
        .insert({
            user_id: user.id,
            name: body.name,
            description: body.description
        })
        .select()
        .single();

    if (templateError) {
        console.error("❌ Error creating template:", templateError);
        return c.json({ error: { code: 'TEMPLATE_CREATE_FAILED', message: templateError.message } }, 500);
    }

    // 2. Add Exercises
    if (body.exercises && body.exercises.length > 0) {
        const templateExercises = body.exercises.map(ex => ({
            template_id: templateData.id,
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            order_index: ex.order_index
        }));

        const { error: exercisesError } = await supabase
            .from("template_exercises")
            .insert(templateExercises);

        if (exercisesError) {
            console.error("❌ Error adding exercises to template:", exercisesError);
            return c.json({ error: { code: 'TEMPLATE_EXERCISES_FAILED', message: exercisesError.message } }, 500);
        }
    }

    // 3. Fetch complete template data
    const { data: completeTemplate, error: fetchError } = await supabase
        .from("workout_templates")
        .select(`
      *,
      template_exercises (
        *,
        exercise:exercises (
          name,
          muscle_group
        )
      )
    `)
        .eq('id', templateData.id)
        .single();

    if (fetchError) {
        return c.json({ data: templateData });
    }

    return c.json({ data: completeTemplate });
}));

router.delete("/:id", authMiddleware, withSwagger('/api/workout-templates/{id}', 'DELETE', {
    summary: 'Delete a workout template',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
    ],
    responses: {
        200: { description: 'Template deleted successfully' },
        500: createErrorSpec('TEMPLATE_DELETE_FAILED', 'Unable to delete template')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const id = c.req.param('id');
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    const { error } = await supabase
        .from("workout_templates")
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error("❌ Error deleting template:", error);
        return c.json({ error: { code: 'TEMPLATE_DELETE_FAILED', message: error.message } }, 500);
    }

    return c.json({ success: true });
}));

export default router;
