import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useOutletContext } from "react-router-dom";
import type { CurrentUserResponse } from "../features/auth/authApi";

export function TeacherDashboardPage() {
  const teacher = useOutletContext<CurrentUserResponse["user"]>();

  return (
    <Stack spacing={{ xs: 3, md: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
          Teacher Dashboard
        </Typography>
        <Typography color="text.secondary">Your attendance workspace for AI Smart Classroom.</Typography>
      </Box>

      <Box sx={{ bgcolor: "#eef0ff", border: "1px solid #d9defe", borderRadius: 1, px: { xs: 2.5, sm: 3.5 }, py: { xs: 3, sm: 4 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ width: 48, height: 48, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: "#5364e8", color: "#fff" }}>
              <SchoolOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h5" component="h2" fontWeight={800} gutterBottom>
                Welcome back, {teacher.name}
              </Typography>
              <Typography color="text.secondary">
                Signed in as {teacher.role}.
              </Typography>
            </Box>
          </Stack>
          <Button component={RouterLink} to="/teacher/attendance" variant="contained" size="large" endIcon={<ArrowForwardOutlinedIcon />}>
            Take Attendance
          </Button>
        </Stack>
      </Box>

      <Box sx={{ borderTop: "1px solid #e1e6ef", pt: 3 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
          <CalendarMonthOutlinedIcon color="primary" />
          <Typography variant="h6" component="h2" fontWeight={800}>Attendance</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
          Start from an active attendance session, capture the required left, center, and right classroom views, then submit them for processing.
        </Typography>
      </Box>
    </Stack>
  );
}
