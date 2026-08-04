# VisionClass AI Service

Production-ready FastAPI foundation for future face enrollment, detection, recognition, embeddings, and attendance intelligence workflows.

Model integrations are intentionally placeholders at this stage:

- InsightFace placeholder
- RetinaFace placeholder
- OpenCV pipeline entry point
- ONNX Runtime dependency

No AI models are downloaded and no face recognition logic is implemented in this phase.

## Architecture

```text
app/
  api/
  config/
  core/
  detection/
  recognition/
  embeddings/
  services/
  schemas/
  utils/
  models/
  main.py
```

## Setup

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Windows helper:

```bash
.\scripts\setup-venv.ps1
```

Unix-style shell helper:

```bash
./scripts/setup-venv.sh
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Health

```http
GET /api/v1/health
```

```json
{
  "status": "healthy",
  "service": "VisionClass AI Service",
  "version": "1.0.0"
}
```

## Face Detection

```http
POST /api/v1/detection/detect
Content-Type: multipart/form-data
```

Send an image as `file`. The detector uses ONNX Runtime with `CPUExecutionProvider` and loads the configured model once during application startup.

Required model configuration:

```bash
RETINAFACE_ONNX_MODEL_PATH="models/retinaface.onnx"
RETINAFACE_INPUT_SIZE="640,640"
```
