
# Fitness Planner - Backend API

A lightweight, high-performance RESTful API built with Hono and Node.js, running on the Bun runtime. It handles business logic, data persistence via Supabase (PostgreSQL), and authentication verification.

## 🛠 Tech Stack

- **Framework:** [Hono](https://hono.dev/)
- **Runtime:** Bun
- **Database:** PostgreSQL (via Supabase)
- **ORM/Querying:** Supabase JS Client & Parameterized SQL
- **Validation:** Zod
- **Security:** JWT Verification, Row Level Security (RLS) policies

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed.
- A Supabase project set up.

### Installation

**Install dependencies:**
```bash
bun install
```

**Required .env variables:**
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PORT=3000
```

**Run Locally:**
```bash
bun run dev
```

The API will start at http://localhost:3000

Swagger documented endpoints at http://localhost:3000/docs

### 📡 API Architecture

The backend follows a Controller-Service pattern to separate concerns:

- **Routes (Hono):** Handle HTTP requests, parsing, and response formatting.

- **Middleware:** Handles JWT validation (Auth Guard) and error handling.

- **Services:** Contains business logic (e.g., checking ownership, calculating volume).

- **Data Layer:** Interactions with Supabase.

| Method        | Endpoint              | Description                        |
| ------------- | --------------------- | ---------------------------------- |
| **Workouts**  |                       |                                    |
| GET           | `/workouts`           | Fetch user history                 |
| POST          | `/workouts`           | Log a completed session            |
| GET           | `/workouts/templates` | Fetch workout templates            |
| **Nutrition** |                       |                                    |
| GET           | `/nutrition/:date`    | Get meals for a specific date      |
| POST          | `/nutrition`          | Log a meal                         |
| **System**    |                       |                                    |
| GET           | `/health`             | Health check for uptime monitoring |
| GET           | `/docs`               | Swagger documented endpoints       |



### 🧪 Deployment

This project is configured for deployment on Vercel.

**Install Vercel CLI:**
```bash
bun add -g vercel
vercel deploy
```

Ensure Environment Variables are set in the Vercel Dashboard.

### 🛡 Security

**JWT Validation:** Every protected route verifies the Authorization: Bearer <token> header using Supabase Auth.

**Input Validation:** All POST/PUT payloads are validated against schemas before processing.

**RLS:** Database policies ensure users can only modify their own rows.
