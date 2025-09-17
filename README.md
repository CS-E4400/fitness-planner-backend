# Fitness Planner Backend

A starter backend project using Railway, Supabase, and Bun.js.

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Fill in your Supabase credentials in `.env`.

4. Run locally:
   ```bash
   bun run dev
   ```

## Deployment

Deploy to Railway:

1. Connect your GitHub repo to Railway.
2. Set environment variables in Railway dashboard.
3. Deploy!

## API Endpoints

- `GET /` - Health check
- `GET /api/workouts` - Get all workouts
- `POST /api/workouts` - Create a new workout