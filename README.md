# Campus Course Hub

Course Management Information System for Organizational Transformation, implemented as a professor-ready local campus app.

## What Is Included

- FastAPI backend with `/api/v1/*` endpoints for courses, enrollments, AI tutor chat, grading, analytics, and certificates.
- Next.js dashboard with clear Student, Teacher, and College Staff workspaces.
- Seeded campus records for courses, enrollments, grades, analytics, approval paths, alumni skill feedback, certificates, and audit logs.
- Groq API integration for the AI tutor and grading assistant.
- Safe local AI guidance when `GROQ_API_KEY` is not configured, so local presentation flows continue to work.

## Local Setup

Run from the repository root in WSL/Ubuntu:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
npm install --prefix frontend
```

Optional Groq configuration:

```bash
cp backend/.env.example backend/.env
# edit backend/.env and set GROQ_API_KEY=...
```

## Run Locally

Terminal 1:

```bash
source .venv/bin/activate
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2:

```bash
npm run dev --prefix frontend
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The API runs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

Or start both together:

```bash
./scripts/dev.sh
```

Stop background local servers:

```bash
./scripts/stop-local.sh
```

## Walkthrough

1. Start on College Staff to show campus KPIs, department usage, slow workflows, and the approval path.
2. Switch to Student to browse courses, enroll locally, verify certificates, and ask the AI tutor.
3. Switch to Teacher to review submitted work, request Groq grading suggestions, save grades, and inspect graduate skill feedback.
