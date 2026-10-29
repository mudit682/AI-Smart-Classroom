import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { Alert, Box, Chip, CircularProgress, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getApiErrorMessage, getTeacherAttendanceHistory, type AttendanceSession } from "../features/attendance/attendanceApi";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(date));
}

function SessionStatus({ status }: { status: AttendanceSession["status"] }) {
  const color = status === "COMPLETED" ? "success" : status === "CANCELLED" ? "default" : "primary";

  return <Chip label={status} color={color} size="small" />;
}

export function TeacherAttendanceHistoryPage() {
  const [search, setSearch] = useState("");
  const historyQuery = useQuery({ queryKey: ["attendance-sessions", "history"], queryFn: getTeacherAttendanceHistory });
  const sessions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return historyQuery.data ?? [];

    return (historyQuery.data ?? []).filter((session) =>
      [session.subject.name, session.subject.subjectCode, session.classroom.name, session.classroom.section, session.sessionDate]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [historyQuery.data, search]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>Attendance History</Typography>
        <Typography color="text.secondary">Attendance sessions for your teacher profile.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderColor: "#e1e6ef" }}>
        <Stack spacing={2.5}>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label="Search sessions"
            placeholder="Subject, classroom, section, or date"
            fullWidth
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon color="action" /></InputAdornment> } }}
          />

          {historyQuery.isLoading ? (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 4 }}><CircularProgress size={22} /><Typography color="text.secondary">Loading attendance history...</Typography></Stack>
          ) : null}
          {historyQuery.isError ? <Alert severity="error">{getApiErrorMessage(historyQuery.error)}</Alert> : null}
          {!historyQuery.isLoading && !historyQuery.isError && historyQuery.data?.length === 0 ? <Alert severity="info">No attendance sessions are available yet.</Alert> : null}
          {!historyQuery.isLoading && !historyQuery.isError && historyQuery.data && historyQuery.data.length > 0 && sessions.length === 0 ? <Alert severity="info">No sessions match your search.</Alert> : null}

          <Stack spacing={1.5}>
            {sessions.map((session) => <AttendanceHistoryItem key={session.id} session={session} />)}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

function AttendanceHistoryItem({ session }: { session: AttendanceSession }) {
  return (
    <Box sx={{ border: "1px solid #e4e8f0", borderRadius: 1, p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box>
            <Typography fontWeight={800}>{session.subject.subjectCode} - {session.subject.name}</Typography>
            <Typography variant="body2" color="text.secondary">{session.classroom.name} / Section {session.classroom.section}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <HistoryOutlinedIcon color="primary" fontSize="small" />
            <Typography variant="body2" color="text.secondary">{formatDate(session.sessionDate)}</Typography>
            <SessionStatus status={session.status} />
          </Stack>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 150px))" }, gap: 1.25 }}>
          <AttendanceCount label="Students" value={session.totalStudents} />
          <AttendanceCount label="Present" value={session.recognizedStudents} color="#12805c" />
          <AttendanceCount label="Absent" value={session.absentStudents} color="#a04b20" />
        </Box>
      </Stack>
    </Box>
  );
}

function AttendanceCount({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box sx={{ borderLeft: `3px solid ${color ?? "#5364e8"}`, pl: 1.25 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800}>{value}</Typography>
    </Box>
  );
}
