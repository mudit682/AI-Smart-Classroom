# AI Smart Classroom

Production-ready monorepo scaffold for an AI-assisted classroom platform.

This repository is intentionally initialized without business logic. It provides clean service boundaries, typed configuration, health checks, and scalable folder structures for frontend, backend, and AI service development.

## Apps

- `frontend`: React 19, Vite, TypeScript, Material UI
- `backend`: Node.js, Express, TypeScript, Mongoose, JWT-ready API
- `ai-service`: Python FastAPI service prepared for computer-vision model integration

## Requirements

- Node.js 20+
- npm 10+
- Python 3.11+

## Setup

```bash
npm install
npm run install:all
```

Create environment files:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

Create the AI service virtual environment:

```bash
cd ai-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Or use the included setup script:

```bash
.\scripts\setup-venv.ps1
```

## Development

Run all Node services:

```bash
npm run dev
```

Run the AI service separately:

```bash
cd ai-service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Health Checks

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api/v1/health`
- AI service: `http://localhost:8000/api/v1/health`

## Structure

```text
AI-Smart-Classroom
├── frontend
├── backend
├── ai-service
├── package.json
├── README.md
└── .gitignore
```
