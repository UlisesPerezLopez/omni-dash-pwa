import type { ReactNode } from "react";
import type { IconName } from "../components/Icons";

export type DataCategory =
  | "sales"
  | "employees"
  | "contracts"
  | "tasks"
  | "inventory"
  | "expenses";

export interface DataEntry {
  id: string;
  category: DataCategory;
  sourceName: string;
  ingestedAt: string;
  date?: string;
  site?: string;
  region?: string;
  // Sales
  orderId?: string;
  customer?: string;
  dealType?: "Order" | "Quote" | "Renewal" | string;
  revenue?: number;
  margin?: number;
  status?: "At risk" | "On track" | string;
  // Employees
  employeeId?: string;
  department?: string;
  role?: string;
  tenureMonths?: number;
  // Inventory
  sku?: string;
  units?: number;
  fillRate?: number;
  shipmentStatus?: "Delayed" | "In transit" | "Delivered" | string;
  // Tasks
  taskId?: string;
  queue?: string;
  sla?: number;
  priority?: "High" | "Standard" | "Low" | string;
  resolved?: boolean;
  // Expenses
  invoiceId?: string;
  vendor?: string;
  amount?: number;
  approved?: boolean;
  // Contracts
  contractId?: string;
  renewalDate?: string;
  value?: number;
  health?: "Watch" | "Healthy" | string;
  [key: string]: unknown;
}

export type Department =
  | "all"
  | "sales"
  | "purchasing"
  | "finance"
  | "ops"
  | "hr"
  | "quality";

export type Screen = Department | "studio";

export interface DepartmentDef {
  id: Department;
  label: string;
  tagline: string;
  icon: IconName;
  categories: DataCategory[] | null;
  emoji?: string;
}

export type ActionKind = "email" | "invoice" | "stock";
export type ActionPriority = "critical" | "high" | "medium";

export interface ActionItem {
  id: string;
  kind: ActionKind;
  priority: ActionPriority;
  title: string;
  subtitle: string;
  due: string;
  body: string;
  meta: [string, string][];
  entryId?: string;
  entryHint?: Record<string, unknown>;
  owner: string;
  created: string;
}

export interface ActionQueueRecord {
  id: string;
  kind: ActionKind;
  priority: ActionPriority;
  title: string;
  subtitle: string;
  due: string;
  body: string;
  meta: [string, string][];
  entryId?: string;
  entryHint?: Record<string, unknown>;
  owner: string;
  created: string;
  resolved: boolean;
  snoozedAt?: string | null;
  resolvedAt?: string | null;
}

export interface KpiMetrics {
  hasData: boolean;
  revenue: number;
  expenses: number;
  cashflow: number;
  margin: number;
  quotes: number;
  orders: number;
  churn: number;
  approvals: number;
  contracts: number;
  contractHealth: number;
  openTasks: number;
  escalations: number;
  sla: number;
  delayed: number;
  fillRate: number;
  units: number;
  headcount: number;
  reviews: number;
  tenureYears: number;
}

export type Stats = KpiMetrics;

export interface ChartSeries {
  label: string;
  data: number[];
  color: string;
  fill?: boolean;
  dash?: boolean;
  type?: "line" | "bar";
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderDash?: number[];
}

export interface BrandPalette {
  primary: string;
  primaryHover: string;
  secondary?: string;
  tertiary?: string;
  accent: string;
  cardBg?: string;
}

export type ShadowIntensity = "flat" | "soft" | "deep";

export interface IngestResult {
  entries: DataEntry[];
  fileName: string;
  kind: "data" | "document" | "branding";
  note: string;
  palette?: BrandPalette;
}

export interface AppSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface WidgetSetting {
  id: string;
  visible: boolean;
  pinned: boolean;
  filters?: Record<string, unknown>;
  colorOverride?: string;
  [key: string]: unknown;
}

export type ThemeMode = "dark" | "light";
export type Mode = "simple" | "deep";
export type FinanceDrill = "revenue" | "expenses" | "cashflow";
export type SalesDrill = "quotes" | "orders" | "churn";
export type Language = "en" | "es" | "de" | "fr" | "it" | "zh" | "ja";

export interface MenuOption {
  value: string;
  label: string;
}

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T, index: number) => ReactNode;
  align?: "left" | "right";
}

export interface StagingEntry {
  id: string;
  originalFileName: string;
  rawContent: unknown;
  suggestedCategory: DataCategory | null;
  confidenceScore: number; // 0 to 100
  status: "pending" | "approved" | "rejected";
  ingestedAt: string;
}

export type SyncStatus = "pending" | "failed" | "synced";

export interface SyncQueueRecord {
  id: string;
  actionType: string;
  entityId?: string;
  payload: unknown;
  timestamp: string;
  status: SyncStatus;
}


