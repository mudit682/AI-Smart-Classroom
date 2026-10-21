import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { TeacherAttendancePage } from "../pages/TeacherAttendancePage";
import { TeacherLoginPage } from "../pages/TeacherLoginPage";
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
            path: "teacher/attendance",
            element: <TeacherAttendancePage />
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
