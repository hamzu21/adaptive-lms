# KFUEITLMS (AdaptLearn LMS)

KFUEITLMS is an AI-powered adaptive learning web application built with React + TypeScript. It uses Supabase for authentication and data, and provides role-based dashboards for students, teachers, parents, and administrators.

## What’s included

- Role-based access with these sections:
  - `student` dashboard: courses, course details, assessments, assignments, progress, AI chat, and live classes.
  - `teacher` dashboard: courses, classes/enrollments, assessments, assignments, analytics, profile, and live classes.
  - `parent` dashboard: overview and profile.
  - `admin` dashboard: users, courses, enrollments, activity logs, and settings.
- Personalized/adaptive learning experience (AI-driven UI flows and adaptive features).
- Teacher analytics + activity logging.
- Live class and chat features.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui
- React Router (client-side routing)
- TanStack React Query
- Supabase (auth + database)
- Framer Motion, Recharts (UI/visualization)

## Prerequisites

- Node.js and npm
- A Supabase project

## Environment variables

Create a `.env` file (or `.env.local`) in the project root with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_anon_key
```

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in your terminal (Vite default is usually `http://localhost:8080` in this project).

## Build & test

```bash
npm run build
npm test
```
