export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type RoleKey = "student" | "faculty" | "admin" | "it";

export type User = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  department: string;
  email: string;
  bio: string;
  skills: string[];
};

export type Course = {
  id: string;
  code: string;
  title: string;
  description: string;
  department: string;
  term: string;
  credits: number;
  faculty: string[];
  skills: string[];
  prerequisites: string[];
  status: string;
  capacity: number;
  enrolled: number;
  waitlist: number;
  adoption: number;
  average_grade: number;
};

export type Enrollment = {
  id: string;
  student_id: string;
  course_id: string;
  status: string;
  progress: number;
  deadline_risk: string;
};

export type Submission = {
  id: string;
  assessment_id: string;
  student_id: string;
  student_name: string;
  course_id: string;
  status: string;
  submitted_at: string;
  text: string;
  similarity_score: number;
  score: number | null;
  feedback: string;
};

export type HeatmapCell = {
  department: string;
  role: string;
  login_frequency: number;
  feature_depth: number;
  forum_participation: number;
  score: number;
  band: string;
  sentiment: number;
  negative_clusters: string[];
};

export type ProcessDebt = {
  workflow: string;
  score: number;
  percentile: number;
  status: string;
  trend: { month: string; score: number }[];
  recommendations: string[];
};

export type Pathway = {
  student_id: string;
  mastery_probability: number;
  predicted_outcome: string;
  estimated_time: string;
  skills: { name: string; mastery: number }[];
  next_steps: {
    title: string;
    course: string;
    type: string;
    estimated_time: string;
    reason: string;
    priority: string;
  }[];
};

export type Certificate = {
  id: string;
  student_id: string;
  course: string;
  grade: string;
  issued_at: string;
  hash: string;
  chain: string;
  tx_hash: string;
  status: string;
  badges: string[];
};

export type Overview = {
  generated_at: string;
  users: Record<RoleKey, User>;
  courses: Course[];
  enrollments: Enrollment[];
  submissions: Submission[];
  gradebook: {
    course: string;
    assessment: string;
    score: number | null;
    max_score: number;
    weight: number;
    trend: string;
  }[];
  heatmap: HeatmapCell[];
  process_debt: ProcessDebt[];
  decision_map: {
    nodes: { id: string; label: string; role: string; risk: string; x: number; y: number }[];
    edges: { source: string; target: string; type: string; volume: number }[];
    anomalies: string[];
  };
  knowledge_continuity: {
    course: string;
    department: string;
    sole_instructor_terms: number;
    faculty: string;
    retirement_window: string;
    risk_score: number;
    severity: string;
    suggestions: string[];
  }[];
  pathways: Record<string, Pathway>;
  chat_history: Record<string, ChatMessage[]>;
  certificates: Certificate[];
  gamification: {
    student_id: string;
    xp: number;
    level: number;
    next_level_xp: number;
    rank: number;
    opt_in_leaderboard: boolean;
    wallet_events: { label: string; xp: number; date: string }[];
    badges: string[];
    redeemable_perks: string[];
    leaderboard: { name: string; xp: number }[];
  };
  alumni_skill_gaps: {
    skill: string;
    demand_score: number;
    curriculum_coverage: number;
    gap_score: number;
    affected_courses: string[];
    suggestion: string;
    faculty_response: string;
  }[];
  change_management: {
    framework: string;
    rollout: { stage: string; status: string; details: string }[];
    champions: { name: string; department: string; impact: string }[];
    training_sessions: { title: string; date: string; attendance: number; status: string }[];
  };
  audit_log: { timestamp: string; actor: string; role: string; action: string; risk: string }[];
  kpis: { label: string; value: string; delta: string; tone: string }[];
  free_tier_stack: { service: string; provider: string; status: string; limit: string }[];
  api_endpoints: string[];
  system: {
    groq_configured: boolean;
    groq_model: string;
    local_mode: boolean;
  };
};

export type ChatMessage = {
  role: string;
  content: string;
  provider?: string;
  model?: string;
  mocked?: boolean;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  return response.json() as Promise<T>;
}

export function getOverview() {
  return request<Overview>("/api/v1/overview", { cache: "no-store" });
}

export function enroll(courseId: string) {
  return request("/api/v1/enrollments", {
    method: "POST",
    body: JSON.stringify({ student_id: "stu-aarav", course_id: courseId }),
  });
}

export function sendTutorMessage(courseId: string, message: string) {
  return request<{ message: ChatMessage; history: ChatMessage[] }>(`/api/v1/chat/${courseId}/message`, {
    method: "POST",
    body: JSON.stringify({ student_id: "stu-aarav", message }),
  });
}

export function suggestGrade(submissionId: string) {
  return request<{ suggestion: string; provider: string; model: string; mocked: boolean }>("/api/v1/grading/suggest", {
    method: "POST",
    body: JSON.stringify({ submission_id: submissionId }),
  });
}

export function applyGrade(submissionId: string, score: number, feedback: string) {
  return request<Submission>(`/api/v1/submissions/${submissionId}/grade`, {
    method: "PATCH",
    body: JSON.stringify({ score, feedback, faculty_id: "fac-meena" }),
  });
}

export function saveWorkflowAction(workflow: string, action: string) {
  return request<{ status: string; workflow: ProcessDebt }>("/api/v1/admin/workflow-actions", {
    method: "POST",
    body: JSON.stringify({ workflow, action }),
  });
}

export function verifyCertificate(hash: string) {
  return request<{ verified: boolean; status: string; certificate?: Certificate; hash?: string }>(
    `/api/v1/certificates/verify/${encodeURIComponent(hash)}`,
    { method: "POST" },
  );
}
