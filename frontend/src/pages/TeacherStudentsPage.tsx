import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getApiErrorMessage,
  getTeacherFaceEnrollments,
  getTeacherStudents,
  type FaceEnrollment,
  type Student
} from "../features/students/studentsApi";

const enrollmentStatusLabels: Record<FaceEnrollment["enrollmentStatus"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  FAILED: "Failed"
};

function EnrollmentStatus({ enrollment }: { enrollment?: FaceEnrollment }) {
  if (!enrollment) {
    return <Typography variant="body2" color="text.secondary">No enrollment record</Typography>;
  }

  const color = enrollment.enrollmentStatus === "COMPLETED" ? "success" : enrollment.enrollmentStatus === "FAILED" ? "error" : enrollment.enrollmentStatus === "IN_PROGRESS" ? "primary" : "default";

  return <Chip label={enrollmentStatusLabels[enrollment.enrollmentStatus]} color={color} size="small" />;
}

export function TeacherStudentsPage() {
  const [search, setSearch] = useState("");
  const studentsQuery = useQuery({ queryKey: ["teacher", "students"], queryFn: getTeacherStudents });
  const enrollmentsQuery = useQuery({ queryKey: ["teacher", "face-enrollments"], queryFn: getTeacherFaceEnrollments });
  const isLoading = studentsQuery.isLoading || enrollmentsQuery.isLoading;
  const isError = studentsQuery.isError || enrollmentsQuery.isError;
  const error = studentsQuery.error ?? enrollmentsQuery.error;
  const enrollmentsByStudentId = useMemo(
    () => new Map((enrollmentsQuery.data ?? []).map((enrollment) => [enrollment.student.id, enrollment])),
    [enrollmentsQuery.data]
  );
  const students = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const availableStudents = studentsQuery.data ?? [];

    if (!normalizedSearch) {
      return availableStudents;
    }

    return availableStudents.filter((student) =>
      [student.name, student.enrollmentNumber, student.department, student.semester, student.section]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [search, studentsQuery.data]);

  const retry = () => {
    void studentsQuery.refetch();
    void enrollmentsQuery.refetch();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>Students</Typography>
        <Typography color="text.secondary">Students assigned to your active classrooms.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderColor: "#e1e6ef" }}>
        <Stack spacing={2.5}>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label="Search students"
            placeholder="Name, enrollment number, department, semester, or section"
            fullWidth
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon color="action" /></InputAdornment> } }}
          />

          {isLoading ? (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <CircularProgress size={22} />
              <Typography color="text.secondary">Loading students...</Typography>
            </Stack>
          ) : null}

          {isError ? (
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={retry}>Retry</Button>}>
              {getApiErrorMessage(error)}
            </Alert>
          ) : null}

          {!isLoading && !isError && studentsQuery.data?.length === 0 ? (
            <Alert severity="info">No students are assigned to your active classrooms.</Alert>
          ) : null}

          {!isLoading && !isError && studentsQuery.data && studentsQuery.data.length > 0 && students.length === 0 ? (
            <Alert severity="info">No students match your search.</Alert>
          ) : null}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            {students.map((student) => (
              <StudentCard key={student.id} student={student} enrollment={enrollmentsByStudentId.get(student.id)} />
            ))}
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

function StudentCard({ student, enrollment }: { student: Student; enrollment?: FaceEnrollment }) {
  return (
    <Box sx={{ border: "1px solid #e4e8f0", borderRadius: 1, p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 40, height: 40, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: "#eef0ff", color: "#5364e8" }}>
            <GroupsOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800} noWrap>{student.name || "Student"}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>{student.enrollmentNumber || "Enrollment number unavailable"}</Typography>
          </Box>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
          <Detail label="Department" value={student.department} />
          <Detail label="Semester" value={student.semester ? `Semester ${student.semester}` : undefined} />
          <Detail label="Section" value={student.section ? `Section ${student.section}` : undefined} />
          <Detail label="Images" value={enrollment ? String(enrollment.imageCount) : undefined} />
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Typography variant="body2" color="text.secondary">Face enrollment</Typography>
          <EnrollmentStatus enrollment={enrollment} />
        </Stack>
      </Stack>
    </Box>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} noWrap>{value || "Unavailable"}</Typography>
    </Box>
  );
}
