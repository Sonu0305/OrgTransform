from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.app.data import mock_data as db
from backend.app.schemas import (
    CertificateIssueRequest,
    ChatMessage,
    EnrollmentRequest,
    GradePatch,
    GradingSuggestionRequest,
    SubmissionRequest,
)
from backend.app.services.groq_client import groq_client


settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def find_course(course_id: str) -> dict[str, Any]:
    course = next((course for course in db.COURSES if course["id"] == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def find_submission(submission_id: str) -> dict[str, Any]:
    submission = next((item for item in db.SUBMISSIONS if item["id"] == submission_id), None)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


def add_audit(actor: str, role: str, action: str, risk: str = "Low") -> None:
    db.AUDIT_LOG.insert(
        0,
        {
            "timestamp": now_iso(),
            "actor": actor,
            "role": role,
            "action": action,
            "risk": risk,
        },
    )
    db.persist()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "groq_configured": groq_client.configured,
        "groq_model": settings.groq_model,
        "mode": "local",
    }


@app.get(f"{settings.api_prefix}/overview")
def overview() -> dict[str, Any]:
    payload = db.snapshot()
    payload["system"] = {
        "groq_configured": groq_client.configured,
        "groq_model": settings.groq_model,
        "local_mode": True,
    }
    return payload


@app.get(f"{settings.api_prefix}/users/me")
def current_user(role: str = Query("student", pattern="^(student|faculty|admin|it)$")) -> dict[str, Any]:
    return db.USERS[role]


@app.get(f"{settings.api_prefix}/courses")
def list_courses(
    q: str | None = None,
    department: str | None = None,
    term: str | None = None,
    skill: str | None = None,
) -> list[dict[str, Any]]:
    courses = db.COURSES
    if q:
        needle = q.lower()
        courses = [
            course
            for course in courses
            if needle in course["title"].lower()
            or needle in course["description"].lower()
            or needle in course["code"].lower()
        ]
    if department:
        courses = [course for course in courses if course["department"] == department]
    if term:
        courses = [course for course in courses if course["term"] == term]
    if skill:
        courses = [course for course in courses if skill in course["skills"]]
    return courses


@app.get(f"{settings.api_prefix}/courses/{{course_id}}")
def get_course(course_id: str) -> dict[str, Any]:
    return find_course(course_id)


@app.post(f"{settings.api_prefix}/enrollments")
def enroll(payload: EnrollmentRequest) -> dict[str, Any]:
    course = find_course(payload.course_id)
    existing = next(
        (
            enrollment
            for enrollment in db.ENROLLMENTS
            if enrollment["student_id"] == payload.student_id and enrollment["course_id"] == payload.course_id
        ),
        None,
    )
    if existing:
        return {"status": "already_enrolled", "enrollment": existing, "course": course}

    status = "Active" if course["enrolled"] < course["capacity"] else "Waitlisted"
    enrollment = {
        "id": f"enr-{uuid4().hex[:8]}",
        "student_id": payload.student_id,
        "course_id": payload.course_id,
        "status": status,
        "progress": 0,
        "deadline_risk": "None",
    }
    db.ENROLLMENTS.append(enrollment)
    if status == "Active":
        course["enrolled"] += 1
    else:
        course["waitlist"] += 1
    add_audit("Aarav Sharma", "Student", f"Enrollment {status.lower()} for {course['code']}")
    return {"status": status.lower(), "enrollment": enrollment, "course": course}


@app.delete(f"{settings.api_prefix}/enrollments/{{enrollment_id}}")
def drop_enrollment(enrollment_id: str) -> dict[str, Any]:
    index = next((idx for idx, item in enumerate(db.ENROLLMENTS) if item["id"] == enrollment_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    enrollment = db.ENROLLMENTS.pop(index)
    course = find_course(enrollment["course_id"])
    if enrollment["status"] == "Active":
        course["enrolled"] = max(0, course["enrolled"] - 1)
    else:
        course["waitlist"] = max(0, course["waitlist"] - 1)
    add_audit("Aarav Sharma", "Student", f"Dropped enrollment for {course['code']}", "Medium")
    return {"status": "dropped", "enrollment": enrollment}


@app.get(f"{settings.api_prefix}/assessments/{{course_id}}")
def assessments(course_id: str) -> list[dict[str, Any]]:
    find_course(course_id)
    return [assessment for assessment in db.ASSESSMENTS if assessment["course_id"] == course_id]


@app.post(f"{settings.api_prefix}/submissions")
def submit_work(payload: SubmissionRequest) -> dict[str, Any]:
    assessment = next((item for item in db.ASSESSMENTS if item["id"] == payload.assessment_id), None)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    submission = {
        "id": f"sub-{uuid4().hex[:8]}",
        "assessment_id": payload.assessment_id,
        "student_id": payload.student_id,
        "student_name": "Aarav Sharma",
        "course_id": assessment["course_id"],
        "status": "Submitted",
        "submitted_at": now_iso(),
        "text": payload.text,
        "similarity_score": 0.09,
        "score": None,
        "feedback": "",
    }
    db.SUBMISSIONS.insert(0, submission)
    add_audit("Aarav Sharma", "Student", f"Submitted {assessment['title']}")
    return submission


@app.patch(f"{settings.api_prefix}/submissions/{{submission_id}}/grade")
def grade_submission(submission_id: str, payload: GradePatch) -> dict[str, Any]:
    submission = find_submission(submission_id)
    submission["score"] = payload.score
    submission["feedback"] = payload.feedback
    submission["status"] = "Graded"
    add_audit("Dr. Meena Iyer", "Faculty", f"Finalized grade for {submission['student_name']}")
    return submission


@app.get(f"{settings.api_prefix}/analytics/heatmap")
def heatmap() -> list[dict[str, Any]]:
    return db.HEATMAP


@app.get(f"{settings.api_prefix}/analytics/process-debt")
def process_debt() -> list[dict[str, Any]]:
    return db.PROCESS_DEBT


@app.get(f"{settings.api_prefix}/analytics/decision-map")
def decision_map() -> dict[str, Any]:
    return db.DECISION_MAP


@app.get(f"{settings.api_prefix}/analytics/knowledge-continuity")
def knowledge_continuity() -> list[dict[str, Any]]:
    return db.KNOWLEDGE_CONTINUITY


@app.get(f"{settings.api_prefix}/pathways/{{student_id}}")
def pathway(student_id: str) -> dict[str, Any]:
    if student_id not in db.PATHWAYS:
        raise HTTPException(status_code=404, detail="Pathway not found")
    return db.PATHWAYS[student_id]


@app.post(f"{settings.api_prefix}/chat/{{course_id}}/message")
async def chat(course_id: str, payload: ChatMessage) -> dict[str, Any]:
    course = find_course(course_id)
    history = db.CHAT_HISTORY.setdefault(course_id, [])
    history.append({"role": "user", "content": payload.message, "provider": "student"})

    fallback = (
        "### Best next step\n"
        f"- Connect the question to **{course['code']} {course['title']}** skills: {', '.join(course['skills'])}.\n"
        "- Review the rubric and isolate the smallest concept that feels unclear.\n"
        "- Try one worked example, then compare your reasoning against the solution pattern.\n\n"
        "**Escalate if:** the syllabus or assignment wording is ambiguous."
    )
    messages = [
        {
            "role": "system",
            "content": (
                "You are the CMIS AI tutor. Ground answers in the provided course context, "
                "be concise, avoid hallucinated institutional policy, and escalate when uncertain. "
                "Format every answer as clean markdown: one short ATX heading using ###, 3-5 bullets, and bold labels where helpful. "
                "Keep answers under 150 words unless the student explicitly asks for a long plan. Do not use tables or underlined headings."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Course: {course['code']} - {course['title']}\n"
                f"Description: {course['description']}\n"
                f"Skills: {', '.join(course['skills'])}\n"
                f"Student question: {payload.message}"
            ),
        },
    ]
    completion = await groq_client.complete(messages, fallback=fallback, temperature=0.2)
    assistant_message = {
        "role": "assistant",
        "content": completion["content"],
        "provider": completion["provider"],
        "model": completion["model"],
        "mocked": completion["mocked"],
    }
    history.append(assistant_message)
    add_audit("Aarav Sharma", "Student", f"Asked AI tutor in {course['code']}")
    return {"message": assistant_message, "history": history[-8:]}


@app.get(f"{settings.api_prefix}/chat/{{course_id}}/history")
def chat_history(course_id: str) -> list[dict[str, Any]]:
    return db.CHAT_HISTORY.get(course_id, [])


@app.post(f"{settings.api_prefix}/grading/suggest")
async def grading_suggest(payload: GradingSuggestionRequest) -> dict[str, Any]:
    submission = find_submission(payload.submission_id)
    assessment = next(item for item in db.ASSESSMENTS if item["id"] == submission["assessment_id"])
    fallback = (
        f"**Suggested score:** 86/{assessment['max_score']}\n\n"
        "### Strengths\n"
        "- Strong alignment with the main rubric criteria.\n"
        "- Low similarity score supports originality for review.\n\n"
        "### Feedback\n"
        "- Add one edge-case test.\n"
        "- Tie the complexity analysis more explicitly to input size."
    )
    messages = [
        {
            "role": "system",
            "content": (
                "You are CMIS AI-assisted grading. Return a fair rubric-aware suggestion with short feedback. "
                "Format as markdown with: **Suggested score:**, a Strengths heading, a Feedback heading, and concise bullets. "
                "Use ATX headings with ###. Do not use tables or underlined headings."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Assessment: {assessment['title']}\nRubric: {assessment['rubric']}\n"
                f"Max score: {assessment['max_score']}\nSimilarity score: {submission['similarity_score']}\n"
                f"Student work: {submission['text']}"
            ),
        },
    ]
    completion = await groq_client.complete(messages, fallback=fallback, temperature=0.1)
    add_audit("Dr. Meena Iyer", "Faculty", f"Requested AI grading suggestion for {submission['student_name']}")
    return {
        "submission_id": submission["id"],
        "assessment_id": assessment["id"],
        "suggestion": completion["content"],
        "provider": completion["provider"],
        "model": completion["model"],
        "mocked": completion["mocked"],
    }


@app.get(f"{settings.api_prefix}/certificates/verify/{{certificate_hash}}")
def verify_certificate(certificate_hash: str) -> dict[str, Any]:
    certificate = next((item for item in db.CERTIFICATES if item["hash"].lower() == certificate_hash.lower()), None)
    if not certificate:
        return {"verified": False, "status": "Not found", "hash": certificate_hash}
    return {"verified": True, "status": certificate["status"], "certificate": certificate}


@app.get(f"{settings.api_prefix}/certificates/{{student_id}}")
def certificates(student_id: str) -> list[dict[str, Any]]:
    return [item for item in db.CERTIFICATES if item["student_id"] == student_id]


@app.post(f"{settings.api_prefix}/certificates/issue")
def issue_certificate(payload: CertificateIssueRequest) -> dict[str, Any]:
    raw = f"{payload.student_id}:{payload.course}:{payload.grade}:{now_iso()}".encode()
    cert_hash = "0x" + hashlib.sha256(raw).hexdigest()
    certificate = {
        "id": f"cert-{uuid4().hex[:8]}",
        "student_id": payload.student_id,
        "course": payload.course,
        "grade": payload.grade,
        "issued_at": datetime.now(timezone.utc).date().isoformat(),
        "hash": cert_hash,
        "chain": "Local secure hash",
        "tx_hash": "",
        "status": "Tamper-evident",
        "badges": [],
    }
    db.CERTIFICATES.insert(0, certificate)
    add_audit("System", "IT Staff", f"Issued certificate hash for {payload.course}")
    return certificate


@app.get(f"{settings.api_prefix}/gamification/wallet")
def gamification_wallet(student_id: str = "stu-aarav") -> dict[str, Any]:
    if student_id != db.GAMIFICATION["student_id"]:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return db.GAMIFICATION


@app.get(f"{settings.api_prefix}/alumni/skill-gaps")
def alumni_skill_gaps() -> list[dict[str, Any]]:
    return db.ALUMNI_SKILL_GAPS
