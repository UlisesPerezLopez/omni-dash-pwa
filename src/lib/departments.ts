import type { DataCategory, DataEntry, Department, DepartmentDef, Stats, KpiMetrics } from "../types";
export type { Department, DepartmentDef, Stats, KpiMetrics };


export const departmentList: DepartmentDef[] = [
  { id: "all", label: "Executive Overview", tagline: "Cross-functional command view with the live priority queue.", icon: "grid", categories: null, emoji: "🌍" },
  { id: "sales", label: "Sales & Financials", tagline: "Quotes, closed orders and churn signals from commercial activity.", icon: "sales", categories: ["sales"], emoji: "📊" },
  { id: "purchasing", label: "Purchasing & Spend", tagline: "Vendor spend, approvals and contract health.", icon: "cart", categories: ["contracts", "expenses"], emoji: "🛒" },
  { id: "finance", label: "Finance & Cashflow", tagline: "Revenue, expenses and forward cashflow visibility.", icon: "bank", categories: ["sales", "expenses", "contracts"], emoji: "💶" },
  { id: "ops", label: "Operations & Logistics", tagline: "Backlog voice, shipment flow and site health.", icon: "ops", categories: ["tasks", "inventory"], emoji: "⚙️" },
  { id: "hr", label: "People & HR", tagline: "Headcount, retention and review workflow.", icon: "users", categories: ["employees"], emoji: "👥" },
  { id: "quality", label: "Quality Management", tagline: "SLA compliance, escalations and quality gates.", icon: "shield", categories: ["tasks", "inventory"], emoji: "⚖️" },
];


export function filterByDepartment(entries: DataEntry[], dept: Department): DataEntry[] {
  const def = departmentList.find((item) => item.id === dept);
  if (!def || !def.categories) return entries;
  return entries.filter((entry) => def.categories!.includes(entry.category));
}

export const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);

export function sum(entries: DataEntry[], field: string): number {
  return entries.reduce((total, entry) => total + num(entry[field]), 0);
}

export function avg(entries: DataEntry[], field: string, fallback = 0): number {
  if (!entries.length) return fallback;
  return entries.reduce((total, entry) => total + num(entry[field]), 0) / entries.length;
}

export function countWhere<T>(entries: T[], predicate: (entry: T) => boolean): number {
  return entries.reduce((total, entry) => total + (predicate(entry) ? 1 : 0), 0);
}

interface TrendOptions {
  days?: number;
  buckets?: number;
  predicate?: (entry: DataEntry) => boolean;
}

/** Sums (or counts via predicate) entries into N chronological buckets over the trailing window. */
export function bucketTrend(entries: DataEntry[], field: string | null, options: TrendOptions = {}): number[] {
  const { days = 32, buckets = 8, predicate } = options;
  const nowTs = Date.now();
  const span = days * 86400000;
  const size = span / buckets;
  const out = new Array<number>(buckets).fill(0);
  entries.forEach((entry) => {
    const stamp = Date.parse(String(entry.date || entry.ingestedAt || ""));
    if (Number.isNaN(stamp)) return;
    const age = nowTs - stamp;
    if (age < 0 || age > span) return;
    const index = Math.min(buckets - 1, Math.floor((span - age) / size));
    if (predicate) { if (predicate(entry)) out[index] += 1; } else if (field) out[index] += num(entry[field]);
  });
  return out;
}

/** Realistic, jagged series with random business variance used when no local data exists yet. */
export function fallbackTrend(seed: number, buckets = 8, base = 48, amp = 18): number[] {
  const out: number[] = [];
  for (let index = 0; index < buckets; index += 1) {
    const jitter = (Math.random() - 0.48) * (amp * 0.95);
    const wave = Math.sin(index * 0.85 + seed) * amp;
    const upward = index * (amp / 5.5);
    const value = Math.max(5, Math.round(base + wave + upward + ((index * seed * 13) % 9) + jitter));
    out.push(value);
  }
  return out;
}

export function dayLabels(buckets = 8, days = 32): string[] {
  const size = days / buckets;
  const out: string[] = [];
  for (let index = 0; index < buckets; index += 1) {
    const date = new Date(Date.now() - (buckets - 1 - index) * size * 86400000);
    out.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }
  return out;
}

export function computeStats(entries: DataEntry[]): Stats {
  const byCat = (cat: DataCategory) => entries.filter((entry) => entry.category === cat);
  const sales = byCat("sales");
  const expenses = byCat("expenses");
  const contracts = byCat("contracts");
  const tasks = byCat("tasks");
  const inventory = byCat("inventory");
  const employees = byCat("employees");
  const revenue = sum(sales, "revenue");
  const spend = sum(expenses, "amount");
  return {
    hasData: entries.length > 0,
    revenue,
    expenses: spend,
    cashflow: revenue - spend,
    margin: avg(sales, "margin", 0.24),
    quotes: countWhere(sales, (entry) => entry.dealType === "Quote"),
    orders: countWhere(sales, (entry) => entry.dealType !== "Quote"),
    churn: sales.length ? countWhere(sales, (entry) => entry.status === "At risk") / sales.length : 0,
    approvals: countWhere(expenses, (entry) => entry.approved === false),
    contracts: contracts.length,
    contractHealth: contracts.length ? countWhere(contracts, (entry) => entry.health === "Healthy") / contracts.length : 1,
    openTasks: countWhere(tasks, (entry) => entry.resolved === false),
    escalations: countWhere(tasks, (entry) => entry.priority === "High" && entry.resolved === false),
    sla: avg(tasks, "sla", 0.94),
    delayed: countWhere(inventory, (entry) => entry.shipmentStatus === "Delayed"),
    fillRate: avg(inventory, "fillRate", 0.9),
    units: sum(inventory, "units"),
    headcount: employees.length,
    reviews: countWhere(employees, (entry) => entry.status === "Review"),
    tenureYears: avg(employees, "tenureMonths", 36) / 12,
  };
}
