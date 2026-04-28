"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Command,
  Database,
  FileCheck2,
  GitBranch,
  GraduationCap,
  LayoutGrid,
  LineChart as LineChartIcon,
  LockKeyhole,
  Network,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  API_BASE,
  applyGrade,
  ChatMessage,
  Course,
  enroll,
  getOverview,
  HeatmapCell,
  Overview,
  ProcessDebt,
  RoleKey,
  saveWorkflowAction,
  sendTutorMessage,
  suggestGrade,
  verifyCertificate,
} from "@/lib/api";

const roleOptions = [
  {
    key: "student" as const,
    label: "Student",
    loginTitle: "Student Login",
    description: "Track enrolled courses, next study steps, grades, and certificates.",
    demoPitch: "Easy to explain: the student sees what to learn next and where they stand.",
    icon: GraduationCap,
  },
  {
    key: "faculty" as const,
    label: "Teacher",
    loginTitle: "Teacher Login",
    description: "Review classes, check submitted work, and improve courses from feedback.",
    demoPitch: "Easy to explain: the teacher teaches, reviews, and updates course quality.",
    icon: BookOpen,
  },
  {
    key: "admin" as const,
    label: "Registrar",
    loginTitle: "Registrar Login",
    description: "Monitor campus KPIs, approvals, adoption, and slow academic workflows.",
    demoPitch: "Easy to explain: the registrar turns scattered course data into decisions.",
    icon: ShieldCheck,
  },
  {
    key: "it" as const,
    label: "IT Support",
    loginTitle: "IT Support Login",
    description: "Check system health, API readiness, privacy controls, and audit logs.",
    demoPitch: "Easy to explain: IT keeps the CMIS reliable, private, and zero-cost.",
    icon: Database,
  },
];

const navByRole: Record<RoleKey, { label: string; icon: typeof Activity; id: string }[]> = {
  admin: [
    { label: "Campus Snapshot", icon: BarChart3, id: "campus-kpis" },
    { label: "Departments Needing Help", icon: LayoutGrid, id: "resistance-heatmap" },
    { label: "Workflow Delays", icon: LineChartIcon, id: "process-debt" },
    { label: "Approval Route", icon: Network, id: "authority-map" },
    { label: "Knowledge Risk", icon: AlertTriangle, id: "knowledge-risk" },
    { label: "Change Plan", icon: Users, id: "change-plan" },
  ],
  student: [
    { label: "My Progress", icon: BrainCircuit, id: "learning-path" },
    { label: "Course Registration", icon: BookOpen, id: "my-courses" },
    { label: "Course Help", icon: Bot, id: "ai-tutor" },
    { label: "Learning Rewards", icon: WalletCards, id: "learning-rewards" },
    { label: "Certificates", icon: BadgeCheck, id: "credentials" },
  ],
  faculty: [
    { label: "My Classes", icon: BookOpen, id: "course-studio" },
    { label: "Review Work", icon: ClipboardCheck, id: "grading-queue" },
    { label: "Course Improvements", icon: GitBranch, id: "curriculum-gaps" },
  ],
  it: [
    { label: "System Health", icon: Database, id: "local-stack" },
    { label: "Capacity", icon: Activity, id: "capacity-monitor" },
    { label: "API Checklist", icon: GitBranch, id: "api-surface" },
    { label: "Privacy", icon: LockKeyhole, id: "privacy" },
    { label: "Audit Trail", icon: FileCheck2, id: "audit-trail" },
  ],
};

const sidebarDetailsByRole: Record<RoleKey, { label: string; value: string }[]> = {
  admin: [
    { label: "Live focus", value: "Campus KPIs, slow approvals, and change ownership" },
    { label: "Next decision", value: "Assign owners where workflow load is highest" },
    { label: "Proof shown", value: "Usage signals, approval path, and audit history" },
  ],
  student: [
    { label: "Live focus", value: "Study progress, open courses, and certificate proof" },
    { label: "Next action", value: "Finish the recommended step, then register if seats are open" },
    { label: "Proof shown", value: "Grades, badges, course progress, and verified certificates" },
  ],
  faculty: [
    { label: "Live focus", value: "Active classes, submitted work, and course gaps" },
    { label: "Next action", value: "Draft feedback, review it, then save the final grade" },
    { label: "Proof shown", value: "Class engagement, rubric context, and alumni feedback" },
  ],
  it: [
    { label: "Live focus", value: "System health, capacity, APIs, and privacy posture" },
    { label: "Next action", value: "Confirm service status and review the latest audit trail" },
    { label: "Proof shown", value: "Free-tier map, endpoint inventory, and compliance controls" },
  ],
};

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  role: RoleKey;
  sectionId: string;
  icon: typeof Activity;
  keywords: string;
};

function scrollToSection(sectionId: string) {
  window.setTimeout(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 70);
}

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const CHART_COLORS = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  line: "var(--color-line)",
  text: "var(--color-text)",
  muted: "var(--color-muted)",
  secondary: "var(--color-secondary)",
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--color-secondary)",
  border: "1px solid var(--color-line)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-raised)",
  color: "var(--color-text)",
};

function bandClasses(band: string) {
  if (band === "High") return "neo-status-success";
  if (band === "Moderate") return "neo-status-info";
  if (band === "Low") return "neo-status-warning";
  return "neo-status-danger";
}

function bandToneClasses(band: string) {
  if (band === "High") return "bg-success";
  if (band === "Moderate") return "bg-primary";
  if (band === "Low") return "bg-warning";
  return "bg-danger";
}

function riskClasses(value: string) {
  if (["Green", "Low", "Verified", "Complete", "Active", "Joined", "Graded"].includes(value)) return "neo-status-success";
  if (["Amber", "Medium", "Scheduled", "Tamper-evident", "Submitted", "Needs Review", "Waitlisted"].includes(value)) return "neo-status-warning";
  if (["Red", "High", "Critical"].includes(value)) return "neo-status-danger";
  return "neo-status-info";
}

function toneClasses(tone: string) {
  if (tone === "green") return "bg-success";
  if (tone === "blue") return "bg-primary";
  if (tone === "amber") return "bg-warning";
  if (tone === "danger") return "bg-danger";
  return "bg-text";
}

function friendlyMetricLabel(label: string) {
  const labels: Record<string, string> = {
    "Retention Forecast": "Students Staying",
    "Avg GPA": "Average Grade",
    "Process Debt": "Workflow Load",
    Adoption: "Campus Usage",
    Certificates: "Certificates",
  };
  return labels[label] ?? label;
}

function friendlyStatus(value: string) {
  const labels: Record<string, string> = {
    High: "Great",
    Moderate: "Okay",
    Low: "Needs Help",
    Critical: "Needs Attention",
    Red: "Needs Attention",
    Amber: "Watch",
    Green: "Healthy",
    Active: "Joined",
    Waitlisted: "Waiting",
    Submitted: "Ready to Review",
    "Needs Review": "Needs Review",
    Graded: "Done",
    Verified: "Verified",
    "Tamper-evident": "Saved Safely",
  };
  return labels[value] ?? value;
}

function friendlyCertificateSource(source: string) {
  if (source.toLowerCase().includes("polygon")) return "Verified online";
  if (source.toLowerCase().includes("fallback") || source.toLowerCase().includes("local")) return "Saved safely";
  return source;
}

function friendlyRoleLabel(roleName: string) {
  const labels: Record<string, string> = {
    Admin: "College Staff",
    Faculty: "Teacher",
    "IT Staff": "Support Staff",
  };
  return labels[roleName] ?? roleName;
}

