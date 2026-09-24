import type { DataCategory, DataEntry } from "../types";

const sites = ["North Hub", "Riverside DC", "West Fulfillment", "Harbor Node", "East Crossdock"];
const regions = ["North America", "EMEA", "APAC", "LATAM"];
const departments = ["Operations", "Sales", "Customer Success", "Finance", "People"];
const roles = ["Fulfillment lead", "Account executive", "Planner", "Quality analyst", "Route manager"];

function id(index: number, category: DataCategory) {
  return `demo_${category}_${index}`;
}

export function generateDemoEntries(total = 1250): DataEntry[] {
  const entries: DataEntry[] = [];
  const dateForOffset = (daysAgo: number) => {
    const value = new Date();
    value.setDate(value.getDate() - daysAgo);
    return value.toISOString().slice(0, 10);
  };
  for (let index = 0; index < total; index += 1) {
    const category = (["sales", "employees", "inventory", "tasks", "expenses", "contracts"] as DataCategory[])[index % 6];
    const site = sites[(index + Math.floor(Math.random() * 2)) % sites.length];
    const region = regions[(index + Math.floor(Math.random() * 2)) % regions.length];

    // Jagged business variance (combines base, random spike/dip, and noise)
    const randomFactor = 0.68 + Math.random() * 0.65;
    const randomNoise = (Math.random() - 0.48) * 1800;
    const baseAmount = 450 + ((index * 97) % 8800);
    const amount = Math.max(150, Math.round(baseAmount * randomFactor + randomNoise));

    // Distribute entries realistically over trailing 30 days
    const dayOffset = Math.floor(Math.random() * 30);
    const entryDate = dateForOffset(dayOffset);
    const common = {
      id: id(index, category),
      sourceName: "OmniDash demo generator",
      ingestedAt: new Date(Date.now() - dayOffset * 86400000).toISOString(),
      date: entryDate,
      site,
      region,
    };

    if (category === "sales") {
      const marginVariance = (Math.random() - 0.5) * 0.08;
      entries.push({
        ...common,
        category,
        orderId: `ORD-${5400 + index}`,
        customer: ["Atlas Foods", "Nova Retail", "Pioneer Labs", "Cedar Supply", "Zenith Logistics", "Apex Global"][index % 6],
        dealType: ["Order", "Quote", "Order", "Renewal", "Order"][index % 5],
        revenue: amount,
        margin: Math.max(0.09, Math.min(0.42, 0.21 + marginVariance)),
        status: Math.random() < 0.18 ? "At risk" : "On track",
      });
    }
    if (category === "employees") {
      entries.push({
        ...common,
        category,
        employeeId: `EMP-${1000 + index}`,
        department: departments[index % departments.length],
        role: roles[index % roles.length],
        tenureMonths: Math.max(1, Math.round(6 + Math.random() * 72)),
        status: Math.random() < 0.12 ? "Review" : "Active",
      });
    }
    if (category === "inventory") {
      entries.push({
        ...common,
        category,
        sku: `SKU-${(index % 68).toString().padStart(3, "0")}`,
        units: Math.round(50 + Math.random() * 950),
        fillRate: Math.max(0.65, Math.min(1, 0.86 + (Math.random() - 0.5) * 0.18)),
        shipmentStatus: Math.random() < 0.14 ? "Delayed" : Math.random() < 0.35 ? "In transit" : "Delivered",
      });
    }
    if (category === "tasks") {
      entries.push({
        ...common,
        category,
        taskId: `SLA-${index}`,
        queue: ["Dispatch", "Quality", "Finance", "Customer", "Compliance"][index % 5],
        sla: Math.max(0.72, Math.min(1, 0.91 + (Math.random() - 0.5) * 0.14)),
        priority: Math.random() < 0.22 ? "High" : "Standard",
        resolved: Math.random() > 0.16,
      });
    }
    if (category === "expenses") {
      entries.push({
        ...common,
        category,
        invoiceId: `INV-${2100 + index}`,
        vendor: ["Vector Freight", "Northstar Fuel", "Signal Telecom", "Beacon Energy", "Krona Consulting"][index % 5],
        amount,
        approved: Math.random() > 0.16,
      });
    }
    if (category === "contracts") {
      entries.push({
        ...common,
        category,
        contractId: `CTR-${300 + index}`,
        vendor: ["Aperture Systems", "Keystone Logistics", "Orbit Materials", "Starlight Cloud"][index % 4],
        renewalDate: dateForOffset(-90 + Math.floor(Math.random() * 120)),
        value: amount * 12,
        health: Math.random() < 0.15 ? "Watch" : "Healthy",
      });
    }
  }
  return entries;
}
