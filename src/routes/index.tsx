import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthLayout } from '@/components/layout/auth-layout';
import { ProtectedRoute } from '@/components/layout/protected-route';

import { LoginPage } from '@/features/auth/components/login-page';
import { RegisterPage } from '@/features/auth/components/register-page';

import { DashboardPage } from '@/features/dashboard/components/dashboard-page';
import { TodayPage } from '@/features/today/components/today-page';
import { CalendarPage } from '@/features/calendar/components/calendar-page';
import { TasksPage } from '@/features/tasks/components/tasks-page';
import { BacklogPage } from '@/features/reschedule/components/backlog-page';
import { FocusPage } from '@/features/focus/components/focus-page';
import { AnalyticsPage } from '@/features/analytics/components/analytics-page';
import { RoadmapPage } from '@/features/roadmap/components/roadmap-page';
import { HabitsPage } from '@/features/habits/components/habits-page';
import { JournalPage } from '@/features/journal/components/journal-page';
import { SettingsPage } from '@/features/settings/components/settings-page';
import { NotFoundPage } from './not-found-page';
import { AdminLoginPage } from '@/features/admin/components/admin-login-page';
import { ReviewsPage } from '@/features/reviews/components/reviews-page';
import { AdminPage } from '@/features/admin/components/admin-page';

export const router = createBrowserRouter([
  { path: '/reviews', element: <ReviewsPage /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  { element: <ProtectedRoute />, children: [{ path: '/admin', element: <AdminPage /> }] },
  // Public Auth Routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // Protected App Routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/today', element: <TodayPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/backlog', element: <BacklogPage /> },
          { path: '/focus', element: <FocusPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/roadmap', element: <RoadmapPage /> },
          { path: '/habits', element: <HabitsPage /> },
          { path: '/journal', element: <JournalPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },

  // 404 Fallback
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
