import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { TeacherAttendancePage } from "../pages/TeacherAttendancePage";

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
        path: "teacher/attendance",
        element: <TeacherAttendancePage />
      },
      {
        path: "*",
        element: <NotFoundPage />
      }
    ]
  }
]);
