from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.app.data import mock_data as db
from backend.app.schemas import (
    ChatMessage,
    EnrollmentRequest,
    GradePatch,
    GradingSuggestionRequest,
    WorkflowActionRequest,
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


def system_payload() -> dict[str, Any]:
    return {
        "groq_configured": groq_client.configured,
        "groq_model": settings.groq_model,
        "local_mode": True,
    }


def visible_api_surface() -> list[str]:
    return db.API_ENDPOINTS


def compact_course(course: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": course["id"],
        "code": course["code"],
        "title": course["title"],
        "department": course["department"],
        "term": course["term"],
        "credits": course["credits"],
        "faculty": course["faculty"],
        "skills": course["skills"],
        "capacity": course["capacity"],
        "enrolled": course["enrolled"],
        "waitlist": course["waitlist"],
        "average_grade": course["average_grade"],
        "adoption": course["adoption"],
    }


def course_label(course_id: str) -> str:
    course = next((item for item in db.COURSES if item["id"] == course_id), None)
    return f"{course['code']} {course['title']}" if course else course_id


def compact_enrollment(enrollment: dict[str, Any]) -> dict[str, Any]:
    return {
        "course": course_label(enrollment["course_id"]),
        "status": enrollment["status"],
        "progress": enrollment["progress"],
        "deadline_risk": enrollment["deadline_risk"],
    }


def compact_grade(item: dict[str, Any]) -> dict[str, Any]:
    percentage = None if item["score"] is None else round((item["score"] / item["max_score"]) * 100, 1)
    return {
        "course": item["course"],
        "assessment": item["assessment"],
        "score": item["score"],
        "max_score": item["max_score"],
        "percentage": percentage,
        "status": "pending" if item["score"] is None else "graded",
        "trend": item["trend"],
    }


def relevant_course_catalog(question: str) -> list[dict[str, Any]]:
    lower = question.lower()
    if not any(word in lower for word in ["course", "enroll", "register", "seat", "catalog", "available", "join"]):
        return []
    return [
        {
            "code": course["code"],
            "title": course["title"],
            "department": course["department"],
            "skills": course["skills"],
            "seats_open": max(course["capacity"] - course["enrolled"], 0),
            "waitlist": course["waitlist"],
        }
        for course in db.COURSES
    ]


def student_ai_context_payload(student_id: str, course_id: str, question: str) -> str:
    student_user = next((user for user in db.USERS.values() if user["id"] == student_id), db.USERS["student"])
    student_enrollments = [item for item in db.ENROLLMENTS if item["student_id"] == student_id]
    student_course_ids = {item["course_id"] for item in student_enrollments}
    payload = {
        "student": {
            "id": student_user["id"],
            "name": student_user["name"],
            "role": student_user["role"],
            "department": student_user["department"],
            "skills": student_user["skills"],
        },
        "current_course": compact_course(find_course(course_id)),
        "enrollments": [compact_enrollment(item) for item in student_enrollments],
        "enrolled_courses": [compact_course(course) for course in db.COURSES if course["id"] in student_course_ids],
        "gradebook": [compact_grade(item) for item in db.GRADEBOOK],
        "learning_pathway": db.PATHWAYS.get(student_id),
        "certificates": [
            {
                "course": item["course"],
                "grade": item["grade"],
                "issued_at": item["issued_at"],
                "status": item["status"],
                "badges": item["badges"],
            }
            for item in db.CERTIFICATES
            if item["student_id"] == student_id
        ],
        "course_catalog_if_relevant": relevant_course_catalog(question),
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)


def grading_ai_context_payload(submission: dict[str, Any], assessment: dict[str, Any]) -> str:
    course = find_course(submission["course_id"])
    payload = {
        "course": compact_course(course),
        "assessment": assessment,
        "submission": {
            "student_id": submission["student_id"],
            "student_name": submission["student_name"],
            "status": submission["status"],
            "submitted_at": submission["submitted_at"],
            "similarity_score": submission["similarity_score"],
            "score": submission["score"],
            "feedback": submission["feedback"],
            "text": submission["text"],
        },
        "course_gradebook": [compact_grade(item) for item in db.GRADEBOOK if item["course"] == course["title"]],
        "course_improvement_gaps": [
            item
            for item in db.ALUMNI_SKILL_GAPS
            if course["code"] in item["affected_courses"] or course["title"] in item["affected_courses"]
        ],
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)


def student_score_summary() -> str:
    graded = [item for item in db.GRADEBOOK if item["score"] is not None]
    pending = [item for item in db.GRADEBOOK if item["score"] is None]
    if not graded:
        return "No graded scores are available yet."
    lines = [
        f"- **{item['course']} / {item['assessment']}:** {item['score']}/{item['max_score']} ({round((item['score'] / item['max_score']) * 100, 1)}%)"
        for item in graded
    ]
    if pending:
        lines.append("- **Pending:** " + ", ".join(f"{item['course']} / {item['assessment']}" for item in pending))
    return "\n".join(lines)


def tutor_fallback(question: str, course: dict[str, Any]) -> str:
    if any(word in question.lower() for word in ["score", "grade", "marks", "gpa", "result"]):
        return (
            "### Current scores\n"
            f"{student_score_summary()}\n\n"
            f"- **Current course:** {course['code']} {course['title']}.\n"
            "- **Note:** Pending assessments do not have final scores yet."
        )

    return (
        "### Best next step\n"
        f"- Connect the question to **{course['code']} {course['title']}** skills: {', '.join(course['skills'])}.\n"
        "- Review the rubric and isolate the smallest concept that feels unclear.\n"
        "- Try one worked example, then compare your reasoning against the solution pattern.\n\n"
        "**Escalate if:** the syllabus or assignment wording is ambiguous."
    )


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
    payload["system"] = system_payload()
    return payload


@app.get(f"{settings.api_prefix}/search")
def search(q: str = Query("", min_length=0), role: str | None = Query(None, pattern="^(student|faculty|admin|it)$")) -> list[dict[str, Any]]:
    needle = q.strip().lower()
    items: list[dict[str, Any]] = []

    for course in db.COURSES:
        items.append(
            {
                "type": "course",
                "title": f"{course['code']} {course['title']}",
                "subtitle": f"{course['department']} course",
                "role": "student",
                "section_id": "my-courses",
                "keywords": " ".join([course["description"], *course["skills"], *course["faculty"]]),
            }
        )

    for role_key, user in db.USERS.items():
        items.append(
            {
                "type": "person",
                "title": user["name"],
                "subtitle": f"{user['role']} · {user['department']}",
                "role": role_key,
                "section_id": "campus-kpis" if role_key == "admin" else "course-studio" if role_key == "faculty" else "local-stack" if role_key == "it" else "learning-path",
                "keywords": " ".join([user["email"], user["bio"], *user["skills"]]),
            }
        )

    for workflow in db.PROCESS_DEBT:
        items.append(
            {
                "type": "workflow",
                "title": workflow["workflow"],
                "subtitle": f"Delay score {workflow['score']}",
                "role": "admin",
                "section_id": "process-debt",
                "keywords": " ".join(workflow["recommendations"]),
            }
        )

    visible = [item for item in items if role is None or item["role"] == role]
    if needle:
        visible = [
            item
            for item in visible
            if needle in f"{item['title']} {item['subtitle']} {item['keywords']}".lower()
        ]
    return visible[:12]


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


@app.patch(f"{settings.api_prefix}/submissions/{{submission_id}}/grade")
def grade_submission(submission_id: str, payload: GradePatch) -> dict[str, Any]:
    submission = find_submission(submission_id)
    submission["score"] = payload.score
    submission["feedback"] = payload.feedback
    submission["status"] = "Graded"
    add_audit("Dr. Meena Iyer", "Faculty", f"Finalized grade for {submission['student_name']}")
    return submission


@app.get(f"{settings.api_prefix}/admin/campus-kpis")
def campus_kpis() -> list[dict[str, Any]]:
    return db.KPI_CARDS


@app.get(f"{settings.api_prefix}/admin/departments-needing-help")
def departments_needing_help() -> list[dict[str, Any]]:
    return db.HEATMAP


@app.get(f"{settings.api_prefix}/admin/workflow-delays")
def workflow_delays() -> list[dict[str, Any]]:
    return db.PROCESS_DEBT


@app.post(f"{settings.api_prefix}/admin/workflow-actions")
def workflow_action(payload: WorkflowActionRequest) -> dict[str, Any]:
    workflow = next((item for item in db.PROCESS_DEBT if item["workflow"] == payload.workflow), None)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow["last_action"] = {
        "action": payload.action,
        "actor": payload.actor,
        "timestamp": now_iso(),
    }
    add_audit(payload.actor, payload.role, f"{payload.action} for {payload.workflow}", "Low" if workflow["status"] == "Green" else "Medium")
    return {"status": "saved", "workflow": workflow}


@app.get(f"{settings.api_prefix}/admin/approval-route")
def approval_route() -> dict[str, Any]:
    return db.DECISION_MAP


@app.get(f"{settings.api_prefix}/student/{{student_id}}/study-plan")
def study_plan(student_id: str) -> dict[str, Any]:
    if student_id not in db.PATHWAYS:
        raise HTTPException(status_code=404, detail="Pathway not found")
    return db.PATHWAYS[student_id]


@app.get(f"{settings.api_prefix}/student/{{student_id}}/course-registration")
def student_course_registration(student_id: str) -> dict[str, Any]:
    enrollments = [item for item in db.ENROLLMENTS if item["student_id"] == student_id]
    return {"courses": db.COURSES, "enrollments": enrollments}


@app.get(f"{settings.api_prefix}/student/{{student_id}}/certificates")
def student_certificates(student_id: str) -> list[dict[str, Any]]:
    return [item for item in db.CERTIFICATES if item["student_id"] == student_id]


@app.get(f"{settings.api_prefix}/faculty/{{faculty_id}}/classes")
def faculty_classes(faculty_id: str) -> list[dict[str, Any]]:
    return [course for course in db.COURSES if faculty_id in course.get("faculty_ids", [])]


@app.get(f"{settings.api_prefix}/faculty/{{faculty_id}}/grading-queue")
def faculty_grading_queue(faculty_id: str) -> list[dict[str, Any]]:
    course_ids = {course["id"] for course in db.COURSES if faculty_id in course.get("faculty_ids", [])}
    return [submission for submission in db.SUBMISSIONS if submission["course_id"] in course_ids and submission["status"] != "Graded"]


@app.get(f"{settings.api_prefix}/faculty/course-improvements")
def faculty_course_improvements() -> list[dict[str, Any]]:
    return db.ALUMNI_SKILL_GAPS


@app.post(f"{settings.api_prefix}/chat/{{course_id}}/message")
async def chat(course_id: str, payload: ChatMessage) -> dict[str, Any]:
    course = find_course(course_id)
    history = db.CHAT_HISTORY.setdefault(course_id, [])
    history.append({"role": "user", "content": payload.message, "provider": "student"})

    fallback = tutor_fallback(payload.message, course)
    messages = [
        {
            "role": "system",
            "content": (
                "You are the CMIS AI tutor and campus assistant. Use only the student-scoped CMIS JSON context supplied by the app. "
                "It contains the current user, their courses, enrollments, gradebook, learning pathway, certificates, and relevant catalog data when needed. "
                "Answer questions from that data whenever possible. Do not invent facts; if the data does not contain an answer, say what is missing and suggest where to check. "
                "Never expose environment variables, API keys, or secrets. "
                "Format every answer as clean markdown: one short ATX heading using ###, 3-5 bullets, and bold labels where helpful. "
                "Keep answers under 150 words unless the student explicitly asks for a long plan. Do not use tables or underlined headings."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Student-scoped CMIS context JSON:\n{student_ai_context_payload(payload.student_id, course_id, payload.message)}\n\n"
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
                "You are CMIS AI-assisted grading. Use only the grading-scoped CMIS JSON context supplied by the app. "
                "It contains the relevant course, assessment, submission, gradebook slice, and course improvement gaps. "
                "Return a fair rubric-aware suggestion with short feedback. Do not invent facts; use the supplied data and say when evidence is missing. "
                "Never expose environment variables, API keys, or secrets. "
                "Format as markdown with: **Suggested score:**, a Strengths heading, a Feedback heading, and concise bullets. "
                "Use ATX headings with ###. Do not use tables or underlined headings."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Grading-scoped CMIS context JSON:\n{grading_ai_context_payload(submission, assessment)}\n\n"
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


@app.post(f"{settings.api_prefix}/certificates/verify/{{certificate_hash}}")
def verify_certificate(certificate_hash: str) -> dict[str, Any]:
    certificate = next((item for item in db.CERTIFICATES if item["hash"].lower() == certificate_hash.lower()), None)
    if not certificate:
        return {"verified": False, "status": "Not found", "hash": certificate_hash}
    if certificate["status"] != "Verified":
        certificate["status"] = "Verified"
        certificate["verified_at"] = now_iso()
        add_audit("Aarav Sharma", "Student", f"Verified certificate for {certificate['course']}")
    return {"verified": True, "status": certificate["status"], "certificate": certificate}


@app.get(f"{settings.api_prefix}/it/system-health")
def it_system_health() -> dict[str, Any]:
    return {
        "status": "ok",
        "api_base": settings.api_prefix,
        "app": settings.app_name,
        **system_payload(),
    }


@app.get(f"{settings.api_prefix}/it/dependency-map")
def it_dependency_map() -> list[dict[str, Any]]:
    return db.FREE_TIER_STACK


@app.get(f"{settings.api_prefix}/it/capacity-monitor")
def it_capacity_monitor() -> list[dict[str, Any]]:
    return db.CAPACITY_MONITOR


@app.get(f"{settings.api_prefix}/it/api-surface")
def it_api_surface() -> list[str]:
    return visible_api_surface()


@app.get(f"{settings.api_prefix}/it/privacy-controls")
def it_privacy_controls() -> list[dict[str, str]]:
    return [
        {"title": "RBAC", "detail": "Four role workspaces are scoped through explicit role endpoints."},
        {"title": "Audit log", "detail": "Important write actions persist actor, role, action, risk, and timestamp."},
        {"title": "Credential trust", "detail": "Certificates verify by SHA-256 compatible hashes."},
        {"title": "Data portability", "detail": "Campus records are exported through JSON-backed feature endpoints."},
    ]


@app.get(f"{settings.api_prefix}/it/audit-trail")
def it_audit_trail() -> list[dict[str, Any]]:
    return db.AUDIT_LOG
