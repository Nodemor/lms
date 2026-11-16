import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageLoader } from './components/ui';
import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import { GuestOnly, HomeRedirect, RequireAuth } from './components/layout/Guards';

const Home = lazy(() => import('./pages/public/Home'));
const Explore = lazy(() => import('./pages/public/Explore'));
const ClassDetail = lazy(() => import('./pages/public/ClassDetail'));
const Pricing = lazy(() => import('./pages/public/Pricing'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const VerifyEmail = lazy(() => import('./pages/public/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/public/ResetPassword'));
const NotFound = lazy(() => import('./pages/public/NotFound'));

const Notifications = lazy(() => import('./pages/common/Notifications'));
const SettingsPage = lazy(() => import('./pages/common/Settings'));
const Support = lazy(() => import('./pages/common/Support'));
const LiveRoom = lazy(() => import('./pages/live/LiveRoom'));

const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherClasses = lazy(() => import('./pages/teacher/Classes'));
const TeacherClassManage = lazy(() => import('./pages/teacher/ClassManage'));
const QuizEditor = lazy(() => import('./pages/teacher/QuizEditor'));
const TeacherStudents = lazy(() => import('./pages/teacher/Students'));
const TeacherPayments = lazy(() => import('./pages/teacher/Payments'));
const Subscription = lazy(() => import('./pages/teacher/Subscription'));
const CheckinScreen = lazy(() => import('./pages/teacher/CheckinScreen'));
const CheckinPage = lazy(() => import('./pages/student/CheckinPage'));

const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentClasses = lazy(() => import('./pages/student/Classes'));
const StudentClassView = lazy(() => import('./pages/student/ClassView'));
const QuizTake = lazy(() => import('./pages/student/QuizTake'));
const StudentPayments = lazy(() => import('./pages/student/Payments'));
const StudentResults = lazy(() => import('./pages/student/Results'));

const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminUserDetail = lazy(() => import('./pages/admin/UserDetail'));
const AdminClasses = lazy(() => import('./pages/admin/Classes'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminPlans = lazy(() => import('./pages/admin/Plans'));
const AdminSupport = lazy(() => import('./pages/admin/Support'));
const AdminAudit = lazy(() => import('./pages/admin/Audit'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="classes" element={<Explore />} />
          <Route path="classes/:id" element={<ClassDetail />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route element={<GuestOnly />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
          </Route>
        </Route>

        <Route path="dashboard" element={<HomeRedirect />} />

        <Route element={<RequireAuth />}>
          <Route path="live/:sessionId" element={<LiveRoom />} />
          <Route element={<DashboardLayout />}>
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="support" element={<Support />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['TEACHER']} />}>
          <Route path="teacher/sessions/:sessionId/checkin" element={<CheckinScreen />} />
          <Route element={<DashboardLayout />}>
            <Route path="teacher" element={<TeacherDashboard />} />
            <Route path="teacher/classes" element={<TeacherClasses />} />
            <Route path="teacher/classes/:id" element={<TeacherClassManage />} />
            <Route path="teacher/classes/:id/quizzes/new" element={<QuizEditor />} />
            <Route path="teacher/classes/:id/quizzes/:quizId" element={<QuizEditor />} />
            <Route path="teacher/students" element={<TeacherStudents />} />
            <Route path="teacher/payments" element={<TeacherPayments />} />
            <Route path="teacher/subscription" element={<Subscription />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['STUDENT']} />}>
          <Route path="student/attempts/:attemptId" element={<QuizTake />} />
          <Route path="checkin/:sessionId" element={<CheckinPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/classes" element={<StudentClasses />} />
            <Route path="student/classes/:id" element={<StudentClassView />} />
            <Route path="student/payments" element={<StudentPayments />} />
            <Route path="student/results" element={<StudentResults />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['SUPER_ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="admin" element={<AdminOverview />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/users/:id" element={<AdminUserDetail />} />
            <Route path="admin/classes" element={<AdminClasses />} />
            <Route path="admin/payments" element={<AdminPayments />} />
            <Route path="admin/plans" element={<AdminPlans />} />
            <Route path="admin/support" element={<AdminSupport />} />
            <Route path="admin/audit" element={<AdminAudit />} />
            <Route path="admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
