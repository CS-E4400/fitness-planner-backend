import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { UpdateUserProfileRequest, ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const userProfileSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        full_name: { type: 'string' },
        avatar_url: { type: 'string' },
        height: { type: 'number' },
        weight: { type: 'number' },
        gender: { type: 'string' },
        birth_date: { type: 'string', format: 'date' },
        activity_level: { type: 'string' },
        goal: { type: 'string' },
        daily_calories: { type: 'number' },
        daily_protein: { type: 'number' },
        daily_carbs: { type: 'number' },
        daily_fat: { type: 'number' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
    }
};

router.get("/me", authMiddleware, withSwagger('/api/users/me', 'GET', {
    summary: 'Get current user profile',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'User profile',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: userProfileSchema
                        }
                    }
                }
            }
        },
        401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
        500: createErrorSpec('USER_FETCH_FAILED', 'Unable to load your profile')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    let { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error && error.code === 'PGRST116') {
        // User doesn't exist, create it
        const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.name || user.user_metadata?.full_name,
                avatar_url: user.user_metadata?.avatar_url
            })
            .select()
            .single();

        if (createError) {
            console.error("❌ Error creating user profile:", createError);
            return c.json({ error: { code: 'USER_CREATE_FAILED', message: createError.message } }, 500);
        }
        data = newUser;
        error = null;
    } else if (error) {
        console.error("❌ Error fetching user profile:", error);
        const apiError: ApiError = {
            code: 'USER_FETCH_FAILED',
            message: 'Unable to load your profile',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

router.put("/me", authMiddleware, withSwagger('/api/users/me', 'PUT', {
    summary: 'Update current user profile',
    security: [{ bearerAuth: [] }],
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        full_name: { type: 'string' },
                        avatar_url: { type: 'string' },
                        height: { type: 'number' },
                        weight: { type: 'number' },
                        gender: { type: 'string' },
                        birth_date: { type: 'string', format: 'date' },
                        activity_level: { type: 'string' },
                        goal: { type: 'string' },
                        daily_calories: { type: 'number' },
                        daily_protein: { type: 'number' },
                        daily_carbs: { type: 'number' },
                        daily_fat: { type: 'number' }
                    }
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Profile updated successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: userProfileSchema
                        }
                    }
                }
            }
        },
        500: createErrorSpec('USER_UPDATE_FAILED', 'Unable to update your profile')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const body: UpdateUserProfileRequest = await c.req.json();
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
        .from("users")
        .update(body)
        .eq("id", user.id)
        .select()
        .single();

    if (error) {
        console.error("❌ Error updating user profile:", error);
        return c.json({ error: { code: 'USER_UPDATE_FAILED', message: error.message } }, 500);
    }

    return c.json({ data });
}));

router.get("/check-username", authMiddleware, withSwagger('/api/users/check-username', 'GET', {
    summary: 'Check if username is available',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'name', in: 'query', required: true, schema: { type: 'string' } }
    ],
    responses: {
        200: {
            description: 'Check result',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            available: { type: 'boolean' }
                        }
                    }
                }
            }
        },
        500: createErrorSpec('CHECK_FAILED', 'Unable to check username')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const name = c.req.query('name');
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    if (!name) {
        return c.json({ error: { code: 'MISSING_NAME', message: 'Name parameter is required' } }, 400);
    }

    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("name", name.trim())
        .neq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("❌ Error checking username:", error);
        return c.json({ error: { code: 'CHECK_FAILED', message: error.message } }, 500);
    }

    return c.json({ available: !data });
}));

export default router;
