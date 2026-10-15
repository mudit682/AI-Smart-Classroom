import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { env } from "../config/env";

export function AppLayout() {
  return (
    <Box minHeight="100vh">
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div">
            {env.VITE_APP_NAME}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button component={RouterLink} to="/teacher/attendance" color="inherit">
            Attendance
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
