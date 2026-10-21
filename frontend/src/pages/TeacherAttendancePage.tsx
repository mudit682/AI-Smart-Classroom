import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CameraCaptureDialog } from "../features/attendance/CameraCaptureDialog";
import {
  getApiErrorMessage,
  getAttendanceSession,
  getAvailableAttendanceSessions,
  processAttendanceCapture,
  type AttendanceCaptureFiles,
  type AttendanceCaptureResponse,
  type AttendanceSession,
  type ClassroomView
} from "../features/attendance/attendanceApi";

const views: Array<{ value: ClassroomView; label: string }> = [
  { value: "left", label: "Left View" },
  { value: "center", label: "Center View" },
  { value: "right", label: "Right View" }
];
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp"]);
const requiredImage = z.instanceof(File, { message: "A confirmed image is required." });
const attendanceCaptureSchema = z.object({
  attendanceSessionId: z.string().min(1, "Select an active attendance session."),
  left: requiredImage,
  center: requiredImage,
  right: requiredImage
});

type AttendanceCaptureForm = z.infer<typeof attendanceCaptureSchema>;
type PreviewUrls = Partial<Record<ClassroomView, string>>;

function CaptureImageField({
  view,
  label,
  form,
  preview,
  onSelect,
  onRemove
}: {
  view: ClassroomView;
  label: string;
  form: UseFormReturn<AttendanceCaptureForm>;
  preview?: string;
  onSelect: (view: ClassroomView, file?: File) => void;
  onRemove: (view: ClassroomView) => void;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const file = form.watch(view);
  const formError = form.formState.errors[view]?.message;

  const handleUpload = (selectedFile?: File) => {
    if (!selectedFile) return;
    if (!supportedImageTypes.has(selectedFile.type)) {
      setFileError("Choose a JPG, PNG, WEBP, or BMP image.");
      return;
    }

    setFileError(undefined);
    onSelect(view, selectedFile);
  };

  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden", borderColor: file ? "primary.light" : "#e1e6ef", boxShadow: file ? "0 4px 14px rgba(61, 81, 167, 0.08)" : "none" }}>
      <Box sx={{ aspectRatio: "4 / 3", bgcolor: "#f3f5f9", position: "relative" }}>
        {preview ? <Box component="img" src={preview} alt={`${label} classroom preview`} sx={{ width: 1, height: 1, objectFit: "cover" }} /> : (
          <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: 1, color: "text.secondary" }}>
            <CameraAltOutlinedIcon fontSize="large" />
            <Typography variant="body2">No {label.toLowerCase()} captured</Typography>
          </Stack>
        )}
        {file ? <Chip icon={<CheckCircleOutlineIcon />} label="Ready" color="success" size="small" sx={{ position: "absolute", top: 12, right: 12, bgcolor: "rgba(255,255,255,0.94)" }} /> : null}
      </Box>
      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>{label}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{file?.name ?? "Capture or upload a classroom photo"}</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" size="small" startIcon={<CameraAltOutlinedIcon />} onClick={() => setCameraOpen(true)} fullWidth>Take Photo</Button>
          <Button component="label" variant="outlined" size="small" startIcon={<AddPhotoAlternateOutlinedIcon />} fullWidth>
            Upload Image
            <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/bmp" onChange={(event) => { handleUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </Button>
        </Stack>
        {file ? <Button color="inherit" size="small" startIcon={<DeleteOutlineIcon />} onClick={() => onRemove(view)} sx={{ alignSelf: "flex-start" }}>Remove photo</Button> : null}
        {fileError || formError ? <FormHelperText error>{fileError ?? formError}</FormHelperText> : null}
      </Stack>
      <CameraCaptureDialog open={cameraOpen} title={label} onClose={() => setCameraOpen(false)} onCapture={(capturedFile) => { setFileError(undefined); onSelect(view, capturedFile); }} />
    </Paper>
  );
}

