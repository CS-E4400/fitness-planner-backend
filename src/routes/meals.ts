import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { CreateMealRequest, ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const mealFoodSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        meal_id: { type: 'string' },
        food_id: { type: 'string' },
        amount: { type: 'number' },
        food: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
                serving_size: { type: 'number' },
                serving_unit: { type: 'string' }
            }
        }
    }
};

const mealSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        meal_type: { type: 'string' },
        date: { type: 'string', format: 'date' },
        is_final: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        meal_foods: {
            type: 'array',
            items: mealFoodSchema
        }
    }
};

router.get("/", authMiddleware, withSwagger('/api/meals', 'GET', {
    summary: 'Get user meals',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, required: false },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, required: false },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, required: false }
    ],
    responses: {
        200: {
            description: 'List of user meals',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: mealSchema
                            }
                        }
                    }
                }
            }
        },
        401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
        500: createErrorSpec('MEALS_FETCH_FAILED', 'Unable to load your meals')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];
    const date = c.req.query('date');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const supabase = createSupabaseClient(token);

    let query = supabase
        .from("meals")
        .select(`
      *,
      meal_foods (
        *,
        food:foods (*)
      )
    `)
        .eq("user_id", user.id)
        .order('created_at', { ascending: false });

    if (date) {
        query = query.eq('date', date);
    } else if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
        console.error("❌ Error fetching meals:", error);
        const apiError: ApiError = {
            code: 'MEALS_FETCH_FAILED',
            message: 'Unable to load your meals',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

router.post("/", authMiddleware, withSwagger('/api/meals', 'POST', {
    summary: 'Create a new meal',
    security: [{ bearerAuth: [] }],
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['meal_type', 'date', 'foods'],
                    properties: {
                        meal_type: { type: 'string' },
                        date: { type: 'string', format: 'date' },
                        is_final: { type: 'boolean' },
                        foods: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['food_id', 'amount'],
                                properties: {
                                    food_id: { type: 'string' },
                                    amount: { type: 'number' }
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
            description: 'Meal created successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: mealSchema
                        }
                    }
                }
            }
        },
        500: createErrorSpec('MEAL_CREATE_FAILED', 'Unable to save your meal')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const body: CreateMealRequest = await c.req.json();
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    // 1. Create Meal
    const { data: mealData, error: mealError } = await supabase
        .from("meals")
        .insert({
            user_id: user.id,
            meal_type: body.meal_type,
            date: body.date,
            is_final: body.is_final
        })
        .select()
        .single();

    if (mealError) {
        console.error("❌ Error creating meal:", mealError);
        return c.json({ error: { code: 'MEAL_CREATE_FAILED', message: mealError.message } }, 500);
    }

    // 2. Add Foods
    if (body.foods && body.foods.length > 0) {
        const mealFoods = body.foods.map(f => ({
            meal_id: mealData.id,
            food_id: f.food_id,
            amount: f.amount
        }));

        const { error: foodsError } = await supabase
            .from("meal_foods")
            .insert(mealFoods);

        if (foodsError) {
            console.error("❌ Error adding foods to meal:", foodsError);
            // Ideally we should rollback here, but Supabase HTTP API doesn't support transactions easily across requests
            // For now we return error but meal is created
            return c.json({ error: { code: 'MEAL_FOODS_FAILED', message: foodsError.message } }, 500);
        }
    }

    // 3. Fetch complete meal data to return
    const { data: completeMeal, error: fetchError } = await supabase
        .from("meals")
        .select(`
      *,
      meal_foods (
        *,
        food:foods (*)
      )
    `)
        .eq('id', mealData.id)
        .single();

    if (fetchError) {
        return c.json({ data: mealData }); // Return basic data if fetch fails
    }

    return c.json({ data: completeMeal });
}));

router.delete("/", authMiddleware, withSwagger('/api/meals', 'DELETE', {
    summary: 'Delete meals',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, required: false },
        { name: 'id', in: 'query', schema: { type: 'string' }, required: false }
    ],
    responses: {
        200: { description: 'Meals deleted successfully' },
        500: createErrorSpec('MEAL_DELETE_FAILED', 'Unable to delete meals')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];
    const date = c.req.query('date');
    const id = c.req.query('id');

    if (!date && !id) {
        return c.json({ error: { code: 'INVALID_REQUEST', message: 'Must provide date or id' } }, 400);
    }

    const supabase = createSupabaseClient(token);

    let query = supabase.from("meals").delete().eq("user_id", user.id);

    if (id) {
        query = query.eq('id', id);
    } else if (date) {
        query = query.eq('date', date).eq('is_final', true);
    }

    const { error } = await query;

    if (error) {
        console.error("❌ Error deleting meals:", error);
        return c.json({ error: { code: 'MEAL_DELETE_FAILED', message: error.message } }, 500);
    }

    return c.json({ success: true });
}));

export default router;
