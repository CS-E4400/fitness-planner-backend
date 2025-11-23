export interface Food {
    id: string;
    name: string;
    brand?: string;
    serving_size: number;
    serving_unit: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    category?: string;
    measurement_type?: 'weight' | 'unit';
    created_at?: string;
}
