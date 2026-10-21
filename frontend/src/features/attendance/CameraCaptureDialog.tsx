import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

interface CameraCaptureDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraCaptureDialog({ open, title, onClose, onCapture }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isStarting, setIsStarting] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File>();
  const [capturedPreview, setCapturedPreview] = useState<string>();
  const [cameraAttempt, setCameraAttempt] = useState(0);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setErrorMessage(undefined);
      return;
    }

    if (capturedFile) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Camera capture is not supported by this browser. You can upload an image instead.");
      return;
    }

    let isCurrent = true;
    setIsStarting(true);
    const startCamera = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          throw error;
        }

        return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    };

    startCamera()
      .then((stream) => {
        if (!isCurrent) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        const name = error instanceof DOMException ? error.name : "";
        setErrorMessage(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access or upload an image instead."
            : name === "NotFoundError"
              ? "No camera was found on this device. You can upload an image instead."
              : "The camera could not be started. You can upload an image instead."
        );
      })
      .finally(() => {
        if (isCurrent) {
          setIsStarting(false);
        }
      });

    return () => {
      isCurrent = false;
      stopCamera();
    };
  }, [open, cameraAttempt, capturedFile]);

  useEffect(() => () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
  }, [capturedPreview]);

  const clearCapturedPhoto = () => {
    setCapturedFile(undefined);
    setCapturedPreview(undefined);
    setErrorMessage(undefined);
  };

  const handleClose = () => {
    clearCapturedPhoto();
    onClose();
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage("The camera preview is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setErrorMessage("The captured image could not be prepared. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setErrorMessage("The captured image could not be saved. Please try again.");
        return;
      }

      const file = new File([blob], `classroom-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(file));
    }, "image/jpeg", 0.92);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" aria-labelledby="camera-capture-title">
      <DialogTitle id="camera-capture-title">Take {title} Photo</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
          <Box sx={{ bgcolor: "common.black", borderRadius: 1, overflow: "hidden", minHeight: 260, display: "grid", placeItems: "center" }}>
            {isStarting ? <Typography color="common.white">Starting camera...</Typography> : null}
            {capturedPreview ? <Box component="img" src={capturedPreview} alt={`Captured ${title.toLowerCase()} photo`} sx={{ width: "100%", maxHeight: "65vh", objectFit: "contain" }} /> : null}
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{ display: errorMessage || capturedPreview ? "none" : "block", width: "100%", maxHeight: "65vh", objectFit: "contain" }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        {capturedFile ? (
          <>
            <Button onClick={() => { clearCapturedPhoto(); setCameraAttempt((attempt) => attempt + 1); }}>Retake</Button>
            <Button variant="contained" startIcon={<PhotoCameraOutlinedIcon />} onClick={() => { onCapture(capturedFile); handleClose(); }}>Use Photo</Button>
          </>
        ) : <Button variant="contained" startIcon={<PhotoCameraOutlinedIcon />} disabled={Boolean(errorMessage) || isStarting} onClick={capturePhoto}>Capture Photo</Button>}
      </DialogActions>
    </Dialog>
  );
}
