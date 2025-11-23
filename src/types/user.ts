export interface UserProfile {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
    height?: number;
    weight?: number;
    gender?: string;
    birth_date?: string;
    activity_level?: string;
    goal?: string;
    daily_calories?: number;
    daily_protein?: number;
    daily_carbs?: number;
    daily_fat?: number;
    created_at?: string;
    updated_at?: string;
}

export interface UpdateUserProfileRequest {
    full_name?: string;
    avatar_url?: string;
    height?: number;
    weight?: number;
    gender?: string;
    birth_date?: string;
    activity_level?: string;
    goal?: string;
    daily_calories?: number;
    daily_protein?: number;
    daily_carbs?: number;
    daily_fat?: number;
}
