

## Admin Dashboard with Real Data and System-Wide Analytics

### Overview
Enhance the existing admin dashboard to show real data including a recent users list, enrollment trends chart, course distribution breakdown, and assessment performance overview -- all powered by existing database tables and admin RLS policies.

### What Will Change

**1. Expand the `useAdminStats` hook** (in `src/hooks/useCourses.ts`)
- Add queries for: total enrollments count, total assessments count, recent users (last 10 profiles with their roles), course-by-subject distribution, and enrollment activity over the past 14 days.
- All queries use existing admin RLS policies (admins can already SELECT from profiles, user_roles, courses, enrollments).

**2. Add an RLS policy for admin access to assessment data**
- Database migration: Add SELECT policies on `assessments` and `assessment_attempts` for admins so the dashboard can show quiz completion stats.

**3. Redesign `src/pages/AdminDashboard.tsx`**
- **Stat cards** (top row): Total Users, Active Courses, Students, Teachers, Total Enrollments, Total Assessments -- all from real data with loading skeletons.
- **Recent Users table**: Shows last 10 registered users with name, role badge, and join date, replacing the placeholder text.
- **Enrollment Trend chart**: A 14-day bar chart (using recharts) showing daily new enrollments.
- **Course Distribution**: Breakdown of courses by subject shown as a simple list with counts.
- **Assessment Overview**: Total quizzes, average completion rate, average score across all attempts.

### Technical Details

**Database migration (SQL):**
```sql
-- Allow admins to view all assessments
CREATE POLICY "Admins can view all assessments"
  ON public.assessments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all assessment attempts
CREATE POLICY "Admins can view all attempts"
  ON public.assessment_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
```

**Files modified:**
- `src/hooks/useCourses.ts` -- expand `useAdminStats` to return recent users, enrollment trends, course distribution, and assessment stats.
- `src/pages/AdminDashboard.tsx` -- full redesign with real data sections, recharts bar chart, user table, and distribution cards.

**No new dependencies needed** -- recharts is already installed.

