"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
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
  CircleDollarSign,
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
  sendTutorMessage,
  suggestGrade,
  verifyCertificate,
} from "@/lib/api";
import { localOverview } from "@/lib/mock";

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
  ],
  student: [
    { label: "My Progress", icon: BrainCircuit, id: "learning-path" },
    { label: "Course Registration", icon: BookOpen, id: "my-courses" },
    { label: "Course Help", icon: Bot, id: "ai-tutor" },
    { label: "Certificates", icon: BadgeCheck, id: "credentials" },
  ],
  faculty: [
    { label: "My Classes", icon: BookOpen, id: "course-studio" },
    { label: "Review Work", icon: ClipboardCheck, id: "grading-queue" },
    { label: "Course Improvements", icon: GitBranch, id: "curriculum-gaps" },
  ],
  it: [
    { label: "System Health", icon: Database, id: "local-stack" },
    { label: "API Checklist", icon: GitBranch, id: "api-surface" },
    { label: "Privacy", icon: LockKeyhole, id: "privacy" },
    { label: "Audit Trail", icon: FileCheck2, id: "audit-trail" },
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

function bandClasses(band: string) {
  if (band === "High") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (band === "Moderate") return "border-sky-200 bg-sky-50 text-sky-800";
  if (band === "Low") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function riskClasses(value: string) {
  if (["Green", "Low", "Verified", "Complete"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["Amber", "Medium", "Scheduled", "Tamper-evident"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["Red", "High", "Critical"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function toneClasses(tone: string) {
  if (tone === "green") return "from-emerald-500 to-teal-500";
  if (tone === "blue") return "from-sky-500 to-cyan-500";
  if (tone === "amber") return "from-amber-500 to-orange-500";
  return "from-slate-500 to-slate-600";
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
    <section id={id} className={clsx("scroll-mt-24 rounded-lg border border-line bg-white p-5 shadow-panel", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p> : null}
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            {Icon ? <Icon className="h-5 w-5 text-sky-600" aria-hidden="true" /> : null}
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
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

function ProgressBar({ value, tone = "bg-sky-500" }: { value: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={clsx("h-full rounded-full", tone)} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

function Notice({ tone = "success", children }: { tone?: "success" | "warning" | "info"; children: React.ReactNode }) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  };
  return <div className={clsx("rounded-lg border px-3 py-2 text-sm font-medium", styles[tone])}>{children}</div>;
}

function RoleIntro({ title, description, steps }: { title: string; description: string; steps: string[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What this role does</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
          {steps.map((step, index) => (
            <div key={step} className="rounded-lg border border-line bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Step {index + 1}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/70 bg-white/92 p-4 shadow-panel">
      <div className={clsx("absolute right-0 top-0 h-16 w-20 rounded-bl-[48px] bg-gradient-to-br opacity-16", toneClasses(tone))} />
      <div className={clsx("mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r", toneClasses(tone))} />
      <p className="text-sm font-medium text-slate-500">{friendlyMetricLabel(label)}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold text-ink">{value}</p>
        <Badge className="border-slate-200 bg-slate-50 text-slate-700">{delta}</Badge>
      </div>
    </div>
  );
}

function renderInlineMarkdown(text: string, inverse = false) {
  const chunks = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return chunks.map((chunk, index) => {
    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return (
        <code
          key={`${chunk}-${index}`}
          className={clsx("rounded border px-1.5 py-0.5 font-mono text-[0.86em]", inverse ? "border-white/25 bg-white/10" : "border-slate-200 bg-slate-100 text-slate-800")}
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={`${chunk}-${index}`} className={inverse ? "font-semibold text-white" : "font-semibold text-ink"}>
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
}

function FormattedAiText({ content, inverse = false }: { content: string; inverse?: boolean }) {
  const normalized = content.replace(/\r/g, "").trim();
  const lines = normalized.split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index];
    const line = raw.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (/^[=-]{3,}$/.test(line)) {
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && /^[=-]{3,}$/.test(lines[index + 1].trim())) {
      blocks.push(
        <p key={`setext-heading-${index}`} className={clsx("text-sm font-semibold", inverse ? "text-white" : "text-ink")}>
          {renderInlineMarkdown(line.replace(/^\*\*|\*\*$/g, ""), inverse)}
        </p>,
      );
      index += 2;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${index}`} className={clsx("overflow-x-auto rounded-lg p-3 text-xs", inverse ? "bg-white/10 text-white" : "bg-slate-100 text-slate-800")}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      blocks.push(
        <p key={`heading-${index}`} className={clsx("text-sm font-semibold", inverse ? "text-white" : "text-ink")}>
          {renderInlineMarkdown(heading[1], inverse)}
        </p>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className={clsx("space-y-1 pl-4", inverse ? "text-white/90" : "text-slate-700")}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="list-disc">
              {renderInlineMarkdown(item, inverse)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className={clsx("space-y-1 pl-4", inverse ? "text-white/90" : "text-slate-700")}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="list-decimal">
              {renderInlineMarkdown(item, inverse)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const labeled =
      line.match(/^\*\*([A-Za-z ]{3,24}):\*\*\s*(.+)$/) ??
      line.match(/^\*\*([A-Za-z ]{3,24})\*\*:\s*(.+)$/) ??
      line.match(/^([A-Za-z ]{3,24}):\s*(.+)$/);
    if (labeled) {
      blocks.push(
        <div key={`label-${index}`} className={clsx("rounded-lg border px-3 py-2", inverse ? "border-white/20 bg-white/10" : "border-slate-200 bg-slate-50")}>
          <span className={clsx("text-xs font-semibold uppercase tracking-[0.12em]", inverse ? "text-white/70" : "text-slate-500")}>{labeled[1]}</span>
          <p className={clsx("mt-1", inverse ? "text-white" : "text-slate-700")}>{renderInlineMarkdown(labeled[2], inverse)}</p>
        </div>,
      );
      index += 1;
      continue;
    }

    blocks.push(
      <p key={`p-${index}`} className={inverse ? "text-white/90" : "text-slate-700"}>
        {renderInlineMarkdown(line, inverse)}
      </p>,
    );
    index += 1;
  }

  return <div className="space-y-2 leading-6">{blocks}</div>;
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
          "flex h-11 items-center gap-2 rounded-lg border bg-white/95 px-3 shadow-sm transition",
          open ? "border-slate-300 shadow-panel" : "border-line hover:border-slate-300",
        )}
      >
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
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
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-slate-400 focus-visible:outline-none"
          placeholder="Search courses, people, certificates"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <Command className="h-4 w-4 text-slate-300" aria-hidden="true" />
        )}
      </div>

      {open ? (
        <div
          className="absolute left-0 right-0 top-[3.25rem] z-50 overflow-hidden rounded-lg border border-line bg-white shadow-panel"
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
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                      <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-8 text-center text-sm text-slate-500">No matching record</div>
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
    <main className="min-h-screen">
      <header className="border-b border-line bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-ink sm:text-lg">CMIS Course Management</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Course Management Information System</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                apiState === "live"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : apiState === "loading"
                    ? "border-sky-200 bg-sky-50 text-sky-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }
            >
              System {apiState === "live" ? "online" : apiState === "offline" ? "offline demo" : "checking"}
            </Badge>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Refresh campus data"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1380px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-panel xl:sticky xl:top-5 xl:h-fit">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Select workspace</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Campus Course Hub</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Role-based access for registration, teaching review, academic operations, privacy, and campus workflow tracking.
          </p>

          <div className="mt-5 divide-y divide-line rounded-lg border border-line bg-slate-50">
            {proofPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.label} className="flex items-center gap-3 px-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{point.value}</span>
                    <span className="block text-xs text-slate-500">{point.label}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">Persistent records</Badge>
            <Badge className={overview.system.groq_configured ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}>
              AI {overview.system.groq_configured ? "ready" : "local"}
            </Badge>
          </div>
          {error ? <p className="mt-3 text-xs leading-5 text-amber-700">Using local demo data: {error.slice(0, 120)}</p> : null}
        </section>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Available logins</p>
              <h2 className="text-2xl font-semibold text-ink">Choose your role</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const person = overview.users[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onSelectRole(option.key)}
                  className="group rounded-lg border border-line bg-white p-5 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-ink group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <Badge className="border-slate-200 bg-slate-50 text-slate-700">{person.avatar}</Badge>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-ink">{option.loginTitle}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{person.name} · {person.department}</p>
                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600 md:min-h-[72px] xl:min-h-[48px]">{option.description}</p>
                  <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm font-semibold text-ink">
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

export default function Home() {
  const [overview, setOverview] = useState<Overview>(localOverview);
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
      setOverview(localOverview);
      setApiState("offline");
      setError(err instanceof Error ? err.message : "API unavailable");
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

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
          scrollToSection(navByRole[nextRole][0].id);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-ink sm:text-lg">CMIS Course Management</h1>
              <p className="hidden text-xs text-slate-500 sm:block">{roleOptions.find((option) => option.key === role)?.label} workspace</p>
            </div>
          </div>

          <GlobalSearch items={searchItems} onSelect={jumpTo} />

          <div className="flex items-center gap-2">
            <Badge
              className={
                apiState === "live"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : apiState === "loading"
                    ? "border-sky-200 bg-sky-50 text-sky-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }
            >
              System {apiState === "live" ? "online" : apiState === "offline" ? "offline" : "checking"}
            </Badge>
            <Badge className={overview.system.groq_configured ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}>
              AI {overview.system.groq_configured ? "ready" : "local"}
            </Badge>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-slate-600 hover:bg-slate-50"
              onClick={() => void refreshData()}
              aria-label="Refresh campus data"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setRole(null)}
            >
              Change login
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1380px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-line bg-white/94 p-4 shadow-panel xl:sticky xl:top-[96px] xl:h-fit">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-emerald-500 to-amber-400 text-sm font-bold text-white shadow-sm">
              {user.avatar}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{user.name}</p>
              <p className="truncate text-sm text-slate-500">{friendlyRoleLabel(user.role)} · {user.department}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Role purpose</p>
            <p className="mt-1 text-sm text-sky-900">{roleOptions.find((option) => option.key === role)?.demoPitch}</p>
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Jump to</p>
          <nav className="mt-2 space-y-1">
            {navByRole[activeRole].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
                >
                  <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {error ? <p className="mt-4 text-xs text-amber-700">Local service unavailable: {error.slice(0, 110)}</p> : null}
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

  return (
    <div className="space-y-5">
      {actionMessage ? <Notice>{actionMessage}</Notice> : null}
      <RoleIntro
        title="Registrar checks whether the institution is running smoothly"
        description="This dashboard turns the PRD's organizational transformation idea into a simple story: course operations, adoption, approvals, and delays are visible in one place."
        steps={["Review campus health", "Find slow workflows", "Assign an owner"]}
      />
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
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700"
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
                  "rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-panel",
                  bandClasses(cell.band),
                  selected.department === cell.department && selected.role === cell.role ? "ring-2 ring-ink/20" : "",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{cell.department}</p>
                  <Badge className="border-current bg-white/60 text-current">{cell.role === "Faculty" ? "Teachers" : "Students"}</Badge>
                </div>
                <p className="mt-3 text-3xl font-semibold">{cell.score.toFixed(1)}</p>
                <div className="mt-3 space-y-2 text-xs font-medium">
                  <div className="flex items-center justify-between">
                    <span>Login</span>
                    <span>{cell.login_frequency}%</span>
                  </div>
                  <ProgressBar value={cell.login_frequency} tone="bg-current" />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={bandClasses(selected.band)}>{friendlyStatus(selected.band)} usage</Badge>
              <Badge className="border-slate-200 bg-white text-slate-700">Mood {(selected.sentiment * 100).toFixed(0)}%</Badge>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">
              {selected.department} {selected.role === "Faculty" ? "teacher" : "student"} details
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Signal label="Tools used" value={selected.feature_depth} />
              <Signal label="Class discussion" value={selected.forum_participation} />
              <Signal label="Visits" value={selected.login_frequency} />
            </div>
            <p className="mt-3 text-sm text-slate-600">{selected.negative_clusters.join("; ")}</p>
          </div>
        </Panel>

        <Panel id="process-debt" title="Slow Workflow Finder" eyebrow="Shows what is taking too long" icon={LineChartIcon}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtData} margin={{ left: -20, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="workflow" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {overview.process_debt.map((item) => (
              <ProcessDebtRow
                key={item.workflow}
                item={item}
                onCreatePlan={() =>
                  setActionMessage(
                    item.status === "Green"
                      ? `${item.workflow}: monitoring note saved for the next weekly check.`
                      : `${item.workflow}: owner assigned and a follow-up check was added for this week.`,
                  )
                }
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
    </div>
  );
}

function Signal({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <ProgressBar value={value} tone={value > 75 ? "bg-emerald-500" : value > 55 ? "bg-amber-500" : "bg-rose-500"} />
    </div>
  );
}

function ProcessDebtRow({ item, onCreatePlan }: { item: ProcessDebt; onCreatePlan: () => void }) {
  const isHealthy = item.status === "Green";
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{item.workflow}</p>
          <p className="text-sm text-slate-500">{item.recommendations.join(" · ")}</p>
        </div>
        <Badge className={riskClasses(item.status)}>{friendlyStatus(item.status)}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={item.percentile} tone={item.status === "Red" ? "bg-rose-500" : item.status === "Amber" ? "bg-amber-500" : "bg-emerald-500"} />
        <span className="w-12 text-right text-sm font-semibold text-slate-700">{item.score.toFixed(1)}</span>
      </div>
      <button
        type="button"
        onClick={onCreatePlan}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        {isHealthy ? "Monitor" : "Assign fix"}
      </button>
    </div>
  );
}

function AuthorityMap({ overview }: { overview: Overview }) {
  const normalSteps = [
    { id: "faculty", label: "Teacher", detail: "Starts request", icon: BookOpen, tone: "bg-sky-500" },
    { id: "hod", label: "Dept. Head", detail: "Reviews", icon: ShieldCheck, tone: "bg-amber-500" },
    { id: "committee", label: "Course Team", detail: "Checks quality", icon: Users, tone: "bg-emerald-500" },
    { id: "registrar", label: "Registrar", detail: "Approves", icon: BadgeCheck, tone: "bg-cyan-500" },
    { id: "archive", label: "Records", detail: "Stores decision", icon: FileCheck2, tone: "bg-slate-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-gradient-to-br from-slate-50 to-sky-50/70 p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          {normalSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="relative">
                <div className="rounded-lg border border-white/70 bg-white p-4 shadow-sm">
                  <div className={clsx("mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white", step.tone)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-base font-semibold text-ink">{step.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
                </div>
                {index < normalSteps.length - 1 ? (
                  <div className="hidden lg:block">
                    <div className="absolute left-[calc(100%-2px)] top-1/2 h-0.5 w-6 bg-slate-300" />
                    <ChevronRight className="absolute -right-5 top-[calc(50%-10px)] h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-rose-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-rose-900">Unexpected shortcut found</p>
              <p className="text-sm text-rose-700">
                A few syllabus changes skipped the normal department review. The staff dashboard flags this before it becomes a habit.
              </p>
            </div>
            <Badge className="w-fit border-rose-200 bg-rose-50 text-rose-800">Needs review</Badge>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {overview.decision_map.anomalies.map((item) => (
          <div key={item} className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentDashboard({ overview, onRefresh }: { overview: Overview; onRefresh: () => Promise<void> }) {
  const pathway = overview.pathways["stu-aarav"];
  const myEnrollments = overview.enrollments.filter((item) => item.student_id === "stu-aarav");
  const myCourseIds = new Set(myEnrollments.map((item) => item.course_id));
  const myCourses = overview.courses.filter((course) => myCourseIds.has(course.id));
  const [chatCourse, setChatCourse] = useState(myCourses[0]?.id ?? overview.courses[0]?.id ?? "cs201");
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

  useEffect(() => {
    setChat(overview.chat_history[chatCourse] ?? []);
  }, [chatCourse, overview.chat_history]);

  async function handleEnroll(course: Course) {
    setEnrolling(course.id);
    setActionMessage("");
    try {
      const result = await enroll(course.id) as { status?: string };
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
      const response = await sendTutorMessage(chatCourse, question);
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
    } catch (err) {
      setVerifyResult(err instanceof Error ? err.message : "Verification failed");
      setActionMessage("Verification could not be completed.");
    }
  }

  return (
    <div className="space-y-5">
      {actionMessage ? <Notice tone={actionMessage.includes("could not") || actionMessage.includes("No certificate") ? "warning" : "success"}>{actionMessage}</Notice> : null}
      <RoleIntro
        title="Student manages learning without hunting through menus"
        description="The student workspace keeps the core CMIS promise understandable: see progress, join courses, ask for course help, and verify completed learning."
        steps={["Check progress", "Register course", "Verify proof"]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Study Confidence" value={`${Math.round(pathway.mastery_probability * 100)}%`} delta={pathway.predicted_outcome} tone="blue" />
        <MetricCard label="Current Grade" value="8.42" delta="+0.21" tone="green" />
        <MetricCard label="Certificates" value={String(overview.certificates.length)} delta="ready to share" tone="blue" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <Panel id="learning-path" title="Personal Study Plan" eyebrow="Simple next steps for the student" icon={BrainCircuit}>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              {pathway.skills.map((skill) => (
                <div key={skill.name}>
                  <div className="mb-1 flex justify-between text-sm font-semibold text-slate-600">
                    <span>{skill.name}</span>
                    <span>{skill.mastery}%</span>
                  </div>
                  <ProgressBar value={skill.mastery} tone={skill.mastery >= 70 ? "bg-emerald-500" : "bg-amber-500"} />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {pathway.next_steps.map((step) => (
                <div key={step.title} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{step.title}</p>
                      <p className="text-sm text-slate-500">
                        {step.course} · {step.type} · {step.estimated_time}
                      </p>
                    </div>
                    <Badge className={riskClasses(step.priority)}>{step.priority}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{step.reason}</p>
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
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              {myCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.title}
                </option>
              ))}
            </select>
            <Badge className={overview.system.groq_configured ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}>
              {overview.system.groq_configured ? "AI ready" : "Local guide"}
            </Badge>
          </div>
          <div className="thin-scrollbar h-72 space-y-3 overflow-y-auto rounded-lg border border-line bg-slate-50 p-3">
            {chat.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={clsx(
                  "max-w-[92%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user" ? "ml-auto bg-ink text-white" : "bg-white text-slate-700",
                )}
              >
                {message.role === "user" ? <p>{message.content}</p> : <FormattedAiText content={message.content} />}
                {message.role !== "user" ? <p className="mt-1 text-[11px] opacity-70">AI response</p> : null}
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
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => void handleSend()}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
            <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
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
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700"
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
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!courseQuery && courseDepartment === "All" && !showAllCourses}
            >
              Reset
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {displayedCourses.map((course) => {
              const enrollment = myEnrollments.find((item) => item.course_id === course.id);
              return (
                <div key={course.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{course.code} · {course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.department} · {course.credits} credits · {course.faculty.join(", ")}
                      </p>
                    </div>
                    <Badge className={enrollment ? riskClasses(enrollment.status) : "border-slate-200 bg-slate-50 text-slate-700"}>
                      {enrollment ? friendlyStatus(enrollment.status) : "Open"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{course.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {course.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} className="border-slate-200 bg-slate-50 text-slate-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  {enrollment ? (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                        <span>Course progress</span>
                        <span>{enrollment.progress}%</span>
                      </div>
                      <ProgressBar value={enrollment.progress} tone={enrollment.deadline_risk === "Medium" ? "bg-amber-500" : "bg-emerald-500"} />
                    </div>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      {Math.max(course.capacity - course.enrolled, 0)} seats open · {course.waitlist} waiting
                    </p>
                    <button
                      disabled={Boolean(enrollment) || enrolling === course.id}
                      onClick={() => void handleEnroll(course)}
                      className="inline-flex items-center gap-2 rounded-lg border border-ink bg-white px-3 py-2 text-sm font-semibold text-ink disabled:border-slate-200 disabled:text-slate-400"
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
            <div className="mt-4 rounded-lg border border-dashed border-line bg-slate-50 p-8 text-center text-sm text-slate-500">
              No courses match that filter.
            </div>
          ) : null}
          {visibleCourses.length > displayedCourses.length ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>Showing {displayedCourses.length} of {visibleCourses.length} courses.</span>
              <button
                type="button"
                onClick={() => setShowAllCourses(true)}
                className="font-semibold text-ink hover:underline"
              >
                Show all courses
              </button>
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel id="credentials" title="Certificates" eyebrow="Proof of completed learning" icon={WalletCards}>
          <div className="space-y-3">
            {overview.certificates.map((certificate) => (
              <div key={certificate.id} className="rounded-lg border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{certificate.course}</p>
                    <p className="text-sm text-slate-500">
                      {friendlyCertificateSource(certificate.chain)} · {certificate.issued_at}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge className={riskClasses(certificate.status)}>{friendlyStatus(certificate.status)}</Badge>
                    <button
                      type="button"
                      onClick={() => void handleVerify(certificate.hash)}
                      className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Check
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Certificate ID</p>
                <p className="mt-1 break-all rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{certificate.hash}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={verifyHash}
              onChange={(event) => setVerifyHash(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
              placeholder="Paste certificate ID"
            />
            <button onClick={() => void handleVerify()} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
              Verify
            </button>
          </div>
          {verifyResult ? <p className="mt-3 text-sm font-medium text-slate-700">{verifyResult}</p> : null}
        </Panel>
      </div>
    </div>
  );
}

function FacultyDashboard({ overview, onRefresh }: { overview: Overview; onRefresh: () => Promise<void> }) {
  const [suggestion, setSuggestion] = useState<Record<string, string>>({});
  const [working, setWorking] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const activeCourses = overview.courses.filter((course) => course.faculty.includes("Dr. Meena Iyer"));
  const gradingQueue = overview.submissions.filter((submission) => submission.status !== "Graded");
  const facultyHeatmap = overview.heatmap.filter((cell) => cell.role === "Faculty");

  async function handleSuggest(submissionId: string) {
    setWorking(submissionId);
    setActionMessage("");
    try {
      const result = await suggestGrade(submissionId);
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
      await applyGrade(submissionId, extractSuggestedScore(feedback), feedback);
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
      {actionMessage ? <Notice tone={actionMessage.includes("could not") || actionMessage.includes("unavailable") ? "warning" : "success"}>{actionMessage}</Notice> : null}
      <RoleIntro
        title="Teacher focuses on classes, submissions, and course quality"
        description="This keeps AI support explainable: the system drafts feedback, but the teacher reviews and saves the final grade."
        steps={["View classes", "Review work", "Improve syllabus"]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="My Classes" value={String(activeCourses.length)} delta="Monsoon 2026" tone="blue" />
        <MetricCard label="Work To Review" value={String(gradingQueue.length)} delta="AI ready" tone="amber" />
        <MetricCard label="Dashboard Use" value="91%" delta="+18%" tone="green" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr_1fr]">
        <Panel id="course-studio" title="Classes I Teach" eyebrow="Quick view for the teacher" icon={BookOpen}>
          <div className="grid gap-3 lg:grid-cols-2">
            {activeCourses.map((course) => (
              <div key={course.id} className="rounded-lg border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{course.code} · {course.title}</p>
                    <p className="text-sm text-slate-500">{course.enrolled} students · avg GPA {course.average_grade}</p>
                  </div>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">{course.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">{course.description}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                    <span>Engagement</span>
                    <span>{course.adoption}%</span>
                  </div>
                  <ProgressBar value={course.adoption} tone="bg-sky-500" />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel id="grading-queue" title="Student Work Review" eyebrow="AI can suggest feedback, teacher stays in control" icon={Sparkles}>
          <div className="space-y-3">
            {gradingQueue.map((submission) => (
              <div key={submission.id} className="rounded-lg border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{submission.student_name}</p>
                    <p className="text-sm text-slate-500">
                      {courseCodeFor(overview, submission.course_id)} · {formatTime(submission.submitted_at)} · originality {(100 - submission.similarity_score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Badge className={riskClasses(submission.status)}>{friendlyStatus(submission.status)}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">{submission.text}</p>
                {suggestion[submission.id] ? (
                  <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                    <FormattedAiText content={suggestion[submission.id]} />
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleSuggest(submission.id)}
                    disabled={working === submission.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink bg-white px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                  >
                    <Bot className="h-4 w-4" aria-hidden="true" />
                    Draft Feedback
                  </button>
                  <button
                    onClick={() => void handleApply(submission.id)}
                    disabled={working === submission.id || !suggestion[submission.id]}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Save Suggested Grade
                  </button>
                </div>
              </div>
            ))}
            {!gradingQueue.length ? (
              <div className="rounded-lg border border-dashed border-line bg-slate-50 p-8 text-center text-sm text-slate-500">
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
          <div key={gap.skill} className="rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{gap.skill}</p>
                <p className="text-sm text-slate-500">{gap.affected_courses.join(", ")}</p>
              </div>
              <Badge className={gap.gap_score > 40 ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}>
                Missing {gap.gap_score}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Signal label="Demand" value={gap.demand_score} />
              <Signal label="Coverage" value={gap.curriculum_coverage} />
            </div>
            <p className="mt-3 text-sm text-slate-600">{gap.suggestion}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{gap.faculty_response}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ChangeManagementPanel({ overview }: { overview: Overview }) {
  return (
    <Panel title="Change Management Console" eyebrow={overview.change_management.framework} icon={Users}>
      <div className="grid gap-3">
        {overview.change_management.rollout.map((stage) => (
          <div key={stage.stage} className="rounded-lg border border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">{stage.stage}</p>
              <Badge className={riskClasses(stage.status)}>{stage.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{stage.details}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {overview.change_management.champions.map((champion) => (
          <div key={champion.name} className="rounded-lg border border-line p-3">
            <p className="font-semibold text-ink">{champion.name}</p>
            <p className="text-sm text-slate-500">{champion.department}</p>
            <p className="mt-2 text-sm text-slate-600">{champion.impact}</p>
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
            <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
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
                <td className="border-b border-line px-3 py-3 text-slate-500">{formatTime(event.timestamp)}</td>
                <td className="border-b border-line px-3 py-3 font-medium text-ink">{event.actor}</td>
                <td className="border-b border-line px-3 py-3 text-slate-600">{event.role}</td>
                <td className="border-b border-line px-3 py-3 text-slate-600">{event.action}</td>
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
  const areaData = [
    { month: "Jan", storage: 18, requests: 22 },
    { month: "Feb", storage: 22, requests: 31 },
    { month: "Mar", storage: 27, requests: 38 },
    { month: "Apr", storage: 34, requests: 45 },
  ];

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
        <MetricCard label="Privacy" value="RBAC" delta="audit logged" tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel id="local-stack" title="Free-Tier Dependency Map" eyebrow="Zero-cost strategy" icon={Database}>
          <div className="space-y-3">
            {overview.free_tier_stack.map((item) => (
              <div key={item.service} className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-[0.8fr_1.1fr_0.7fr_1fr]">
                <p className="font-semibold text-ink">{item.service}</p>
                <p className="text-sm text-slate-600">{item.provider}</p>
                <Badge className="w-fit border-slate-200 bg-slate-50 text-slate-700">{item.status}</Badge>
                <p className="text-sm text-slate-500">{item.limit}</p>
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
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="storage" stroke="#0ea5e9" fill="url(#storage)" />
                <Line type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel id="api-surface" title="API Surface" eyebrow="Endpoint inventory" icon={GitBranch}>
          <div className="grid gap-2">
            {overview.api_endpoints.map((endpoint) => (
              <div key={endpoint} className="rounded-lg border border-line bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                {endpoint}
              </div>
            ))}
          </div>
        </Panel>

        <Panel id="privacy" title="Privacy & Compliance Posture" eyebrow="FERPA / GDPR controls" icon={LockKeyhole}>
          <div className="grid gap-3">
            {[
              ["RBAC", "Four roles enforced by API contract and UI scope."],
              ["Audit log", "Every important action writes actor, role, action, and timestamp."],
              ["Credential trust", "Certificates verify by SHA-256 hash with testnet-ready fields."],
              ["Data portability", "Course catalog and certificate data are JSON export ready."],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-3 rounded-lg border border-line p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="text-sm text-slate-600">{text}</p>
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
