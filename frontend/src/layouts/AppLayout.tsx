import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { Box, Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAccessToken } from "../features/auth/authApi";
import { env } from "../config/env";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isTeacherAuthenticated = Boolean(window.localStorage.getItem("accessToken"));
  const isLoginPage = location.pathname === "/teacher/login";

  const signOut = () => {
    clearAccessToken();
    queryClient.removeQueries({ queryKey: ["auth", "current-user"] });
    navigate("/teacher/login", { replace: true });
  };

  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6fb", display: "flex" }}>
      <Box component="aside" sx={{ width: { xs: 72, md: 244 }, flexShrink: 0, bgcolor: "#111b38", color: "#eef2ff", display: "flex", flexDirection: "column", px: { xs: 1, md: 1.5 }, py: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: { xs: 0.5, md: 1 }, minHeight: 44 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: "#6777f6", display: "grid", placeItems: "center", fontWeight: 800 }}>AI</Box>
          <Typography fontWeight={800} sx={{ display: { xs: "none", md: "block" } }}>{env.VITE_APP_NAME}</Typography>
        </Stack>
        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.12)" }} />
        <List disablePadding sx={{ flexGrow: 1 }}>
          {isTeacherAuthenticated ? (
            <ListItemButton component={RouterLink} to="/teacher/attendance" selected={location.pathname === "/teacher/attendance"} sx={{ borderRadius: 1, mb: 0.5, "&.Mui-selected": { bgcolor: "rgba(111, 124, 255, 0.28)" } }}>
              <ListItemIcon sx={{ color: "inherit", minWidth: { xs: 40, md: 42 } }}><CalendarMonthOutlinedIcon /></ListItemIcon>
              <ListItemText primary="Attendance" sx={{ display: { xs: "none", md: "block" } }} />
            </ListItemButton>
          ) : (
            <ListItemButton component={RouterLink} to="/teacher/login" sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ color: "inherit", minWidth: { xs: 40, md: 42 } }}><SchoolOutlinedIcon /></ListItemIcon>
              <ListItemText primary="Teacher sign in" sx={{ display: { xs: "none", md: "block" } }} />
            </ListItemButton>
          )}
        </List>
        {isTeacherAuthenticated ? (
          <Button color="inherit" startIcon={<LogoutOutlinedIcon />} onClick={signOut} sx={{ justifyContent: { xs: "center", md: "flex-start" }, textTransform: "none" }}>
            <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>Sign out</Box>
          </Button>
        ) : null}
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 2.5, md: 4 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
