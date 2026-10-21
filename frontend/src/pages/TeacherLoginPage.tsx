import LoginIcon from "@mui/icons-material/Login";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { clearAccessToken, getLoginErrorMessage, login } from "../features/auth/authApi";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginForm = z.infer<typeof loginSchema>;

export function TeacherLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: LoginForm) => login(email, password),
    onSuccess: (response) => {
      if (response.user.role !== "teacher") {
        clearAccessToken();
        form.setError("root", {
          message: "This page is available to teacher accounts only."
        });
        return;
      }

      window.localStorage.setItem("accessToken", response.accessToken);
      queryClient.removeQueries({ queryKey: ["auth", "current-user"] });
      navigate("/teacher/attendance", { replace: true });
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root");
    loginMutation.mutate(values);
  });

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", px: 2, bgcolor: "#f4f6fb" }}>
      <Paper component="form" elevation={0} onSubmit={onSubmit} noValidate sx={{ width: "100%", maxWidth: 440, p: { xs: 3, sm: 4 }, border: "1px solid #e4e8f0" }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Teacher Sign In
            </Typography>
            <Typography color="text.secondary">Use your existing AI Smart Classroom teacher account.</Typography>
          </Box>

          {form.formState.errors.root?.message ? <Alert severity="error">{form.formState.errors.root.message}</Alert> : null}
          {loginMutation.isError ? <Alert severity="error">{getLoginErrorMessage(loginMutation.error)}</Alert> : null}

          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            disabled={loginMutation.isPending}
            error={Boolean(form.formState.errors.email)}
            helperText={form.formState.errors.email?.message}
            {...form.register("email")}
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            disabled={loginMutation.isPending}
            error={Boolean(form.formState.errors.password)}
            helperText={form.formState.errors.password?.message}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} edge="end">
                      {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
            {...form.register("password")}
          />

          <Button type="submit" variant="contained" size="large" disabled={loginMutation.isPending} startIcon={<LoginIcon />}>
            {loginMutation.isPending ? "Signing in" : "Sign In"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
