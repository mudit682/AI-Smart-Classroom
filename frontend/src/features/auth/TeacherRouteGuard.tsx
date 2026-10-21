import { isAxiosError } from "axios";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "./authApi";

export function TeacherRouteGuard() {
  const accessToken = window.localStorage.getItem("accessToken");
  const currentUserQuery = useQuery({
    queryKey: ["auth", "current-user"],
    queryFn: getCurrentUser,
    enabled: Boolean(accessToken),
    retry: false,
    refetchOnMount: "always"
  });

  if (!accessToken) {
    return <Navigate to="/teacher/login" replace />;
  }

  if (currentUserQuery.isLoading || currentUserQuery.isFetching) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: "60vh" }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Checking your teacher access</Typography>
      </Stack>
    );
  }

  if (currentUserQuery.isError) {
    const status = isAxiosError(currentUserQuery.error) ? currentUserQuery.error.response?.status : undefined;

    if (status === 401) {
      return (
        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: "60vh" }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Your session has expired. Redirecting to sign in...</Typography>
        </Stack>
      );
    }

    if (status === 403) {
      return (
        <Alert severity="error" sx={{ maxWidth: 640, mx: "auto", mt: 6 }}>
          Your account is signed in but does not have access to the teacher portal.
        </Alert>
      );
    }

    return (
      <Stack spacing={2} sx={{ maxWidth: 640, mx: "auto", mt: 6 }}>
        <Alert severity="error">We could not verify teacher access. Check the backend connection and try again.</Alert>
        <Button variant="outlined" onClick={() => void currentUserQuery.refetch()} sx={{ alignSelf: "flex-start" }}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (currentUserQuery.data?.user.role !== "teacher") {
    return (
      <Alert severity="error" sx={{ maxWidth: 640, mx: "auto", mt: 6 }}>
        Your account is signed in but does not have access to the teacher portal.
      </Alert>
    );
  }

  return <Outlet />;
}
