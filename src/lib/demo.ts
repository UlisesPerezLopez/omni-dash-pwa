import type { DataCategory, DataEntry, EmailRecord } from "../types";

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

export function generateDemoEmails(): EmailRecord[] {
  return [
    {
      id: "em_1",
      subject: "URGENT: Delayed Shipment - PO-9841 (Rotterdam Hub Customs Hold)",
      body: `Hello Ulises,\n\nWe were just notified by our container freight forwarder that container vessel MSC Isabella has been flagged for unexpected customs physical inspection at Rotterdam Port.\n\nThis container carries our critical shipment of 420 units of SKU-042 (High-Torque Actuators). As a consequence, delivery to the North Hub assembly facility will be delayed by approximately 4 business days.\n\nPlease check if assembly Line 3 schedule can be adjusted, or if we need to request expedited customs clearance processing. Attached are the bill of lading and manifest docs.\n\nBest regards,\nElena Rostova\nLogistics Coordinator | Apex Global Logistics GmbH\nTel: +49 40 8921-440`,
      sender: "Elena Rostova <elena.rostova@apexlogistics.de>",
      recipient: "Ulises Pérez <u.perez@omnidash.internal>",
      date: "2026-09-30T10:15:00Z",
      status: "unread",
      folder: "inbox",
      aiAnalysis: {
        priority: "High",
        summary: "Container vessel MSC Isabella delayed due to customs inspection in Rotterdam. 420 units of SKU-042 delayed by 4 business days.",
        extractedTasks: [
          "Notify assembly line manager regarding delayed SKU-042 delivery",
          "Request expedited customs clearance declaration from forwarder",
          "Update ERP delivery commitment date for Apex Logistics",
        ],
        deadline: "Today, 17:00 CET",
      },
    },
    {
      id: "em_2",
      subject: "Invoice Variance: INV-2026-894 exceeds approved PO by $7,300",
      body: `Dear Accounts Payable Team,\n\nWhile reviewing vendor billing for September, we identified a significant discrepancy in invoice INV-2026-894 from Cedar Supply Corp.\n\nThe billed total is $48,500.00, whereas our approved Purchase Order (PO-4419) authorized a maximum cap of $41,200.00. The $7,300.00 variance is attributed to unapproved ocean freight demurrage and priority handling surcharges.\n\nPer our Master Service Agreement (Clause 8.4), demurrage charges must be pre-authorized in writing 48 hours prior to invoicing. Please verify before releasing payment.\n\nRegards,\nMarcus Vance\nLead Procurement Auditor | Cedar Supply Corp`,
      sender: "Marcus Vance <m.vance@cedarsupply.com>",
      recipient: "Accounts Payable <ap@omnidash.internal>",
      date: "2026-09-29T14:40:00Z",
      status: "unread",
      folder: "inbox",
      aiAnalysis: {
        priority: "High",
        summary: "Invoice INV-2026-894 totals $48,500 vs approved PO cap of $41,200 due to unexpected demurrage surcharge.",
        extractedTasks: [
          "Place immediate payment freeze on invoice INV-2026-894",
          "Request itemized demurrage breakdown from Cedar Supply billing",
          "Reconcile discrepancy against Q3 vendor master agreement clause 8.4",
        ],
        deadline: "Tomorrow, 12:00 CET",
      },
    },
    {
      id: "em_3",
      subject: "CRITICAL: SLA Breach Risk on Order ORD-9912 (North Hub)",
      body: `AUTOMATED SYSTEM TELEMETRY ALERT\n\nOrder Identifier: ORD-9912\nCustomer Account: Apex Global Logistics\nSite: North Hub Distribution Facility\n\nCurrent Elapsed Time: 21.6 hours\nContractual SLA Cap: 24.0 hours\nRemaining Window: 2 hours 24 minutes\nPenalty Amount at Threshold: €2,500.00\n\nThe consignment has cleared pallet packing but has not yet been assigned to an outbound freight carrier bay. Immediate dispatch intervention is required to avoid financial breach penalties.\n\nOmniDash Automated Monitoring Daemon`,
      sender: "Monitoring Daemon <telemetry-alerts@omnidash.internal>",
      recipient: "Ulises Pérez <u.perez@omnidash.internal>",
      date: "2026-09-30T11:45:00Z",
      status: "unread",
      folder: "inbox",
      aiAnalysis: {
        priority: "High",
        summary: "Fulfillment SLA timer for high-value client Apex Global indicates only 2.4 hours remaining before contractual €2,500 penalty triggers.",
        extractedTasks: [
          "Authorize priority expedited dispatch courier from North Hub",
          "Contact carrier dispatch lead for immediate tracking scan",
        ],
        deadline: "Today, 16:30 CET",
      },
    },
    {
      id: "em_4",
      subject: "Quality Gate Escalation: Optical Sensor Defect Spike (Batch B-842)",
      body: `Ulises,\n\nOur morning automated optical inspection (AOI) on Line 4 registered a sudden defect spike on batch B-842 (Micro-Sensor Assemblies). The defect rate jumped to 3.82%, well above our ISO quality threshold of 1.50%.\n\nMicroscopic review indicates cold soldering joints on PIN-14 caused by a thermal calibration drift on reflow oven 2. We have temporarily halted the line.\n\nWe need to quarantine all 640 finished units currently staged in Warehouse Zone C and run a recalibration cycle on oven 2 before restarting production.\n\nDr. Klaus Weber\nHead of Quality Assurance & Process Engineering`,
      sender: "Dr. Klaus Weber <klaus.weber@qualitygate.internal>",
      recipient: "Ulises Pérez <u.perez@omnidash.internal>",
      date: "2026-09-28T09:20:00Z",
      status: "read",
      folder: "inbox",
      aiAnalysis: {
        priority: "High",
        summary: "Line 4 automated optical inspection recorded 3.8% soldering defects on sensor board B-842, breaching the 1.5% SLA limit.",
        extractedTasks: [
          "Quarantine batch B-842 pallets in warehouse zone C",
          "Initiate calibration cycle on robotic soldering station 4",
          "Issue preliminary quality notice to customer engineering",
        ],
        deadline: "2026-10-02, 18:00 CET",
      },
    },
    {
      id: "em_5",
      subject: "MSA Renewal & Volume Rebate Tier Proposals - Zenith Logistics Q4",
      body: `Hi Ulises and Procurement Team,\n\nOur current Master Service Agreement expires at the end of October. Over the past 12 months, our teams have achieved an impressive 99.4% on-time delivery record across the EMEA corridor.\n\nFor the upcoming 3-year extension, Zenith Logistics is pleased to propose an enhanced volume rebate schedule:\n- Tier 1 (> 5,000 pallets): 3.5% credit rebate\n- Tier 2 (> 10,000 pallets): 5.0% credit rebate\n\nWe do request an update to the diesel fuel index clause (14.2) to reflect the new European Brent baseline. Let me know when you have 30 minutes for a steering call.\n\nWarm regards,\nSarah Jenkins\nCommercial Director | Zenith Logistics Ltd.`,
      sender: "Sarah Jenkins <s.jenkins@zenithlogistics.com>",
      recipient: "Procurement Team <procurement@omnidash.internal>",
      date: "2026-09-27T16:10:00Z",
      status: "unread",
      folder: "inbox",
      aiAnalysis: {
        priority: "Medium",
        summary: "Zenith proposed 3-year contract with 4.5% volume rebate, requesting updated fuel index mechanism.",
        extractedTasks: [
          "Compare proposed fuel surcharge index with regional spot rates",
          "Schedule commercial negotiation review with Sarah Jenkins",
        ],
        deadline: "2026-10-10",
      },
    },
    {
      id: "em_6",
      subject: "Notice of Q4 Raw Material Price Adjustment (+3.2% Steel Coils)",
      body: `Dear Valued Partner,\n\nDue to significant upward movement in electricity wholesale tariffs and European carbon emission allowances (ETS), Krupp Steelworks must apply a +3.2% price adjustment across our hot-rolled and galvanized steel coil products effective November 1st, 2026.\n\nAll existing purchase orders booked and acknowledged prior to October 20th will be honored at current contracted price points. We recommend reviewing your Q4 manufacturing BOM and placing safety stock orders before the cutoff.\n\nSincerely,\nThorsten Bauer\nVP Industrial Sales | Krupp Steelworks GmbH`,
      sender: "Thorsten Bauer <t.bauer@krupp-steelworks.de>",
      recipient: "Purchasing Dept <purchasing@omnidash.internal>",
      date: "2026-09-26T11:00:00Z",
      status: "read",
      folder: "inbox",
      aiAnalysis: {
        priority: "Medium",
        summary: "Energy cost surcharges necessitate a 3.2% price increase on hot-rolled steel coils starting November 1st.",
        extractedTasks: [
          "Update BOM baseline costs for heavy manufacturing lines",
          "Simulate financial impact of pre-purchasing 45 days of safety inventory",
        ],
        deadline: "2026-10-15",
      },
    },
    {
      id: "em_7",
      subject: "Enterprise Pilot Kickoff: Nova Retail Group EDI Setup",
      body: `Team,\n\nGreat news! Nova Retail Group signed the pilot agreement covering 12 hypermarket distribution hubs. Their central supply chain team will be transmitting replenishment orders directly via EDI.\n\nWe need our IT Operations team to test the AS2 gateway credentials and map the EDIFACT ORDERS / DESADV schemas by Friday. First trial consignment of 800 units is set for dispatch from Riverside DC on October 8th.\n\nThanks everyone for making this happen!\n\nClaire Beauchamp\nSenior Key Account Manager`,
      sender: "Claire Beauchamp <c.beauchamp@sales.omnidash.internal>",
      recipient: "Operations Hub <ops@omnidash.internal>",
      date: "2026-09-29T08:30:00Z",
      status: "unread",
      folder: "inbox",
      aiAnalysis: {
        priority: "Medium",
        summary: "Nova Retail pilot approved across 12 branch locations. Initial replenishment dispatch scheduled for Oct 8.",
        extractedTasks: [
          "Test AS2 EDI gateway credentials with Nova Retail IT",
          "Reserve 800 units of safety stock in Riverside DC",
        ],
        deadline: "2026-10-06",
      },
    },
    {
      id: "em_8",
      subject: "Q3 Audit Findings: ISO 27001 Offline Cache & Access Governance",
      body: `Ulises,\n\nOur pre-audit internal review for ISO 27001 compliance identified two items needing sign-off before the TÜV auditors arrive on October 14th:\n\n1. Documentation of IndexedDB offline storage encryption on warehouse mobile tablets.\n2. Verification of automated session purging on shared terminals when HTTP 401 Unauthorized occurs.\n\nPlease review the attached checklist and provide confirmation that our PWA security interceptors fulfill the requirement.\n\nInformation Security & Governance Team`,
      sender: "InfoSec Compliance <infosec@omnidash.internal>",
      recipient: "Ulises Pérez <u.perez@omnidash.internal>",
      date: "2026-09-25T13:15:00Z",
      status: "read",
      folder: "inbox",
      aiAnalysis: {
        priority: "Medium",
        summary: "Upcoming external surveillance audit requires documentation of IndexedDB local encryption and session auto-flush on shared terminals.",
        extractedTasks: [
          "Validate client-side 401 cache-purge routine on testing tablets",
          "Sign off on role-based access review log for Q3",
        ],
        deadline: "2026-10-12",
      },
    },
    {
      id: "em_9",
      subject: "Facility Notice: Riverside DC Conveyor Belt Maintenance Schedule",
      body: `Notice to all Riverside Warehouse staff:\n\nScheduled maintenance on conveyor belt sorter #3 will take place this Saturday, Oct 4th, between 06:00 and 14:00 CET. During this window, all inbound pallet deliveries normally directed to Gate 3 must be unloaded at Gates 1 and 2.\n\nLogistics supervisors have already configured cross-docking rules in the warehouse management system to prevent sorting delays.\n\nFacility Operations Management`,
      sender: "Facility Management <maintenance@omnidash.internal>",
      recipient: "Riverside Staff <riverside-all@omnidash.internal>",
      date: "2026-09-24T15:45:00Z",
      status: "read",
      folder: "inbox",
      aiAnalysis: {
        priority: "Low",
        summary: "Routine conveyor lubrication and sensor calibration scheduled for Saturday 06:00 to 14:00. Inbound dock 3 will be rerouted.",
        extractedTasks: [
          "Reroute Saturday morning freight arrivals to dock 1 and 2",
        ],
        deadline: "2026-10-04",
      },
    },
    {
      id: "em_10",
      subject: "HR Announcement: Annual Leave Carry-over & 2027 Holiday Schedule",
      body: `Dear Colleagues,\n\nAs we enter Q4, please note that up to five (5) accrued and unused vacation days from the 2026 calendar year can be carried over into Q1 2027, provided they are taken before March 31st, 2027.\n\nPlease discuss your vacation schedule with your department lead and submit requests via the workforce portal before November 15th to ensure balanced operational staffing.\n\nWarm regards,\nMartina Gomez\nDirector of People & Culture`,
      sender: "Martina Gomez <m.gomez@hr.omnidash.internal>",
      recipient: "All Employees <team@omnidash.internal>",
      date: "2026-09-23T09:00:00Z",
      status: "read",
      folder: "inbox",
      aiAnalysis: {
        priority: "Low",
        summary: "Employees may carry over up to 5 unused annual leave days into Q1 2027. Work-from-anywhere allowances confirmed.",
        extractedTasks: [
          "Submit Q4 vacation planning into workforce portal",
        ],
        deadline: "2026-11-15",
      },
    },
    {
      id: "em_11",
      subject: "Quotation QT-2026-442: Apex Global Logistics Q4 Expansion",
      body: `Dear Elena,\n\nFollowing our review of your facility expansion in Munich and Hamburg, please find attached formal quotation QT-2026-442 for 1,200 Industrial Telemetry Sensor Modules.\n\nWe have included our Tier 2 enterprise pricing along with our guaranteed 99.8% SLA turnaround commitments. The terms are valid for 30 calendar days.\n\nLooking forward to your feedback.\n\nBest regards,\nUlises Pérez\nQuality Control & IT Operations Lead | OmniDash Enterprise`,
      sender: "Ulises Pérez <u.perez@omnidash.internal>",
      recipient: "Elena Rostova <elena.rostova@apexlogistics.de>",
      date: "2026-09-28T16:00:00Z",
      status: "read",
      folder: "sent",
      aiAnalysis: {
        priority: "Medium",
        summary: "Transmitted formal quotation for 1,200 telemetry sensors with tiered volume discount and 99.8% SLA guarantee.",
        extractedTasks: [
          "Check in with Elena Rostova if contract signature pending by Thursday",
        ],
        deadline: "2026-10-02",
      },
    },
    {
      id: "em_12",
      subject: "SEPA Remittance Confirmation: Batch P-9941 (Cedar Supply & Vector)",
      body: `To: Cedar Supply Accounts Payable\n\nPlease be advised that SEPA Credit Transfer Batch P-9941 totaling €92,400.00 has been executed by Deutsche Bank on our behalf.\n\nSettlement covers verified statements for August freight handling and raw material deliveries. Reference: OMNI-PAY-2026-9941.\n\nFinance & Treasury Team`,
      sender: "Finance Dept <finance@omnidash.internal>",
      recipient: "Accounts Payable <ap@cedarsupply.com>",
      date: "2026-09-27T10:30:00Z",
      status: "read",
      folder: "sent",
      aiAnalysis: {
        priority: "Low",
        summary: "Confirmed electronic bank transfer of €92,400.00 settling approved statements for September fulfillment operations.",
        extractedTasks: [
          "Archive bank remittance voucher in monthly fiscal folder",
        ],
        deadline: null,
      },
    },
    {
      id: "em_13",
      subject: "Q3 Vendor Scorecard: Krupp Steelworks (Tier 1 Gold Rating)",
      body: `Dear Thorsten,\n\nCongratulations! Krupp Steelworks achieved a composite vendor score of 98.5 points in our Q3 supplier evaluation, qualifying for our Tier 1 Gold Partner certification.\n\nOn-time in-full delivery was 98.4% and material scrap was under 0.04%. We look forward to continuing our close cooperation in Q4.\n\nBest regards,\nUlises Pérez`,
      sender: "Ulises Pérez <u.perez@omnidash.internal>",
      recipient: "Thorsten Bauer <t.bauer@krupp-steelworks.de>",
      date: "2026-09-25T14:00:00Z",
      status: "read",
      folder: "sent",
      aiAnalysis: {
        priority: "Low",
        summary: "Sent quarterly supplier scorecard: 98.4% on-time delivery, 0.04% defect rate. Upgraded to Preferred Tier 1 status.",
        extractedTasks: [
          "Coordinate annual executive lunch with Thorsten Bauer",
        ],
        deadline: null,
      },
    },
    {
      id: "em_14",
      subject: "Warranty Claim Resolved: RMA #88219 Credit Note Issued ($14,200)",
      body: `Hi Ulises,\n\nOur Bangalore engineering center completed failure analysis on the 85 returned sensor units under RMA #88219. We confirmed a batch capacitor failure from our component subcontractor.\n\nA full credit note of $14,200.00 has been credited to your company's account balance and can be deducted from your next order cycle.\n\nThank you for your patience and partnership.\n\nVikram Patel\nCustomer Assurance Director | TechCorp International`,
      sender: "Vikram Patel <vpatel@techcorp.in>",
      recipient: "Ulises Pérez <u.perez@omnidash.internal>",
      date: "2026-09-20T11:15:00Z",
      status: "read",
      folder: "archive",
      aiAnalysis: {
        priority: "Medium",
        summary: "TechCorp validated warranty claim for 85 defective sensor units and issued a $14,200 credit memo against pending orders.",
        extractedTasks: [
          "Apply credit memo #CM-88219 in ERP ledger",
          "Scrap defective batch units following environmental protocol",
        ],
        deadline: null,
      },
    },
    {
      id: "em_15",
      subject: "Scheduled Infrastructure Maintenance: PostgreSQL Cluster Minor Update",
      body: `Team,\n\nThe scheduled maintenance on our PostgreSQL database cluster and Redis caching instances was successfully completed early Sunday morning between 02:00 and 03:15 UTC.\n\nAll automated end-to-end integration tests have passed and data synchronization latency remains below 12ms. The OmniDash PWA continued operating smoothly in offline cache mode throughout the window.\n\nDevOps Infrastructure Lead`,
      sender: "DevOps Team <devops@omnidash.internal>",
      recipient: "All Staff <all@omnidash.internal>",
      date: "2026-09-18T18:00:00Z",
      status: "read",
      folder: "archive",
      aiAnalysis: {
        priority: "Low",
        summary: "Completed scheduled weekend maintenance on primary database replica with zero downtime recorded for PWA client.",
        extractedTasks: [
          "Verify monitoring metrics dashboard on Monday morning",
        ],
        deadline: null,
      },
    },
    {
      id: "em_16",
      subject: "Signed Contract Copy: Pioneer Labs Clinical Diagnostic Line",
      body: `Hello Team,\n\nWe have received the executed, countersigned copy of the Master Supply Agreement with Pioneer Labs (CTR-2026-814) for the Clinical Diagnostic sensor hardware.\n\nThe contract term runs for 24 months with an estimated annualized volume of $580,000. All documents are filed in our central legal document repository.\n\nBest regards,\nCorporate Legal Affairs`,
      sender: "Legal Department <legal@omnidash.internal>",
      recipient: "Sales Ops <sales-ops@omnidash.internal>",
      date: "2026-09-15T09:45:00Z",
      status: "read",
      folder: "archive",
      aiAnalysis: {
        priority: "Low",
        summary: "Fully countersigned contract CTR-2026-814 received and archived. Term duration 24 months.",
        extractedTasks: [
          "File countersigned PDF in contracts vault",
        ],
        deadline: null,
      },
    },
    {
      id: "em_17",
      subject: "SPAM: Boost your warehouse throughput by 400% with AI drone swarms!",
      body: `Hey Operations Leader!\n\nAre your forklift drivers moving too slow? With our Autonomous AI Quadcopter Swarms, your pallets fly through the warehouse at 60 km/h! Reply YES for a free 15-minute demo and 50% discount voucher!\n\nUnsubscribe from drone magic newsletters.`,
      sender: "Drone Innovations Marketing <sales@dronemagic-future.biz>",
      recipient: "Info Desk <info@omnidash.internal>",
      date: "2026-09-28T04:12:00Z",
      status: "read",
      folder: "trash",
      aiAnalysis: {
        priority: "Low",
        summary: "Unsolicited sales marketing email promoting automated warehouse drone systems.",
        extractedTasks: [
          "Domain blacklisted in mail gateway",
        ],
        deadline: null,
      },
    },
    {
      id: "em_18",
      subject: "SECURITY ALERT: Blocked Phishing Attack (Spoofed Wire Request)",
      body: `SECURITY INCIDENT REPORT #SEC-9842\n\nThreat Category: CEO Impersonation / Business Email Compromise (BEC)\nOrigin IP: 185.220.101.44 (Tor exit relay)\nFrom: ceo.executive.office@gmail.com\nSubject: Urgent: Confidential acquisition transfer\n\nIncident summary: An external sender attempted to impersonate executive management requesting an urgent wire transfer of €180,000 without supporting PO documentation. The mail filter detected SPF/DKIM fail and quarantined the message.\n\nIT Security Operations Center`,
      sender: "Perimeter Security Gateway <security@omnidash.internal>",
      recipient: "Ulises Pérez <u.perez@omnidash.internal>",
      date: "2026-09-26T22:30:00Z",
      status: "read",
      folder: "trash",
      aiAnalysis: {
        priority: "High",
        summary: "Automated mail filter intercepted spoofed CEO impersonation email attempting unauthorized treasury wire transfer.",
        extractedTasks: [
          "Add sender IP block to firewall blacklist",
          "Send brief staff phishing awareness reminder",
        ],
        deadline: null,
      },
    },
  ];
}
