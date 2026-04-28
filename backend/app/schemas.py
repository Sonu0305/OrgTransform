from __future__ import annotations

from pydantic import BaseModel, Field


class EnrollmentRequest(BaseModel):
    student_id: str = "stu-aarav"
    course_id: str


class GradePatch(BaseModel):
    score: float
    feedback: str
    faculty_id: str = "fac-meena"


class ChatMessage(BaseModel):
    student_id: str = "stu-aarav"
    message: str = Field(min_length=2, max_length=1000)


class GradingSuggestionRequest(BaseModel):
    submission_id: str


class WorkflowActionRequest(BaseModel):
    workflow: str
    action: str
    actor: str = "Rajiv Menon"
    role: str = "Admin"
