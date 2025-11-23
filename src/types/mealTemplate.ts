export interface MealTemplate {
    id: string;
    user_id: string;
    name: string;
    created_at?: string;
    template_foods?: TemplateFood[];
}

export interface TemplateFood {
    id: string;
    template_id: string;
    food_id: string;
    amount: number;
    food?: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        serving_unit: string;
    };
}

export interface CreateMealTemplateRequest {
    name: string;
    foods: {
        food_id: string;
        amount: number;
    }[];
}
