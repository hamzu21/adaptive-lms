import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import StudentCourses from "./pages/StudentCourses";
import StudentCourseDetail from "./pages/StudentCourseDetail";
import StudentAssessments from "./pages/StudentAssessments";
import StudentAssignmentsPage from "./pages/StudentAssignments";
import StudentAIChat from "./pages/StudentAIChat";
import StudentLiveClasses from "./pages/StudentLiveClasses";
import StudentProgress from "./pages/StudentProgress";
import StudentProfile from "./pages/StudentProfile";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherCourses from "./pages/TeacherCourses";
import TeacherEnrollments from "./pages/TeacherEnrollments";
import TeacherAssessments from "./pages/TeacherAssessments";
import TeacherAssignmentsPage from "./pages/TeacherAssignments";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import TeacherProfile from "./pages/TeacherProfile";
import TeacherLiveClasses from "./pages/TeacherLiveClasses";
import ParentDashboard from "./pages/ParentDashboard";
import ParentProfile from "./pages/ParentProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminCourses from "./pages/AdminCourses";
import AdminEnrollments from "./pages/AdminEnrollments";
import AdminSettings from "./pages/AdminSettings";
import AdminActivityLogs from "./pages/AdminActivityLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/courses" element={<ProtectedRoute allowedRoles={["student"]}><StudentCourses /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId" element={<ProtectedRoute allowedRoles={["student"]}><StudentCourseDetail /></ProtectedRoute>} />
            <Route path="/student/assessments" element={<ProtectedRoute allowedRoles={["student"]}><StudentAssessments /></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={["student"]}><StudentAssignmentsPage /></ProtectedRoute>} />
            <Route path="/student/progress" element={<ProtectedRoute allowedRoles={["student"]}><StudentProgress /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />
            <Route path="/student/ai-chat" element={<ProtectedRoute allowedRoles={["student"]}><StudentAIChat /></ProtectedRoute>} />
            <Route path="/student/live" element={<ProtectedRoute allowedRoles={["student"]}><StudentLiveClasses /></ProtectedRoute>} />
            <Route path="/student/*" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherCourses /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherEnrollments /></ProtectedRoute>} />
            <Route path="/teacher/assessments" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAssessments /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAssignmentsPage /></ProtectedRoute>} />
            <Route path="/teacher/analytics" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAnalytics /></ProtectedRoute>} />
            <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherProfile /></ProtectedRoute>} />
            <Route path="/teacher/live" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherLiveClasses /></ProtectedRoute>} />
            <Route path="/teacher/*" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/parent/profile" element={<ProtectedRoute allowedRoles={["parent"]}><ParentProfile /></ProtectedRoute>} />
            <Route path="/parent/*" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCourses /></ProtectedRoute>} />
            <Route path="/admin/enrollments" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEnrollments /></ProtectedRoute>} />
            <Route path="/admin/activity-logs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminActivityLogs /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
