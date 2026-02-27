

## Database Schema for Courses, Lessons, Assessments & Progress

### Overview
Create the core learning management tables to replace hardcoded data in dashboards with real, persistent data. This includes courses, lessons, assessments (quizzes), questions, student enrollments, lesson progress, and assessment attempts/responses.

---

### Database Tables

**1. `courses`** -- Created by teachers, visible to enrolled students
- `id` (uuid, PK)
- `teacher_id` (uuid, NOT NULL) -- references the teacher who created it
- `title` (text, NOT NULL)
- `description` (text, default '')
- `subject` (text, default '')
- `is_published` (boolean, default false)
- `created_at`, `updated_at` (timestamptz)

**2. `lessons`** -- Belong to a course, ordered by position
- `id` (uuid, PK)
- `course_id` (uuid, FK -> courses, NOT NULL)
- `title` (text, NOT NULL)
- `content` (text, default '') -- lesson material (markdown/text)
- `position` (integer, NOT NULL, default 0)
- `created_at`, `updated_at` (timestamptz)

**3. `enrollments`** -- Links students to courses
- `id` (uuid, PK)
- `student_id` (uuid, NOT NULL)
- `course_id` (uuid, FK -> courses, NOT NULL)
- `enrolled_at` (timestamptz, default now())
- UNIQUE(student_id, course_id)

**4. `lesson_progress`** -- Tracks which lessons a student has completed
- `id` (uuid, PK)
- `student_id` (uuid, NOT NULL)
- `lesson_id` (uuid, FK -> lessons, NOT NULL)
- `completed` (boolean, default false)
- `completed_at` (timestamptz, nullable)
- UNIQUE(student_id, lesson_id)

**5. `assessments`** -- Quizzes/tests tied to a course
- `id` (uuid, PK)
- `course_id` (uuid, FK -> courses, NOT NULL)
- `title` (text, NOT NULL)
- `description` (text, default '')
- `total_marks` (integer, default 100)
- `is_published` (boolean, default false)
- `created_at` (timestamptz)

**6. `questions`** -- MCQ questions for an assessment
- `id` (uuid, PK)
- `assessment_id` (uuid, FK -> assessments, NOT NULL)
- `question_text` (text, NOT NULL)
- `options` (jsonb, NOT NULL) -- array of option strings
- `correct_option` (integer, NOT NULL) -- index of correct answer
- `marks` (integer, default 1)
- `position` (integer, default 0)

**7. `assessment_attempts`** -- Student attempt at an assessment
- `id` (uuid, PK)
- `student_id` (uuid, NOT NULL)
- `assessment_id` (uuid, FK -> assessments, NOT NULL)
- `score` (integer, nullable)
- `total_marks` (integer, nullable)
- `started_at` (timestamptz, default now())
- `completed_at` (timestamptz, nullable)

**8. `attempt_responses`** -- Individual answers per attempt
- `id` (uuid, PK)
- `attempt_id` (uuid, FK -> assessment_attempts, NOT NULL)
- `question_id` (uuid, FK -> questions, NOT NULL)
- `selected_option` (integer, nullable)
- `is_correct` (boolean, default false)

---

### Row-Level Security Policies

| Table | Policy |
|---|---|
| **courses** | Teachers can CRUD their own courses; students can SELECT published courses they're enrolled in; admins can SELECT all |
| **lessons** | Teachers can CRUD lessons of their own courses; enrolled students can SELECT |
| **enrollments** | Teachers can INSERT/SELECT for their courses; students can SELECT own enrollments; admins can SELECT all |
| **lesson_progress** | Students can INSERT/UPDATE/SELECT their own progress |
| **assessments** | Teachers can CRUD for their courses; enrolled students can SELECT published assessments |
| **questions** | Teachers can CRUD for their assessments; students can SELECT when assessment is published |
| **assessment_attempts** | Students can INSERT/SELECT own attempts |
| **attempt_responses** | Students can INSERT/SELECT own responses |

---

### Code Changes

**1. React Query hooks** (`src/hooks/useCourses.ts`, `src/hooks/useAssessments.ts`)
- Fetch enrolled courses + lesson progress for student dashboard
- Fetch teacher's courses + enrolled students for teacher dashboard
- Compute stats (courses enrolled, avg score, completed lessons) from real data

**2. Update `StudentDashboard.tsx`**
- Replace hardcoded courses/stats with React Query calls to `enrollments` + `courses` + `lesson_progress`
- Compute progress % dynamically (completed lessons / total lessons)

**3. Update `TeacherDashboard.tsx`**
- Replace hardcoded student list with real enrolled students + their assessment scores
- Compute at-risk students (score < 50%) from `assessment_attempts`

**4. Update `ParentDashboard.tsx`**
- Fetch child's enrollments and scores (will need a parent-child link table in the future, for now show placeholder)

**5. Update `AdminDashboard.tsx`**
- Query real counts for users, courses, students from database

---

### Technical Details

- Single SQL migration creates all 8 tables with RLS enabled, policies, and `update_updated_at` triggers on courses/lessons
- Foreign keys use `ON DELETE CASCADE` for cleanup
- No FK to `auth.users` -- `teacher_id` and `student_id` are plain uuid columns checked via RLS `auth.uid()`
- The `has_role()` security definer function is reused in policies to check teacher/admin roles without recursion