function extractSuggestedScore(text: string) {
  const match = text.match(/suggested score[:* ]+(\d{1,3})/i) ?? text.match(/\b(\d{1,3})\s*\/\s*\d{1,3}\b/);
  if (!match) return 86;
  return Math.max(0, Math.min(Number(match[1]), 100));
}

function courseCodeFor(overview: Overview, courseId: string) {
  return overview.courses.find((course) => course.id === courseId)?.code ?? courseId.toUpperCase();
}

function Panel({
  id,
  title,
  eyebrow,
  icon: Icon,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  icon?: typeof Activity;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={clsx("neo-panel scroll-mt-24 p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 font-label text-xs font-bold uppercase text-muted">{eyebrow}</p> : null}
          <h2 className="flex items-center gap-2 text-lg font-bold text-text">
            {Icon ? <Icon className="h-5 w-5 text-primary" aria-hidden="true" /> : null}
            <span className="truncate">{title}</span>
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("neo-badge min-w-0 max-w-full whitespace-normal break-words px-2.5 py-1 text-center text-xs font-bold leading-4", className)}>
      {children}
    </span>
  );
}

function ProgressBar({ value, tone = "bg-primary" }: { value: number; tone?: string }) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div
      className="neo-inset h-2.5 w-full overflow-hidden rounded-sm"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div className={clsx("h-full rounded-sm shadow-neo-soft", tone)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function Notice({ tone = "success", children }: { tone?: "success" | "warning" | "info"; children: React.ReactNode }) {
  const styles = {
    success: "neo-status-success",
    warning: "neo-status-warning",
    info: "neo-status-info",
  };
  return <div className={clsx("neo-panel px-3 py-2 text-sm font-bold", styles[tone])}>{children}</div>;
}

function RoleIntro({ title, description, steps }: { title: string; description: string; steps: string[] }) {
  return (
    <section className="neo-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-label text-xs font-bold uppercase text-muted">What this role does</p>
          <h2 className="mt-1 text-2xl font-bold text-text">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-text/75">{description}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
          {steps.map((step, index) => (
            <div key={step} className="neo-inset p-3">
              <p className="font-label text-xs font-bold uppercase text-muted">Step {index + 1}</p>
              <p className="mt-1 text-sm font-bold text-text">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: string }) {
  return (
    <div className="neo-panel relative overflow-hidden p-4">
      <div className={clsx("absolute left-0 top-0 h-full w-1.5", toneClasses(tone))} />
      <div className="mb-4 flex items-center gap-2">
        <span className={clsx("h-2.5 w-2.5 rounded-sm shadow-neo-soft", toneClasses(tone))} aria-hidden="true" />
        <p className="text-sm font-bold text-muted">{friendlyMetricLabel(label)}</p>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold text-text">{value}</p>
        <Badge className="neo-status-info">{delta}</Badge>
      </div>
    </div>
  );
}

function FormattedAiText({ content, inverse = false }: { content: string; inverse?: boolean }) {
  return (
    <div className={clsx("space-y-2 leading-6", inverse ? "text-secondary" : "text-text/80")}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <p className={clsx("text-sm font-bold", inverse ? "text-secondary" : "text-text")}>{children}</p>,
          h2: ({ children }) => <p className={clsx("text-sm font-bold", inverse ? "text-secondary" : "text-text")}>{children}</p>,
          h3: ({ children }) => <p className={clsx("text-sm font-bold", inverse ? "text-secondary" : "text-text")}>{children}</p>,
          h4: ({ children }) => <p className={clsx("text-sm font-bold", inverse ? "text-secondary" : "text-text")}>{children}</p>,
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong className={clsx("font-bold", inverse ? "text-secondary" : "text-text")}>{children}</strong>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, className }) => {
            const block = Boolean(className);
            return block ? (
              <code className="block whitespace-pre-wrap">{children}</code>
            ) : (
              <code className={clsx("rounded-sm border px-1.5 py-0.5 font-mono text-[0.86em]", inverse ? "border-secondary/30 bg-secondary/10" : "border-line bg-surface text-text")}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className={clsx("overflow-x-auto rounded-md p-3 text-xs shadow-inset", inverse ? "bg-secondary/10 text-secondary" : "bg-surface text-text")}>
              {children}
            </pre>
          ),
        }}
      >
        {content.replace(/\r/g, "").trim()}
      </ReactMarkdown>
    </div>
  );
}

function GlobalSearch({ items, onSelect }: { items: SearchItem[]; onSelect: (item: SearchItem) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ranked = needle
      ? items.filter((item) => `${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase().includes(needle))
      : items.filter((item) => ["admin-nav-campus-kpis", "student-nav-ai-tutor", "faculty-nav-grading-queue", "student-nav-my-courses"].includes(item.id));

    return ranked.slice(0, 8);
  }, [items, query]);

  function pick(item: SearchItem) {
    onSelect(item);
    setQuery("");
    setOpen(false);
  }

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  return (
    <div ref={rootRef} className="relative order-last w-full lg:order-none lg:max-w-xl">
      <div
        className={clsx(
          "neo-input flex h-11 items-center gap-2 px-3 transition",
          open ? "border-primary/45" : "hover:border-primary/35",
        )}
      >
        <Search className="h-4 w-4 text-primary" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) pick(results[0]);
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Tab") setOpen(false);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-text outline-none placeholder:text-muted/70 focus-visible:outline-none"
          placeholder="Search courses, people, certificates"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="neo-button h-7 w-7 p-0 text-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <Command className="h-4 w-4 text-muted/60" aria-hidden="true" />
        )}
      </div>

      {open ? (
        <div
          className="neo-panel absolute left-0 right-0 top-[3.25rem] z-50 overflow-hidden"
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="max-h-[380px] overflow-y-auto p-2">
            {results.length ? (
              results.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pick(item)}
                    className="neo-nav-item flex w-full items-center gap-3 px-3 py-3 text-left"
                  >
                    <span className="neo-icon h-9 w-9 shrink-0">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-text">{item.title}</span>
                      <span className="block truncate text-xs text-muted">{item.subtitle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
                  </button>
                );
              })
            ) : (
              <div className="neo-empty px-3 py-8 text-center text-sm font-bold text-muted">No matching record</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LoginScreen({
  apiState,
  error,
  overview,
  onRefresh,
  onSelectRole,
}: {
  apiState: "loading" | "live" | "offline";
  error: string;
  overview: Overview;
  onRefresh: () => Promise<void>;
  onSelectRole: (role: RoleKey) => void;
}) {
  const proofPoints = [
    { label: "Course catalog", value: `${overview.courses.length} courses`, icon: BookOpen },
    { label: "Role access", value: "4 logins", icon: ShieldCheck },
    { label: "Workflow tracking", value: `${overview.process_debt.length} flows`, icon: LineChartIcon },
  ];

  return (
    <main className="min-h-screen lg:h-screen lg:overflow-hidden">
      <header className="border-b border-line bg-secondary/92 shadow-neo-soft backdrop-blur">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-secondary">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-text sm:text-lg">CMIS Course Management</h1>
              <p className="hidden text-xs text-muted sm:block">Course Management Information System</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                apiState === "live"
                  ? "neo-header-control neo-status-success whitespace-nowrap px-2.5"
                  : apiState === "loading"
                    ? "neo-header-control neo-status-info whitespace-nowrap px-2.5"
                    : "neo-header-control neo-status-warning whitespace-nowrap px-2.5"
              }
            >
              System {apiState === "live" ? "online" : apiState === "offline" ? "offline" : "checking"}
            </Badge>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="neo-button neo-icon-button"
              aria-label="Refresh campus data"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1380px] gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100vh-97px)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <section className="neo-panel flex flex-col p-4">
          <div className="flex items-start gap-3">
            <span className="neo-icon h-10 w-10 shrink-0">
              <LayoutGrid className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-label text-xs font-bold uppercase tracking-normal text-muted">Select workspace</p>
              <h2 className="mt-1 text-lg font-bold text-text">Campus Course Hub</h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-text/75">
            Role-based access for registration, teaching review, academic operations, privacy, and campus workflow tracking.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {proofPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.label} className="neo-inset px-2 py-2">
                  <span className="neo-icon h-7 w-7">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block min-w-0">
                    <span className="block truncate text-sm font-bold text-text">{point.value}</span>
                    <span className="block truncate text-[11px] text-muted">{point.label}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
            <Badge className="neo-status-success w-full">Persistent records</Badge>
            <Badge className={clsx("w-full", overview.system.groq_configured ? "neo-status-success" : "border-line bg-surface/70 text-text/85")}>
              AI {overview.system.groq_configured ? "ready" : "local"}
            </Badge>
          </div>
          {error ? <p className="mt-3 text-xs leading-5 text-text">Live data unavailable: {error.slice(0, 120)}</p> : null}

          <div className="neo-inset mt-4 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-label text-xs font-bold uppercase tracking-normal text-muted">Workspace focus</p>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            </div>
            <div className="mt-3 grid gap-2">
              {[
                ["Lifecycle", "Catalog to certificates"],
                ["Handoffs", "Student, faculty, ops, IT"],
                ["Traceability", "Records and status history"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-1.5 text-xs shadow-neo-soft">
                  <span className="font-bold text-text">{label}</span>
                  <span className="text-right text-muted">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-label text-xs font-bold uppercase tracking-normal text-muted">Available logins</p>
              <h2 className="text-xl font-bold text-text sm:text-2xl">Choose your role</h2>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 xl:grid-rows-2">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const person = overview.users[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onSelectRole(option.key)}
                  className="neo-panel group flex min-h-[210px] flex-col p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-neo"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="neo-icon h-10 w-10 transition group-hover:bg-primary group-hover:text-secondary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <Badge className="border-line bg-surface/70 text-text/85">{person.avatar}</Badge>
                  </div>
                  <p className="mt-3 text-lg font-bold text-text">{option.loginTitle}</p>
                  <p className="mt-1 text-sm font-bold text-muted">{person.name} · {person.department}</p>
                  <p className="mt-2 text-sm leading-6 text-text/75">{option.description}</p>
                  <div className="mt-auto flex items-center gap-2 border-t border-line pt-3 text-sm font-bold text-text">
                    Enter workspace
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function StartupScreen({
  apiState,
  error,
  onRefresh,
}: {
  apiState: "loading" | "live" | "offline";
  error: string;
  onRefresh: () => Promise<void>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="neo-panel w-full max-w-md p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-secondary">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-text">CMIS Course Management</h1>
            <p className="text-sm text-muted">{apiState === "loading" ? "Loading persisted campus records" : "Backend data is unavailable"}</p>
          </div>
        </div>
        {error ? <Notice tone="warning">Connect the API service and refresh: {error.slice(0, 140)}</Notice> : null}
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="neo-button neo-button-primary mt-4 w-full px-4 py-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh data
        </button>
      </section>
    </main>
  );
}

export default function Home() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [role, setRole] = useState<RoleKey | null>(null);
  const [apiState, setApiState] = useState<"loading" | "live" | "offline">("loading");
  const [error, setError] = useState("");

  async function refreshData() {
    try {
      const data = await getOverview();
      setOverview(data);
      setApiState("live");
      setError("");
    } catch (err) {
      setApiState("offline");
      setError(err instanceof Error ? err.message : "API unavailable");
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  if (!overview) {
    return <StartupScreen apiState={apiState} error={error} onRefresh={refreshData} />;
  }

  return (
    <AppShell
      apiState={apiState}
      error={error}
      overview={overview}
      refreshData={refreshData}
      role={role}
      setRole={setRole}
    />
  );
}

function AppShell({
  apiState,
  error,
  overview,
  refreshData,
  role,
  setRole,
}: {
  apiState: "loading" | "live" | "offline";
  error: string;
  overview: Overview;
  refreshData: () => Promise<void>;
  role: RoleKey | null;
  setRole: (role: RoleKey | null) => void;
}) {
  const activeRole = role ?? "student";
  const user = overview.users[activeRole];
  const searchItems = useMemo<SearchItem[]>(() => {
    const roleNav = roleOptions.flatMap((option) =>
      navByRole[option.key].map((item) => ({
        id: `${option.key}-nav-${item.id}`,
        title: item.label,
        subtitle: `${option.label} workspace`,
        role: option.key,
        sectionId: item.id,
        icon: item.icon,
        keywords: `${option.key} ${item.label}`,
      })),
    );

    const courses = overview.courses.flatMap((course) => [
      {
        id: `course-student-${course.id}`,
        title: `${course.code} ${course.title}`,
        subtitle: `${course.department} course catalog`,
        role: "student" as const,
        sectionId: "my-courses",
        icon: BookOpen,
        keywords: `${course.description} ${course.skills.join(" ")} ${course.faculty.join(" ")}`,
      },
      {
        id: `course-faculty-${course.id}`,
        title: `${course.code} analytics`,
        subtitle: `${course.enrolled}/${course.capacity} enrolled`,
        role: "faculty" as const,
        sectionId: "course-studio",
        icon: BarChart3,
        keywords: `${course.title} ${course.department} gradebook engagement`,
      },
    ]);

    const people = roleOptions.map((option) => {
      const person = overview.users[option.key];
      return {
        id: `person-${option.key}`,
        title: person.name,
        subtitle: `${friendlyRoleLabel(person.role)} · ${person.department}`,
        role: option.key,
        sectionId: navByRole[option.key][0].id,
        icon: UserRound,
        keywords: `${person.email} ${person.bio} ${person.skills.join(" ")}`,
      };
    });

    const workflows = overview.process_debt.map((workflow) => ({
      id: `workflow-${workflow.workflow}`,
      title: workflow.workflow,
      subtitle: `Delay score ${workflow.score.toFixed(1)} · ${friendlyStatus(workflow.status)}`,
      role: "admin" as const,
      sectionId: "process-debt",
      icon: LineChartIcon,
      keywords: workflow.recommendations.join(" "),
    }));

    const gaps = overview.alumni_skill_gaps.map((gap) => ({
      id: `gap-${gap.skill}`,
      title: `${gap.skill} missing skill`,
      subtitle: `Need score ${gap.gap_score}`,
      role: "faculty" as const,
      sectionId: "curriculum-gaps",
      icon: GitBranch,
      keywords: `${gap.affected_courses.join(" ")} ${gap.suggestion} ${gap.faculty_response}`,
    }));

    const certificates = overview.certificates.map((certificate) => ({
      id: `certificate-${certificate.id}`,
      title: certificate.course,
      subtitle: `${certificate.status} credential`,
      role: "student" as const,
      sectionId: "credentials",
      icon: BadgeCheck,
      keywords: `${certificate.hash} ${certificate.chain} ${certificate.grade}`,
    }));

    return [...roleNav, ...courses, ...people, ...workflows, ...gaps, ...certificates];
  }, [overview]);

  function jumpTo(item: SearchItem) {
    setRole(item.role);
    scrollToSection(item.sectionId);
  }

  if (!role) {
    return (
      <LoginScreen
        apiState={apiState}
        error={error}
        overview={overview}
        onRefresh={refreshData}
        onSelectRole={(nextRole) => {
          setRole(nextRole);
          window.scrollTo({ top: 0, left: 0 });
        }}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-secondary/92 shadow-neo-soft backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-secondary">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-text sm:text-lg">CMIS Course Management</h1>
              <p className="hidden text-xs text-muted sm:block">{roleOptions.find((option) => option.key === role)?.label} workspace</p>
            </div>
          </div>

          <GlobalSearch items={searchItems} onSelect={jumpTo} />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge
              className={
                apiState === "live"
                  ? "neo-header-control neo-status-success whitespace-nowrap px-2.5"
                  : apiState === "loading"
                    ? "neo-header-control neo-status-info whitespace-nowrap px-2.5"
                    : "neo-header-control neo-status-warning whitespace-nowrap px-2.5"
              }
            >
              System {apiState === "live" ? "online" : apiState === "offline" ? "offline" : "checking"}
            </Badge>
            <Badge className={clsx("neo-header-control whitespace-nowrap px-2.5 text-xs", overview.system.groq_configured ? "neo-status-success" : "border-line bg-surface/70 text-text/85")}>
              AI {overview.system.groq_configured ? "ready" : "local"}
            </Badge>
            <button
              className="neo-button neo-icon-button"
              onClick={() => void refreshData()}
              aria-label="Refresh campus data"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              className="neo-button neo-header-control whitespace-nowrap px-2.5 text-xs"
              onClick={() => setRole(null)}
            >
              Change login
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1380px] min-w-0 items-start gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,250px)_minmax(0,1fr)]">
        <aside className="neo-panel thin-scrollbar flex w-full min-w-0 flex-col overflow-hidden p-4 xl:sticky xl:top-[85px] xl:max-h-[calc(100vh-105px)] xl:overflow-y-auto">
          <div className="flex min-w-0 items-center gap-3 border-b border-line pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-secondary shadow-neo-soft">
              {user.avatar}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-text">{user.name}</p>
              <p className="truncate text-sm text-muted">{friendlyRoleLabel(user.role)} · {user.department}</p>
            </div>
          </div>

          <div className="neo-inset mt-4 min-w-0 p-3">
            <p className="font-label text-xs font-bold uppercase tracking-normal text-primary">Role purpose</p>
            <p className="mt-1 break-words text-sm text-text">{roleOptions.find((option) => option.key === role)?.demoPitch}</p>
          </div>

          <p className="mt-5 font-label text-xs font-bold uppercase tracking-normal text-muted/75">Jump to</p>
          <nav className="mt-2 space-y-1">
            {navByRole[activeRole].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="neo-nav-item flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-bold"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted/75" aria-hidden="true" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="neo-inset mt-5 flex min-w-0 flex-1 flex-col p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-label text-xs font-bold uppercase tracking-normal text-muted">Workspace pulse</p>
              <Activity className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            </div>
            <div className="mt-3 space-y-2">
              {sidebarDetailsByRole[activeRole].map((detail) => (
                <div key={detail.label} className="min-w-0 rounded-md bg-secondary px-3 py-2 shadow-neo-soft">
                  <p className="font-label text-[11px] font-bold uppercase tracking-normal text-muted/75">{detail.label}</p>
                  <p className="mt-1 break-words text-sm font-bold leading-5 text-text/85">{detail.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-3">
              <div className="neo-status-success rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <p className="text-sm font-bold text-text">Ready for demo</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-text">Every role page now carries context through the full sidebar height.</p>
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 text-xs text-text">Local service unavailable: {error.slice(0, 110)}</p> : null}
        </aside>

        <div className="min-w-0">
          {activeRole === "admin" ? <AdminDashboard overview={overview} /> : null}
          {activeRole === "student" ? <StudentDashboard overview={overview} onRefresh={refreshData} /> : null}
          {activeRole === "faculty" ? <FacultyDashboard overview={overview} onRefresh={refreshData} /> : null}
          {activeRole === "it" ? <ITDashboard overview={overview} apiState={apiState} /> : null}
        </div>
      </div>
    </main>
  );
}

function AdminDashboard({ overview }: { overview: Overview }) {
  const adminUser = overview.users.admin;
  const [selected, setSelected] = useState<HeatmapCell>(overview.heatmap[0]);
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [actionMessage, setActionMessage] = useState("");
  const debtData = overview.process_debt.map((item) => ({ workflow: item.workflow.replace(" ", "\n"), score: item.score, percentile: item.percentile }));
  const departments = useMemo(
    () => ["All", ...Array.from(new Set(overview.heatmap.map((cell) => cell.department))).sort()],
    [overview.heatmap],
  );
  const visibleHeatmap = useMemo(
    () => overview.heatmap.filter((cell) => departmentFilter === "All" || cell.department === departmentFilter),
    [departmentFilter, overview.heatmap],
  );

  useEffect(() => {
    setSelected(visibleHeatmap[0] ?? overview.heatmap[0]);
  }, [overview.heatmap, visibleHeatmap]);

  async function handleWorkflowAction(item: ProcessDebt) {
    const action = item.status === "Green" ? "Monitoring note saved" : "Owner assigned";
    setActionMessage("");
    try {
      await saveWorkflowAction(item.workflow, action, adminUser.name, adminUser.role);
      setActionMessage(
        item.status === "Green"
          ? `${item.workflow}: monitoring note saved for the next weekly check.`
          : `${item.workflow}: owner assigned and a follow-up check was added for this week.`,
      );
    } catch {
      setActionMessage(`${item.workflow}: action could not be saved. Please try again.`);
    }
  }

  return (
    <div className="space-y-5">
      <RoleIntro
        title="Registrar checks whether the institution is running smoothly"
        description="This dashboard turns the PRD's organizational transformation idea into a simple story: course operations, adoption, approvals, and delays are visible in one place."
        steps={["Review campus health", "Find slow workflows", "Assign an owner"]}
      />
      {actionMessage ? <Notice>{actionMessage}</Notice> : null}
      <div id="campus-kpis" className="grid scroll-mt-24 gap-4 md:grid-cols-2 2xl:grid-cols-5">
        {overview.kpis.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          id="resistance-heatmap"
          title="Which Departments Need Help?"
          eyebrow="Easy view for college staff"
          icon={LayoutGrid}
          action={
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="neo-input px-3 py-2 text-sm font-bold text-text"
              aria-label="Filter department usage"
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleHeatmap.map((cell) => (
              <button
                key={`${cell.department}-${cell.role}`}
                onClick={() => setSelected(cell)}
                className={clsx(
                  "neo-panel-soft p-4 text-left transition hover:-translate-y-0.5 hover:shadow-neo",
                  bandClasses(cell.band),
                  selected.department === cell.department && selected.role === cell.role ? "ring-2 ring-primary/30" : "",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{cell.department}</p>
                  <Badge className="border-current bg-secondary/70 text-current">{cell.role === "Faculty" ? "Teachers" : "Students"}</Badge>
                </div>
                <p className="mt-3 text-3xl font-bold">{cell.score.toFixed(1)}</p>
                <div className="mt-3 space-y-2 text-xs font-bold">
                  <div className="flex items-center justify-between">
                    <span>Login</span>
                    <span>{cell.login_frequency}%</span>
                  </div>
                  <ProgressBar value={cell.login_frequency} tone={bandToneClasses(cell.band)} />
                </div>
              </button>
            ))}
          </div>
          <div className="neo-inset mt-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={bandClasses(selected.band)}>{friendlyStatus(selected.band)} usage</Badge>
              <Badge className="border-line bg-secondary text-text/85">Mood {(selected.sentiment * 100).toFixed(0)}%</Badge>
            </div>
            <p className="mt-3 text-sm font-bold text-text">
              {selected.department} {selected.role === "Faculty" ? "teacher" : "student"} details
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Signal label="Tools used" value={selected.feature_depth} />
              <Signal label="Class discussion" value={selected.forum_participation} />
              <Signal label="Visits" value={selected.login_frequency} />
            </div>
            <p className="mt-3 text-sm text-text/75">{selected.negative_clusters.join("; ")}</p>
          </div>
        </Panel>

        <Panel id="process-debt" title="Slow Workflow Finder" eyebrow="Shows what is taking too long" icon={LineChartIcon}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtData} margin={{ left: -20, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.line} />
                <XAxis dataKey="workflow" tick={{ fontSize: 12, fill: CHART_COLORS.muted }} />
                <YAxis tick={{ fontSize: 12, fill: CHART_COLORS.muted }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} fill={CHART_COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {overview.process_debt.map((item) => (
              <ProcessDebtRow
                key={item.workflow}
                item={item}
                onCreatePlan={() => void handleWorkflowAction(item)}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel id="authority-map" title="Approval Path" eyebrow="See how approvals actually move" icon={Network}>
          <AuthorityMap overview={overview} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <KnowledgeContinuityPanel overview={overview} />
        <ChangeManagementPanel overview={overview} id="change-plan" />
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-muted">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <ProgressBar value={value} tone={value > 75 ? "bg-success" : value > 55 ? "bg-warning" : "bg-danger"} />
    </div>
  );
}

function ProcessDebtRow({ item, onCreatePlan }: { item: ProcessDebt; onCreatePlan: () => void }) {
  const isHealthy = item.status === "Green";
  return (
    <div className="neo-panel-soft p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-text">{item.workflow}</p>
          <p className="text-sm text-muted">{item.recommendations.join(" · ")}</p>
        </div>
        <Badge className={riskClasses(item.status)}>{friendlyStatus(item.status)}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={item.percentile} tone={item.status === "Red" ? "bg-danger" : item.status === "Amber" ? "bg-warning" : "bg-success"} />
        <span className="w-12 text-right text-sm font-bold text-text/85">{item.score.toFixed(1)}</span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
        <span>{item.steps} steps</span>
        <span>{item.revision_count} revisions</span>
        <span>{item.avg_approval_days} avg days</span>
      </div>
      {item.last_action ? (
        <p className="mt-2 text-xs text-muted">
          Last action: {item.last_action.action} by {item.last_action.actor}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onCreatePlan}
        className="neo-button mt-3 px-3 py-2"
      >
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
        {isHealthy ? "Monitor" : "Assign fix"}
      </button>
    </div>
  );
}

function AuthorityMap({ overview }: { overview: Overview }) {
  const normalSteps = [
    { id: "faculty", label: "Teacher", detail: "Starts request", icon: BookOpen, tone: "bg-primary" },
    { id: "hod", label: "Dept. Head", detail: "Reviews", icon: ShieldCheck, tone: "bg-warning" },
    { id: "committee", label: "Course Team", detail: "Checks quality", icon: Users, tone: "bg-success" },
    { id: "registrar", label: "Registrar", detail: "Approves", icon: BadgeCheck, tone: "bg-primary" },
    { id: "archive", label: "Records", detail: "Stores decision", icon: FileCheck2, tone: "bg-text" },
  ];

  return (
    <div className="space-y-4">
      <div className="neo-inset p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          {normalSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="relative">
                <div className="neo-panel-soft p-4">
                  <div className={clsx("mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-secondary", step.tone)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-base font-bold text-text">{step.label}</p>
                  <p className="mt-1 text-sm text-muted">{step.detail}</p>
                </div>
                {index < normalSteps.length - 1 ? (
                  <div className="hidden lg:block">
                    <div className="absolute left-[calc(100%-2px)] top-1/2 h-0.5 w-6 bg-line" />
                    <ChevronRight className="absolute -right-5 top-[calc(50%-10px)] h-5 w-5 text-muted/75" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="neo-status-danger mt-4 rounded-lg p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger text-secondary">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-text">Unexpected shortcut found</p>
              <p className="text-sm text-text/75">
                A few syllabus changes skipped the normal department review. The staff dashboard flags this before it becomes a habit.
              </p>
            </div>
            <Badge className="w-fit neo-status-danger">Needs review</Badge>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {overview.decision_map.anomalies.map((item) => (
          <div key={item} className="neo-status-danger rounded-lg p-3 text-sm font-bold">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentDashboard({ overview, onRefresh }: { overview: Overview; onRefresh: () => Promise<void> }) {
  const studentUser = overview.users.student;
  const pathway = overview.pathways[studentUser.id];
  const myEnrollments = overview.enrollments.filter((item) => item.student_id === studentUser.id);
  const myCourseIds = new Set(myEnrollments.map((item) => item.course_id));
  const myCourses = overview.courses.filter((course) => myCourseIds.has(course.id));
  const [chatCourse, setChatCourse] = useState(myCourses[0]?.id ?? overview.courses[0]?.id ?? "");
  const [chat, setChat] = useState<ChatMessage[]>(overview.chat_history[chatCourse] ?? []);
  const [draft, setDraft] = useState("Explain dynamic programming overlap in simple terms");
  const [sending, setSending] = useState(false);
  const [enrolling, setEnrolling] = useState("");
  const [verifyHash, setVerifyHash] = useState(overview.certificates[0]?.hash ?? "");
  const [verifyResult, setVerifyResult] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [courseDepartment, setCourseDepartment] = useState("All");
  const [showAllCourses, setShowAllCourses] = useState(false);
  const courseDepartments = useMemo(
    () => ["All", ...Array.from(new Set(overview.courses.map((course) => course.department))).sort()],
    [overview.courses],
  );
  const visibleCourses = useMemo(() => {
    const needle = courseQuery.trim().toLowerCase();
    return overview.courses.filter((course) => {
      const matchesDepartment = courseDepartment === "All" || course.department === courseDepartment;
      const matchesText =
        !needle ||
        `${course.code} ${course.title} ${course.description} ${course.skills.join(" ")}`
          .toLowerCase()
          .includes(needle);
      return matchesDepartment && matchesText;
    });
  }, [courseDepartment, courseQuery, overview.courses]);
  const displayedCourses = showAllCourses || courseQuery || courseDepartment !== "All" ? visibleCourses : visibleCourses.slice(0, 6);
  const completedScores = overview.gradebook.filter((item) => item.score !== null);
  const currentGrade = completedScores.length
    ? (
        completedScores.reduce((total, item) => total + ((item.score ?? 0) / item.max_score) * 10, 0) /
        completedScores.length
      ).toFixed(2)
    : "N/A";

  useEffect(() => {
    setChat(overview.chat_history[chatCourse] ?? []);
  }, [chatCourse, overview.chat_history]);

  async function handleEnroll(course: Course) {
    setEnrolling(course.id);
    setActionMessage("");
    try {
      const result = await enroll(course.id, studentUser.id) as { status?: string };
      await onRefresh();
      setActionMessage(result.status === "already_enrolled" ? `You are already in ${course.code}.` : `${course.code} has been added to your courses.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? "Enrollment could not be completed. Please try again." : "Enrollment could not be completed.");
    } finally {
      setEnrolling("");
    }
  }

  async function handleSend() {
    if (!draft.trim()) return;
    const question = draft.trim();
    setDraft("");
    setSending(true);
    setChat((current) => [...current, { role: "user", content: question, provider: "student" }]);
    try {
      const response = await sendTutorMessage(chatCourse, studentUser.id, question);
      setChat(response.history);
    } catch {
      setChat((current) => [
        ...current,
        {
          role: "assistant",
          content: "The course assistant is unavailable right now. Please try again in a moment.",
          provider: "local",
          mocked: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(hash = verifyHash) {
    setActionMessage("");
    setVerifyHash(hash);
    try {
      const result = await verifyCertificate(hash);
      setVerifyResult(result.verified ? `${result.status}: ${result.certificate?.course}` : "Certificate hash not found");
      setActionMessage(result.verified ? "Certificate verified successfully." : "No certificate was found for that ID.");
      if (result.verified) await onRefresh();
    } catch (err) {
      setVerifyResult(err instanceof Error ? err.message : "Verification failed");
      setActionMessage("Verification could not be completed.");
    }
  }

  return (
    <div className="space-y-5">
      <RoleIntro
        title="Student manages learning without hunting through menus"
        description="The student workspace keeps the core CMIS promise understandable: see progress, join courses, ask for course help, and verify completed learning."
        steps={["Check progress", "Register course", "Verify proof"]}
      />
      {actionMessage ? <Notice tone={actionMessage.includes("could not") || actionMessage.includes("No certificate") ? "warning" : "success"}>{actionMessage}</Notice> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Study Confidence" value={`${Math.round(pathway.mastery_probability * 100)}%`} delta={pathway.predicted_outcome} tone="blue" />
        <MetricCard label="Current Grade" value={currentGrade} delta={`${completedScores.length} graded`} tone="green" />
        <MetricCard label="Certificates" value={String(overview.certificates.length)} delta={`${overview.gamification.badges.length} badges`} tone="blue" />
      </div>

      <div className="grid gap-5">
        <Panel id="learning-path" title="Personal Study Plan" eyebrow="Simple next steps for the student" icon={BrainCircuit}>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              {pathway.skills.map((skill) => (
                <div key={skill.name}>
                  <div className="mb-1 flex justify-between text-sm font-bold text-text/75">
                    <span>{skill.name}</span>
                    <span>{skill.mastery}%</span>
                  </div>
                  <ProgressBar value={skill.mastery} tone={skill.mastery >= 70 ? "bg-success" : "bg-warning"} />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {pathway.next_steps.map((step) => (
                <div key={step.title} className="neo-panel-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-text">{step.title}</p>
                      <p className="text-sm text-muted">
                        {step.course} · {step.type} · {step.estimated_time}
                      </p>
                    </div>
                    <Badge className={riskClasses(step.priority)}>{step.priority}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-text/75">{step.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel id="ai-tutor" title="Ask AI Tutor" eyebrow="Course help in plain language" icon={Bot}>
          <div className="mb-3 flex items-center gap-2">
            <select
              value={chatCourse}
              onChange={(event) => setChatCourse(event.target.value)}
              className="neo-input px-3 py-2 text-sm font-bold text-text"
            >
              {myCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.title}
                </option>
              ))}
            </select>
            <Badge className={overview.system.groq_configured ? "neo-status-success" : "border-line bg-surface/70 text-text/85"}>
              {overview.system.groq_configured ? "AI ready" : "Local guide"}
            </Badge>
          </div>
          <div className="neo-inset thin-scrollbar h-72 space-y-3 overflow-y-auto p-3">
            {chat.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={clsx(
                  "max-w-[92%] rounded-lg px-3 py-2 text-sm shadow-neo-soft",
                  message.role === "user" ? "ml-auto bg-primary text-secondary" : "bg-secondary text-text/85",
                )}
              >
                {message.role === "user" ? <p>{message.content}</p> : <FormattedAiText content={message.content} />}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSend();
              }}
              className="neo-input min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => void handleSend()}
              disabled={sending}
              className="neo-button neo-button-primary px-4 py-2"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send
            </button>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel id="my-courses" title="Courses You Can Join" eyebrow="Browse, check seats, and enroll" icon={BookOpen}>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="neo-input flex items-center gap-2 px-3 py-2">
              <Search className="h-4 w-4 text-muted/75" aria-hidden="true" />
              <input
                value={courseQuery}
                onChange={(event) => setCourseQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:outline-none"
                placeholder="Find a course"
              />
            </div>
            <select
              value={courseDepartment}
              onChange={(event) => setCourseDepartment(event.target.value)}
              className="neo-input px-3 py-2 text-sm font-bold text-text"
              aria-label="Filter courses by department"
            >
              {courseDepartments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setCourseQuery("");
                setCourseDepartment("All");
                setShowAllCourses(false);
              }}
              className="neo-button px-3 py-2"
              disabled={!courseQuery && courseDepartment === "All" && !showAllCourses}
            >
              Reset
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {displayedCourses.map((course) => {
              const enrollment = myEnrollments.find((item) => item.course_id === course.id);
              return (
                <div key={course.id} className="neo-panel-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-text">{course.code} · {course.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {course.department} · {course.term} · {course.credits} credits · {course.faculty.join(", ")}
                      </p>
                    </div>
                    <Badge className={enrollment ? riskClasses(enrollment.status) : "border-line bg-surface/70 text-text/85"}>
                      {enrollment ? friendlyStatus(enrollment.status) : "Open"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-text/75">{course.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {course.skills.map((skill) => (
                      <Badge key={skill} className="border-line bg-surface/70 text-text/85">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
                    <span>Prereq: {course.prerequisites.length ? course.prerequisites.join(", ") : "Open"}</span>
                    <span>Avg grade {course.average_grade}</span>
                    <span>Usage {course.adoption}%</span>
                  </div>
                  {enrollment ? (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs font-bold text-muted">
                        <span>Course progress</span>
                        <span>{enrollment.progress}%</span>
                      </div>
                      <ProgressBar value={enrollment.progress} tone={enrollment.deadline_risk === "Medium" ? "bg-warning" : "bg-success"} />
                    </div>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted">
                      {Math.max(course.capacity - course.enrolled, 0)} seats open · {course.waitlist} waiting
                    </p>
                    <button
                      disabled={Boolean(enrollment) || enrolling === course.id}
                      onClick={() => void handleEnroll(course)}
                      className="neo-button px-3 py-2"
                    >
                      {enrollment ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {enrollment ? "Joined" : enrolling === course.id ? "Joining" : "Join Course"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {!visibleCourses.length ? (
            <div className="neo-empty mt-4 p-8 text-center text-sm font-bold text-muted">
              No courses match that filter.
            </div>
          ) : null}
          {visibleCourses.length > displayedCourses.length ? (
            <div className="neo-inset mt-4 flex items-center justify-between px-4 py-3 text-sm text-text/75">
              <span>Showing {displayedCourses.length} of {visibleCourses.length} courses.</span>
              <button
                type="button"
                onClick={() => setShowAllCourses(true)}
                className="font-bold text-text hover:underline"
              >
                Show all courses
              </button>
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-5">
        <GamificationPanel overview={overview} />
        <Panel id="credentials" title="Certificates" eyebrow="Proof of completed learning" icon={WalletCards}>
          <div className="space-y-3">
            {overview.certificates.map((certificate) => (
              <div key={certificate.id} className="neo-panel-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-text">{certificate.course}</p>
                    <p className="text-sm text-muted">
                      {friendlyCertificateSource(certificate.chain)} · {certificate.issued_at}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge className={riskClasses(certificate.status)}>{friendlyStatus(certificate.status)}</Badge>
                    <button
                      type="button"
                      onClick={() => void handleVerify(certificate.hash)}
                      className="neo-button px-3 py-1.5 text-xs"
                    >
                      Check
                    </button>
                  </div>
                </div>
                <p className="mt-3 font-label text-xs font-bold uppercase tracking-normal text-muted/75">Certificate ID</p>
                <p className="mt-1 break-all rounded-lg bg-surface/70 p-2 text-xs text-text/75">{certificate.hash}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="border-line bg-surface/70 text-text/85">Grade {certificate.grade}</Badge>
                  {certificate.badges.map((badge) => (
                    <Badge key={badge} className="neo-status-info">{badge}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={verifyHash}
              onChange={(event) => setVerifyHash(event.target.value)}
              className="neo-input min-w-0 flex-1 px-3 py-2 text-sm"
              placeholder="Paste certificate ID"
            />
            <button onClick={() => void handleVerify()} className="neo-button neo-button-primary px-4 py-2">
              Verify
            </button>
          </div>
          {verifyResult ? <p className="mt-3 text-sm font-bold text-text/85">{verifyResult}</p> : null}
        </Panel>
      </div>
    </div>
  );
}

function FacultyDashboard({ overview, onRefresh }: { overview: Overview; onRefresh: () => Promise<void> }) {
  const facultyUser = overview.users.faculty;
  const [suggestion, setSuggestion] = useState<Record<string, string>>({});
  const [working, setWorking] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const activeCourses = overview.courses.filter((course) => course.faculty_ids?.includes(facultyUser.id));
  const gradingQueue = overview.submissions.filter((submission) => submission.status !== "Graded");
  const facultyHeatmap = overview.heatmap.filter((cell) => cell.role === "Faculty");
  const assessmentsById = useMemo(
    () => new Map(overview.assessments.map((assessment) => [assessment.id, assessment])),
    [overview.assessments],
  );

  async function handleSuggest(submissionId: string) {
    setWorking(submissionId);
    setActionMessage("");
    try {
      const result = await suggestGrade(submissionId, facultyUser.id);
      setSuggestion((current) => ({ ...current, [submissionId]: result.suggestion }));
      setActionMessage("AI suggestion is ready for teacher review.");
    } catch {
      setSuggestion((current) => ({
        ...current,
        [submissionId]: "**Suggested score:** 86\n\n### Feedback\n- Strong rubric alignment.\n- Add one edge-case test.\n- Clarify the complexity explanation.",
      }));
      setActionMessage("AI service is unavailable, so a local rubric suggestion was prepared.");
    } finally {
      setWorking("");
    }
  }

  async function handleApply(submissionId: string) {
    const feedback = suggestion[submissionId] ?? "Reviewed against the rubric.";
    setWorking(submissionId);
    setActionMessage("");
    try {
      await applyGrade(submissionId, extractSuggestedScore(feedback), feedback, facultyUser.id);
      await onRefresh();
      setActionMessage("Grade saved and the review queue was updated.");
    } catch {
      setActionMessage("Grade could not be saved. Please try again.");
    } finally {
      setWorking("");
    }
  }

  return (
    <div className="space-y-5">
      <RoleIntro
        title="Teacher focuses on classes, submissions, and course quality"
        description="This keeps AI support explainable: the system drafts feedback, but the teacher reviews and saves the final grade."
        steps={["View classes", "Review work", "Improve syllabus"]}
      />
      {actionMessage ? <Notice tone={actionMessage.includes("could not") || actionMessage.includes("unavailable") ? "warning" : "success"}>{actionMessage}</Notice> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="My Classes" value={String(activeCourses.length)} delta="Monsoon 2026" tone="blue" />
        <MetricCard label="Work To Review" value={String(gradingQueue.length)} delta="AI ready" tone="amber" />
        <MetricCard label="Dashboard Use" value={`${Math.round(facultyHeatmap.reduce((sum, cell) => sum + cell.feature_depth, 0) / Math.max(facultyHeatmap.length, 1))}%`} delta={`${facultyHeatmap.length} departments`} tone="green" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr_1fr]">
        <Panel id="course-studio" title="Classes I Teach" eyebrow="Quick view for the teacher" icon={BookOpen}>
          <div className="grid gap-3 lg:grid-cols-2">
            {activeCourses.map((course) => (
              <div key={course.id} className="neo-panel-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-text">{course.code} · {course.title}</p>
                    <p className="text-sm text-muted">{course.enrolled} students · avg GPA {course.average_grade}</p>
                  </div>
                  <Badge className="neo-status-success">{course.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-text/75">{course.description}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs font-bold text-muted">
                    <span>Engagement</span>
                    <span>{course.adoption}%</span>
                  </div>
                  <ProgressBar value={course.adoption} tone="bg-primary" />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
                  <span>{course.term}</span>
                  <span>{course.waitlist} waitlisted</span>
                  <span>{course.skills.join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel id="grading-queue" title="Student Work Review" eyebrow="AI can suggest feedback, teacher stays in control" icon={Sparkles}>
          <div className="space-y-3">
            {gradingQueue.map((submission) => {
              const assessment = assessmentsById.get(submission.assessment_id);

              return (
                <div key={submission.id} className="neo-panel-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-text">{submission.student_name}</p>
                      <p className="text-sm text-muted">
                        {courseCodeFor(overview, submission.course_id)} · {formatTime(submission.submitted_at)} · originality {(100 - submission.similarity_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <Badge className={riskClasses(submission.status)}>{friendlyStatus(submission.status)}</Badge>
                  </div>
                  {assessment ? (
                    <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
                      <span>{assessment.title}</span>
                      <span>{assessment.type} · {assessment.weight}%</span>
                      <span>Due {assessment.due_date} · {assessment.max_score} pts</span>
                    </div>
                  ) : null}
                  <p className="mt-3 text-sm text-text/75">{submission.text}</p>
                  {assessment ? <p className="mt-2 text-xs text-muted">Rubric: {assessment.rubric}</p> : null}
                  {suggestion[submission.id] ? (
                    <div className="neo-inset mt-3 p-3 text-sm text-text">
                      <FormattedAiText content={suggestion[submission.id]} />
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleSuggest(submission.id)}
                      disabled={working === submission.id}
                      className="neo-button px-3 py-2"
                    >
                      <Bot className="h-4 w-4" aria-hidden="true" />
                      Draft Feedback
                    </button>
                    <button
                      onClick={() => void handleApply(submission.id)}
                      disabled={working === submission.id || !suggestion[submission.id]}
                      className="neo-button neo-button-primary px-3 py-2"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Save Suggested Grade
                    </button>
                  </div>
                </div>
              );
            })}
            {!gradingQueue.length ? (
              <div className="neo-empty p-8 text-center text-sm font-bold text-muted">
                All submitted work has been reviewed.
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5">
        <SkillGapPanel overview={overview} id="curriculum-gaps" />
      </div>
    </div>
  );
}

function SkillGapPanel({ overview, id }: { overview: Overview; id?: string }) {
  return (
    <Panel id={id} title="What Graduates Say Is Missing" eyebrow="Helps teachers improve courses" icon={GitBranch}>
      <div className="space-y-3">
        {overview.alumni_skill_gaps.map((gap) => (
          <div key={gap.skill} className="neo-panel-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-text">{gap.skill}</p>
                <p className="text-sm text-muted">{gap.affected_courses.join(", ")}</p>
              </div>
              <Badge className={gap.gap_score > 40 ? "neo-status-danger" : "neo-status-warning"}>
                Missing {gap.gap_score}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Signal label="Demand" value={gap.demand_score} />
              <Signal label="Coverage" value={gap.curriculum_coverage} />
            </div>
            <p className="mt-3 text-sm text-text/75">{gap.suggestion}</p>
            <p className="mt-2 font-label text-xs font-bold uppercase tracking-normal text-muted">{gap.faculty_response}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function KnowledgeContinuityPanel({ overview }: { overview: Overview }) {
  return (
    <Panel id="knowledge-risk" title="Knowledge Continuity" eyebrow="Courses that need teaching backup" icon={AlertTriangle}>
      <div className="space-y-3">
        {overview.knowledge_continuity.map((item) => (
          <div key={item.course} className="neo-panel-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-text">{item.course}</p>
                <p className="text-sm text-muted">
                  {item.department} · {item.faculty} · {item.sole_instructor_terms} sole-instructor terms
                </p>
              </div>
              <Badge className={riskClasses(item.severity)}>{item.severity}</Badge>
            </div>
            <div className="mt-3">
              <Signal label="Continuity risk" value={item.risk_score} />
            </div>
            <p className="mt-3 text-sm text-text/75">Retirement window: {item.retirement_window}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.suggestions.map((suggestion) => (
                <Badge key={suggestion} className="neo-status-warning">{suggestion}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function GamificationPanel({ overview }: { overview: Overview }) {
  const rewards = overview.gamification;
  const progress = Math.round((rewards.xp / rewards.next_level_xp) * 100);

  return (
    <Panel id="learning-rewards" title="Learning Rewards" eyebrow="Participation, badges, and perks" icon={WalletCards}>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="neo-panel-soft p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Level {rewards.level}</p>
              <p className="text-3xl font-bold text-text">{rewards.xp} XP</p>
            </div>
            <Badge className="neo-status-info">Rank #{rewards.rank}</Badge>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-bold text-muted">
              <span>Next level</span>
              <span>{rewards.next_level_xp - rewards.xp} XP left</span>
            </div>
            <ProgressBar value={progress} tone="bg-primary" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {rewards.badges.map((badge) => (
              <Badge key={badge} className="neo-status-success">{badge}</Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="neo-panel-soft p-4">
            <p className="font-bold text-text">Recent XP</p>
            <div className="mt-3 space-y-2">
              {rewards.wallet_events.map((event) => (
                <div key={`${event.label}-${event.date}`} className="flex justify-between gap-3 text-sm">
                  <span className="text-text/75">{event.label}</span>
                  <span className="font-bold text-text">+{event.xp}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="neo-panel-soft p-4">
            <p className="font-bold text-text">Perks</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {rewards.redeemable_perks.map((perk) => (
                <Badge key={perk} className="border-line bg-surface/70 text-text/85">{perk}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ChangeManagementPanel({ overview, id }: { overview: Overview; id?: string }) {
  return (
    <Panel id={id} title="Change Management Console" eyebrow={overview.change_management.framework} icon={Users}>
      <div className="grid gap-3">
        {overview.change_management.rollout.map((stage) => (
          <div key={stage.stage} className="neo-panel-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-text">{stage.stage}</p>
              <Badge className={riskClasses(stage.status)}>{stage.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-text/75">{stage.details}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {overview.change_management.champions.map((champion) => (
          <div key={champion.name} className="neo-panel-soft p-3">
            <p className="font-bold text-text">{champion.name}</p>
            <p className="text-sm text-muted">{champion.department}</p>
            <p className="mt-2 text-sm text-text/75">{champion.impact}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {overview.change_management.training_sessions.map((session) => (
          <div key={session.title} className="neo-panel-soft flex items-center justify-between gap-3 p-3">
            <div>
              <p className="font-bold text-text">{session.title}</p>
              <p className="text-sm text-muted">{session.date} · {session.attendance} attendees</p>
            </div>
            <Badge className={riskClasses(session.status)}>{session.status}</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AuditPanel({ overview, id = "audit-trail" }: { overview: Overview; id?: string }) {
  return (
    <Panel id={id} title="Privacy Activity Log" eyebrow="Who did what, and when" icon={FileCheck2}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="font-label text-xs uppercase tracking-normal text-muted">
              <th className="border-b border-line px-3 py-2">Time</th>
              <th className="border-b border-line px-3 py-2">Actor</th>
              <th className="border-b border-line px-3 py-2">Role</th>
              <th className="border-b border-line px-3 py-2">Action</th>
              <th className="border-b border-line px-3 py-2">Risk</th>
            </tr>
          </thead>
          <tbody>
            {overview.audit_log.slice(0, 8).map((event) => (
              <tr key={`${event.timestamp}-${event.action}`}>
                <td className="border-b border-line px-3 py-3 text-muted">{formatTime(event.timestamp)}</td>
                <td className="border-b border-line px-3 py-3 font-bold text-text">{event.actor}</td>
                <td className="border-b border-line px-3 py-3 text-text/75">{event.role}</td>
                <td className="border-b border-line px-3 py-3 text-text/75">{event.action}</td>
                <td className="border-b border-line px-3 py-3">
                  <Badge className={riskClasses(event.risk)}>{event.risk}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ITDashboard({ overview, apiState }: { overview: Overview; apiState: "loading" | "live" | "offline" }) {
  const areaData = overview.capacity_monitor;

  return (
    <div className="space-y-5">
      <RoleIntro
        title="IT Support keeps the CMIS reliable and private"
        description="The IT view is intentionally practical: confirm the app is running, check API coverage, show privacy controls, and review the audit trail."
        steps={["Check health", "Confirm APIs", "Review audit"]}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="API State" value={apiState} delta={API_BASE.replace("http://", "")} tone="green" />
        <MetricCard label="Groq Model" value="Ready" delta={overview.system.groq_model} tone="blue" />
        <MetricCard label="Cost" value="$0" delta="local only" tone="green" />
        <MetricCard label="Privacy" value="RBAC" delta={`${overview.audit_log.length} audit events`} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel id="local-stack" title="Free-Tier Dependency Map" eyebrow="Zero-cost strategy" icon={Database}>
          <div className="space-y-3">
            {overview.free_tier_stack.map((item) => (
              <div key={item.service} className="neo-panel-soft grid gap-3 p-4 sm:grid-cols-[0.8fr_1.1fr_0.7fr_1fr]">
                <p className="font-bold text-text">{item.service}</p>
                <p className="text-sm text-text/75">{item.provider}</p>
                <Badge className="w-fit border-line bg-surface/70 text-text/85">{item.status}</Badge>
                <p className="text-sm text-muted">{item.limit}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel id="capacity-monitor" title="Local Capacity Monitor" eyebrow="Operational telemetry" icon={Activity}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ left: -20, right: 20 }}>
                <defs>
                  <linearGradient id="storage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.line} />
                <XAxis dataKey="month" tick={{ fill: CHART_COLORS.muted }} />
                <YAxis tick={{ fill: CHART_COLORS.muted }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="storage" stroke={CHART_COLORS.primary} fill="url(#storage)" />
                <Line type="monotone" dataKey="requests" stroke={CHART_COLORS.success} strokeWidth={3} />
                <Line type="monotone" dataKey="latency" stroke={CHART_COLORS.warning} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
            <span>{areaData.at(-1)?.requests ?? 0}k monthly requests</span>
            <span>{areaData.at(-1)?.errors ?? 0} reported errors this month</span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel id="api-surface" title="API Surface" eyebrow="Endpoint inventory" icon={GitBranch}>
          <div className="grid gap-2">
            {overview.api_endpoints.map((endpoint) => (
              <div key={endpoint} className="neo-inset px-3 py-2 font-mono text-xs text-text/85">
                {endpoint}
              </div>
            ))}
          </div>
        </Panel>

        <Panel id="privacy" title="Privacy & Compliance Posture" eyebrow="FERPA / GDPR controls" icon={LockKeyhole}>
          <div className="grid gap-3">
            {overview.privacy_controls.map((item) => (
              <div key={item.title} className="neo-panel-soft flex gap-3 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
                <div>
                  <p className="font-bold text-text">{item.title}</p>
                  <p className="text-sm text-text/75">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <AuditPanel overview={overview} />
    </div>
  );
}
