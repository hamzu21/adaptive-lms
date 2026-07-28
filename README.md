# AdaptLearn LMS

AdaptLearn LMS is an AI-assisted learning management system designed for modern education environments. It combines a polished React + TypeScript frontend with Supabase-backed authentication, role-based dashboards, and adaptive learning workflows for students, teachers, parents, and administrators.

## Overview

This project was built as a full-stack education platform prototype with a focus on:

- Personalized learning experiences for students
- Role-based access for multiple user types
- Teacher and admin visibility into course performance
- Adaptive assessments and learning support features
- A modern, responsive UI for web-based classrooms

## Key Features

- Student dashboard with courses, lessons, assessments, assignments, progress tracking, AI chat, and live classes
- Teacher dashboard for course management, enrollments, assessments, assignments, analytics, and profile tools
- Parent dashboard for viewing child progress and supporting learning
- Admin dashboard for user, course, enrollment, and activity oversight
- AI-inspired adaptive experience with learning-path and insight components
- Notifications, feedback, and notes for richer classroom interaction
- Supabase integration for authentication, storage, and database-backed data access

## Tech Stack

- Frontend: React, TypeScript, Vite
- Styling: Tailwind CSS, shadcn/ui
- Routing: React Router
- State & Data: TanStack React Query
- Backend & Auth: Supabase
- Visualization: Recharts, Framer Motion

## Project Structure

- src/pages: application pages for each role and feature area
- src/components: reusable UI and feature components
- src/contexts: authentication and shared app context
- src/hooks: custom hooks for data access and UI behavior
- supabase/functions: serverless Supabase functions
- supabase/migrations: primary Supabase SQL migrations for the application schema and policies
- supabase/backups: archived SQL reference files kept for backup and historical context

## Prerequisites

Before you begin, make sure you have:

- Node.js 18+ and npm
- A Supabase project
- A browser for local development

> Important: this project depends on Supabase for authentication, database access, and storage. The frontend will not work correctly until Supabase is configured and the database migrations are applied.

## Supabase Setup First

Complete these steps before running the app:

1. Create a new Supabase project at https://supabase.com.
2. In your Supabase dashboard, go to Project Settings > API and copy your Project URL and anon publishable key.
3. Create a local .env file in the project root by copying .env.example.
4. Fill in the real values in .env:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
GROQ_API_KEY=your-groq-api-key
```

5. Open the Supabase SQL editor and run the migration files from the supabase/migrations folder in order.
6. If you are using storage features, make sure the related buckets and policies are created as part of those migrations.

## Environment Variables

Create a .env file in the project root with the following variables:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_anon_key
```

You can find these values in your Supabase project dashboard under Project Settings > API.

## Installation

```bash
git clone <your-fork-url>
cd adaptive-lms
npm install
```

## Running Locally

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal, usually http://localhost:8080.

## Database Setup

The main database setup for this project lives in the Supabase migrations folder. These files are the recommended source for applying the app schema and security policies.

```bash
supabase/migrations/001_migration.sql
supabase/migrations/002_migration.sql
supabase/migrations/003_migration.sql
```

For reference or historical context, the older SQL files have been archived in the Supabase backups folder. They are not required for a fresh setup unless you specifically want to inspect or reuse older scripts.

## Build and Test

```bash
npm run build
npm test
```

## Contributing

Contributions are welcome. Feel free to open issues, suggest improvements, or submit pull requests.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
