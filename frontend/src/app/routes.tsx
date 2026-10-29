import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { TeacherAttendancePage } from "../pages/TeacherAttendancePage";
import { TeacherAttendanceHistoryPage } from "../pages/TeacherAttendanceHistoryPage";
import { TeacherDashboardPage } from "../pages/TeacherDashboardPage";
import { TeacherLoginPage } from "../pages/TeacherLoginPage";
import { TeacherProfilePage } from "../pages/TeacherProfilePage";
import { TeacherRouteGuard } from "../features/auth/TeacherRouteGuard";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        element: <TeacherRouteGuard />,
        children: [
          {
            path: "teacher/dashboard",
            element: <TeacherDashboardPage />
          },
          {
            path: "teacher/attendance",
            element: <TeacherAttendancePage />
          },
          {
            path: "teacher/history",
            element: <TeacherAttendanceHistoryPage />
          },
          {
            path: "teacher/profile",
            element: <TeacherProfilePage />
          }
        ]
      },
      {
        path: "teacher/login",
        element: <TeacherLoginPage />
      },
      {
        path: "*",
        element: <NotFoundPage />
      }
    ]
  }
]);
