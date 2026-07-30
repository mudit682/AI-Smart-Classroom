# AI Service

FastAPI service scaffold for future face detection, recognition, and attendance intelligence features.

Model integrations are intentionally placeholders at this stage:

- InsightFace placeholder
- RetinaFace placeholder
- OpenCV pipeline entry point
- ONNX Runtime dependency

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