function AttendanceResults({ result, session }: { result: AttendanceCaptureResponse; session?: AttendanceSession }) {
  const hasPersistedCounts = Boolean(session);
  const presentCount = session?.recognizedStudents;
  const absentCount = session?.absentStudents;
  const hasCaptureNotes = result.capture.noFaceDetectedViews.length > 0 || result.capture.rejectedViews.length > 0;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderColor: "#cfe0d6" }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Attendance processing result</Typography>
          <Typography variant="body2" color="text.secondary">
            {hasPersistedCounts
              ? "Present and absent totals are synchronized from the completed attendance session."
              : "The attendance session totals could not be reloaded. This request's marking outcome is shown below."}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
          <Box sx={{ border: "1px solid #dce8df", borderRadius: 1, p: 2 }}><Typography variant="body2" color="text.secondary">Present</Typography><Typography variant="h4" fontWeight={800}>{presentCount ?? "Unavailable"}</Typography></Box>
          <Box sx={{ border: "1px solid #e5e8ef", borderRadius: 1, p: 2 }}><Typography variant="body2" color="text.secondary">Absent</Typography><Typography variant="h4" fontWeight={800}>{absentCount ?? "Unavailable"}</Typography></Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
          <Box sx={{ borderLeft: "3px solid #3f51b5", pl: 1.5 }}><Typography variant="body2" color="text.secondary">Marked now</Typography><Typography variant="h6" fontWeight={800}>{result.attendance.markedCount}</Typography></Box>
          <Box sx={{ borderLeft: "3px solid #78909c", pl: 1.5 }}><Typography variant="body2" color="text.secondary">Already marked</Typography><Typography variant="h6" fontWeight={800}>{result.attendance.alreadyMarkedCount}</Typography></Box>
          <Box sx={{ borderLeft: "3px solid #ef6c00", pl: 1.5 }}><Typography variant="body2" color="text.secondary">Not enrolled</Typography><Typography variant="h6" fontWeight={800}>{result.attendance.notEnrolledCount}</Typography></Box>
        </Box>
        {hasCaptureNotes ? <Alert severity="warning">{result.capture.noFaceDetectedViews.length > 0 ? `No face detected in: ${result.capture.noFaceDetectedViews.join(", ")}. ` : ""}{result.capture.rejectedViews.length > 0 ? `Rejected capture: ${result.capture.rejectedViews.join(", ")}.` : ""}</Alert> : null}
        <Alert severity="info">The current backend response does not expose absent-student names, so no absent roster is shown.</Alert>
      </Stack>
    </Paper>
  );
}

