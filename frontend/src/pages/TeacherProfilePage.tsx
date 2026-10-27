import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { useOutletContext } from "react-router-dom";
import type { CurrentUserResponse } from "../features/auth/authApi";

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

export function TeacherProfilePage() {
  const teacher = useOutletContext<CurrentUserResponse["user"]>();

  return (
    <Stack spacing={{ xs: 3, md: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
          Teacher Profile
        </Typography>
        <Typography color="text.secondary">Your AI Smart Classroom account details.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ maxWidth: 760, overflow: "hidden", borderColor: "#dce2f4" }}>
        <Box sx={{ bgcolor: "#eef0ff", px: { xs: 2.5, sm: 3.5 }, py: { xs: 3, sm: 4 }, borderBottom: "1px solid #d9defe" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Box sx={{ width: 56, height: 56, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 1, bgcolor: "#5364e8", color: "#fff" }}>
              <AccountCircleOutlinedIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h5" component="h2" fontWeight={800}>{teacher.name}</Typography>
              <Typography color="text.secondary">Teacher account</Typography>
            </Box>
          </Stack>
        </Box>

        <Stack spacing={0} divider={<Box sx={{ borderTop: "1px solid #edf0f5" }} />} sx={{ px: { xs: 2.5, sm: 3.5 }, py: 1 }}>
          <ProfileField label="Email" value={teacher.email} />
          <ProfileField label="Role" value={<Chip label={teacher.role} color="primary" size="small" sx={{ textTransform: "capitalize" }} />} />
          <ProfileField
            label="Verification"
            value={<Chip icon={<VerifiedOutlinedIcon />} label={teacher.isVerified ? "Verified" : "Not verified"} color={teacher.isVerified ? "success" : "default"} size="small" />}
          />
          <ProfileField label="Account created" value={formatTimestamp(teacher.createdAt)} />
          <ProfileField label="Last updated" value={formatTimestamp(teacher.updatedAt)} />
        </Stack>
      </Paper>
    </Stack>
  );
}

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ py: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {typeof value === "string" ? <Typography fontWeight={700}>{value}</Typography> : value}
    </Stack>
  );
}
