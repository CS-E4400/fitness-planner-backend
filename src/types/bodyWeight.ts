export interface BodyWeight {
    id: string;
    user_id: string;
    weight: number;
    date: string;
    created_at?: string;
}

export interface CreateBodyWeightRequest {
    weight: number;
    date: string;
}