export function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const previewUrlsRef = useRef<PreviewUrls>({});
  const [previews, setPreviews] = useState<PreviewUrls>({});
  const [result, setResult] = useState<AttendanceCaptureResponse>();
  const [completedSession, setCompletedSession] = useState<AttendanceSession>();
  const [processingAttempted, setProcessingAttempted] = useState(false);
  const form = useForm<AttendanceCaptureForm>({ resolver: zodResolver(attendanceCaptureSchema), mode: "onChange", defaultValues: { attendanceSessionId: "" } });
  const sessionsQuery = useQuery({ queryKey: ["attendance-sessions", "available"], queryFn: getAvailableAttendanceSessions });
  const processMutation = useMutation({
    mutationFn: ({ attendanceSessionId, files }: { attendanceSessionId: string; files: AttendanceCaptureFiles }) => processAttendanceCapture(attendanceSessionId, files),
    onSuccess: async (response) => {
      setResult(response);
      try { setCompletedSession(await getAttendanceSession(response.attendanceSessionId)); } catch { setCompletedSession(undefined); }
      await queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    }
  });

  useEffect(() => () => { Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url)); }, []);

  const setImage = (view: ClassroomView, file?: File) => {
    const previousPreview = previewUrlsRef.current[view];
    if (previousPreview) URL.revokeObjectURL(previousPreview);
    if (!file) {
      delete previewUrlsRef.current[view];
      setPreviews({ ...previewUrlsRef.current });
      form.resetField(view);
      setResult(undefined);
      return;
    }

    previewUrlsRef.current[view] = URL.createObjectURL(file);
    setPreviews({ ...previewUrlsRef.current });
    form.setValue(view, file, { shouldValidate: true });
    setResult(undefined);
  };

  const onSubmit = form.handleSubmit((values) => {
    setResult(undefined);
    setCompletedSession(undefined);
    setProcessingAttempted(true);
    processMutation.mutate({ attendanceSessionId: values.attendanceSessionId, files: { left: values.left, center: values.center, right: values.right } });
  });
  const selectedPhotoCount = views.filter(({ value }) => Boolean(form.watch(value))).length;
  const canSubmit = form.formState.isValid && !processMutation.isPending && Boolean(sessionsQuery.data?.length);

  return (
    <Stack spacing={3}>
      <Box><Typography variant="h4" component="h1" fontWeight={800} gutterBottom>Take Attendance</Typography><Typography color="text.secondary">Choose an active session, then capture a left, center, and right classroom view.</Typography></Box>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderColor: "#e1e6ef" }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit} noValidate>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}><Typography variant="h6" fontWeight={800}>Attendance session</Typography><Chip label={`${selectedPhotoCount}/3 photos ready`} color={selectedPhotoCount === 3 ? "success" : "default"} variant={selectedPhotoCount === 3 ? "filled" : "outlined"} /></Box>
          <Controller name="attendanceSessionId" control={form.control} render={({ field, fieldState }) => (
            <FormControl fullWidth error={Boolean(fieldState.error)} disabled={sessionsQuery.isLoading || processMutation.isPending || !sessionsQuery.data?.length}>
              <InputLabel id="attendance-session-label">Active attendance session</InputLabel>
              <Select
                {...field}
                labelId="attendance-session-label"
                label="Active attendance session"
                onChange={(event) => {
                  field.onChange(event);
                  setResult(undefined);
                  setCompletedSession(undefined);
                  setProcessingAttempted(false);
                }}
              >
                {sessionsQuery.data?.map((session) => <MenuItem key={session.id} value={session.id}>{session.subject.subjectCode} - {session.classroom.name} / {session.classroom.section} ({session.lectureSchedule.startTime}-{session.lectureSchedule.endTime})</MenuItem>)}
              </Select>
              {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
            </FormControl>
          )} />
          {sessionsQuery.isLoading ? <Stack direction="row" spacing={1.5} alignItems="center"><CircularProgress size={20} /><Typography color="text.secondary">Loading active sessions...</Typography></Stack> : null}
          {sessionsQuery.isError ? <Alert severity="error">{getApiErrorMessage(sessionsQuery.error)}</Alert> : null}
          {sessionsQuery.data?.length === 0 ? <Alert severity="info">No active attendance session is available.</Alert> : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>{views.map(({ value, label }) => <CaptureImageField key={value} view={value} label={label} form={form} preview={previews[value]} onSelect={setImage} onRemove={(removedView) => setImage(removedView)} />)}</Box>
          {processMutation.isPending ? <Alert severity="info" icon={<CircularProgress size={20} />}>Processing the three classroom views and synchronizing attendance. Please keep this page open.</Alert> : null}
          {processMutation.isError ? <Alert severity="error">{getApiErrorMessage(processMutation.error)} Review the selected session and photos, then try again.</Alert> : null}
          <Button type="submit" variant="contained" size="large" disabled={!canSubmit} startIcon={processMutation.isPending ? <CircularProgress color="inherit" size={18} /> : <PlayCircleOutlineIcon />} sx={{ alignSelf: "flex-start", px: 3 }}>{processMutation.isPending ? "Processing attendance" : "Process Attendance"}</Button>
        </Stack>
      </Paper>
      {!result && !processMutation.isPending && !processMutation.isError && !processingAttempted ? <Alert severity="info">Select an active session and provide all three classroom views to process attendance.</Alert> : null}
      {result ? <AttendanceResults result={result} session={completedSession} /> : null}
    </Stack>
  );
}
