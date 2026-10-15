import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import {
  Alert,
  Box,
  Button,
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
import {
  getApiErrorMessage,
  getAvailableAttendanceSessions,
  processAttendanceCapture,
  type AttendanceCaptureFiles,
  type ClassroomView
} from "../features/attendance/attendanceApi";

const views: Array<{ value: ClassroomView; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
];

const requiredImage = z.instanceof(File, { message: "An image is required." });
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
  const file = form.watch(view);
  const error = form.formState.errors[view]?.message;

  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <Box sx={{ aspectRatio: "4 / 3", bgcolor: "grey.100", position: "relative" }}>
        {preview ? (
          <Box component="img" src={preview} alt={`${label} classroom preview`} sx={{ width: 1, height: 1, objectFit: "cover" }} />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: 1, color: "text.secondary" }}>
            <AddPhotoAlternateOutlinedIcon fontSize="large" />
            <Typography variant="body2">{label} view</Typography>
          </Stack>
        )}
      </Box>
      <Stack spacing={1.25} sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {file?.name ?? "No image selected"}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button component="label" variant="outlined" size="small" startIcon={<AddPhotoAlternateOutlinedIcon />} fullWidth>
            {file ? "Replace" : "Choose image"}
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              onChange={(event) => onSelect(view, event.target.files?.[0])}
            />
          </Button>
          {file ? (
            <Button aria-label={`Remove ${label} image`} color="inherit" onClick={() => onRemove(view)} sx={{ minWidth: 40, px: 1 }}>
              <DeleteOutlineIcon fontSize="small" />
            </Button>
          ) : null}
        </Stack>
        {error ? <FormHelperText error>{error}</FormHelperText> : null}
      </Stack>
    </Paper>
  );
}

export function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const previewUrlsRef = useRef<PreviewUrls>({});
  const [previews, setPreviews] = useState<PreviewUrls>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const form = useForm<AttendanceCaptureForm>({
    resolver: zodResolver(attendanceCaptureSchema),
    mode: "onChange",
    defaultValues: {
      attendanceSessionId: ""
    }
  });
  const sessionsQuery = useQuery({
    queryKey: ["attendance-sessions", "available"],
    queryFn: getAvailableAttendanceSessions
  });
  const processMutation = useMutation({
    mutationFn: ({ attendanceSessionId, files }: { attendanceSessionId: string; files: AttendanceCaptureFiles }) =>
      processAttendanceCapture(attendanceSessionId, files),
    onSuccess: async () => {
      setIsSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    }
  });

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const setImage = (view: ClassroomView, file?: File) => {
    const previousPreview = previewUrlsRef.current[view];

    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
    }

    if (!file) {
      delete previewUrlsRef.current[view];
      setPreviews({ ...previewUrlsRef.current });
      form.setValue(view, undefined as never, { shouldValidate: true });
      return;
    }

    const preview = URL.createObjectURL(file);
    previewUrlsRef.current[view] = preview;
    setPreviews({ ...previewUrlsRef.current });
    form.setValue(view, file, { shouldValidate: true });
    setIsSubmitted(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    setIsSubmitted(false);
    processMutation.mutate({
      attendanceSessionId: values.attendanceSessionId,
      files: {
        left: values.left,
        center: values.center,
        right: values.right
      }
    });
  });

  const canSubmit = form.formState.isValid && !processMutation.isPending && !sessionsQuery.isLoading;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Attendance Capture
        </Typography>
        <Typography color="text.secondary">Select the active session and provide the classroom’s three views.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit} noValidate>
          <Controller
            name="attendanceSessionId"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth error={Boolean(fieldState.error)} disabled={sessionsQuery.isLoading || processMutation.isPending}>
                <InputLabel id="attendance-session-label">Active attendance session</InputLabel>
                <Select {...field} labelId="attendance-session-label" label="Active attendance session">
                  {sessionsQuery.data?.map((session) => (
                    <MenuItem key={session.id} value={session.id}>
                      {session.subject.subjectCode} - {session.classroom.name} / {session.classroom.section} ({session.lectureSchedule.startTime}-{session.lectureSchedule.endTime})
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
              </FormControl>
            )}
          />

          {sessionsQuery.isLoading ? <CircularProgress size={24} /> : null}
          {sessionsQuery.isError ? <Alert severity="error">{getApiErrorMessage(sessionsQuery.error)}</Alert> : null}
          {sessionsQuery.data?.length === 0 ? <Alert severity="info">No active attendance session is available.</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: 2
            }}
          >
            {views.map(({ value, label }) => (
              <CaptureImageField
                key={value}
                view={value}
                label={label}
                form={form}
                preview={previews[value]}
                onSelect={setImage}
                onRemove={setImage}
              />
            ))}
          </Box>

          {processMutation.isError ? <Alert severity="error">{getApiErrorMessage(processMutation.error)}</Alert> : null}
          {isSubmitted ? <Alert severity="success">Attendance capture was submitted for processing.</Alert> : null}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!canSubmit}
            startIcon={processMutation.isPending ? <CircularProgress color="inherit" size={18} /> : <PlayCircleOutlineIcon />}
            sx={{ alignSelf: "flex-start" }}
          >
            {processMutation.isPending ? "Processing attendance" : "Process Attendance"}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
