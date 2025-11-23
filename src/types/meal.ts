export interface Meal {
    id: string;
    user_id: string;
    meal_type: string;
    date: string;
    is_final: boolean;
    created_at?: string;
    meal_foods?: MealFood[];
}

export interface MealFood {
    id: string;
    meal_id: string;
    food_id: string;
    amount: number;
    food?: {
        id: string;
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        serving_size: number;
        serving_unit: string;
    };
}

export interface CreateMealRequest {
    meal_type: string;
    date: string;
    is_final: boolean;
    foods: {
        food_id: string;
        amount: number;
    }[];
}
