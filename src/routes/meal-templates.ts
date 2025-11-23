import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const templateFoodSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        template_meal_id: { type: 'string' },
        food_id: { type: 'string' },
        amount: { type: 'number' },
        food: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
                serving_unit: { type: 'string' }
            }
        }
    }
};

const templateMealSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        template_id: { type: 'string' },
        meal_type: { type: 'string' },
        template_meal_foods: {
            type: 'array',
            items: templateFoodSchema
        }
    }
};

const mealTemplateSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        is_public: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        template_meals: {
            type: 'array',
            items: templateMealSchema
        }
    }
};

router.get("/", authMiddleware, withSwagger('/api/meal-templates', 'GET', {
    summary: 'Get user meal templates',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'public', in: 'query', required: false, schema: { type: 'boolean' } }
    ],
    responses: {
        200: {
            description: 'List of meal templates',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: mealTemplateSchema
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
        .from("meal_templates")
        .select(`
      *,
      template_meals (
        id,
        meal_type,
        template_meal_foods (
          id,
          food_id,
          amount,
          food:foods (
            id,
            name,
            calories,
            protein,
            carbs,
            fat,
            serving_unit,
            category,
            measurement_type,
            serving_size
          )
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
        console.error("❌ Error fetching meal templates:", error);
        const apiError: ApiError = {
            code: 'TEMPLATES_FETCH_FAILED',
            message: 'Unable to load your templates',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

router.post("/", authMiddleware, withSwagger('/api/meal-templates', 'POST', {
    summary: 'Create a new meal template',
    security: [{ bearerAuth: [] }],
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['name', 'meals'],
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        is_public: { type: 'boolean' },
                        meals: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['meal_type', 'foods'],
                                properties: {
                                    meal_type: { type: 'string' },
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
                            data: mealTemplateSchema
                        }
                    }
                }
            }
        },
        500: createErrorSpec('TEMPLATE_CREATE_FAILED', 'Unable to save your template')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const body: any = await c.req.json();
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    // 1. Create Template
    const { data: templateData, error: templateError } = await supabase
        .from("meal_templates")
        .insert({
            user_id: user.id,
            name: body.name,
            description: body.description,
            is_public: body.is_public || false
        })
        .select()
        .single();

    if (templateError) {
        console.error("❌ Error creating meal template:", templateError);
        return c.json({ error: { code: 'TEMPLATE_CREATE_FAILED', message: templateError.message } }, 500);
    }

    // 2. Add Meals and Foods
    if (body.meals && body.meals.length > 0) {
        for (const meal of body.meals) {
            // Create Template Meal
            const { data: mealData, error: mealError } = await supabase
                .from("template_meals")
                .insert({
                    template_id: templateData.id,
                    meal_type: meal.meal_type
                })
                .select()
                .single();

            if (mealError) {
                console.error("❌ Error creating template meal:", mealError);
                // Continue with other meals or fail? failing seems safer for consistency
                return c.json({ error: { code: 'TEMPLATE_MEAL_FAILED', message: mealError.message } }, 500);
            }

            if (meal.foods && meal.foods.length > 0) {
                const templateFoods = meal.foods.map((f: any) => ({
                    template_meal_id: mealData.id,
                    food_id: f.food_id,
                    amount: f.amount
                }));

                const { error: foodsError } = await supabase
                    .from("template_meal_foods")
                    .insert(templateFoods);

                if (foodsError) {
                    console.error("❌ Error adding foods to template meal:", foodsError);
                    return c.json({ error: { code: 'TEMPLATE_FOODS_FAILED', message: foodsError.message } }, 500);
                }
            }
        }
    }

    // 3. Fetch complete template data
    const { data: completeTemplate, error: fetchError } = await supabase
        .from("meal_templates")
        .select(`
      *,
      template_meals (
        id,
        meal_type,
        template_meal_foods (
          id,
          food_id,
          amount,
          food:foods (
            id,
            name,
            calories,
            protein,
            carbs,
            fat,
            serving_unit,
            category,
            measurement_type,
            serving_size
          )
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

router.delete("/:id", authMiddleware, withSwagger('/api/meal-templates/{id}', 'DELETE', {
    summary: 'Delete a meal template',
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
        .from("meal_templates")
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error("❌ Error deleting meal template:", error);
        return c.json({ error: { code: 'TEMPLATE_DELETE_FAILED', message: error.message } }, 500);
    }

    return c.json({ success: true });
}));

export default router;
