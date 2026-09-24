import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import type { DataCategory, DataEntry, BrandPalette, IngestResult } from "../types";
export type { BrandPalette, IngestResult };

// Configure PDF.js worker for local bundler environment
if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

function uid(prefix = "entry") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function inferCategory(fileName: string, row: Record<string, unknown>): DataCategory {
  const text = `${fileName} ${Object.keys(row).join(" ")} ${Object.values(row).join(" ")}`.toLowerCase();
  if (/employee|staff|worker|retention|attrition|hr|people/.test(text)) return "employees";
  if (/inventory|stock|warehouse|sku|shipment|logistics|delivery/.test(text)) return "inventory";
  if (/contract|agreement|renewal|vendor/.test(text)) return "contracts";
  if (/task|ticket|sla|project|backlog/.test(text)) return "tasks";
  if (/expense|cost|spend|invoice|payment/.test(text)) return "expenses";
  return "sales";
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = String(value).trim();
  const cleaned = text.replace(/[$,€£¥%]/g, "").replace(/\s/g, "");
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned) / (text.includes("%") ? 100 : 1);
  const parsedDate = Date.parse(text);
  if (parsedDate && /[-/:]|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) {
    return new Date(parsedDate).toISOString().slice(0, 10);
  }
  return text;
}

function rowsToEntries(rows: Record<string, unknown>[], fileName: string): DataEntry[] {
  return rows.filter((row) => Object.values(row).some((value) => value !== null && value !== "")).map((row) => {
    const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), normalizeValue(value)]));
    const category = inferCategory(fileName, normalized);
    return { id: uid("record"), category, sourceName: fileName, ingestedAt: new Date().toISOString(), ...normalized };
  });
}

function parseCsvFallback(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(split(line).map((value, index) => [headers[index] || `column_${index + 1}`, value])));
}

function parseEml(text: string) {
  const separator = text.match(/\r?\n\r?\n/);
  const headerText = separator ? text.slice(0, separator.index) : text;
  const body = separator ? text.slice((separator.index || 0) + separator[0].length) : "";
  const header = (name: string) => headerText.match(new RegExp(`^${name}:\\s*(.+)$`, "im"))?.[1]?.trim() || "";
  return [{
    from: header("From"),
    date: header("Date"),
    subject: header("Subject"),
    body: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }];
}

async function parseDocument(file: File): Promise<Record<string, unknown>[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt" || extension === "md") {
    const text = await file.text();
    return text.split(/\r?\n/).filter(Boolean).map((line, index) => ({ line: index + 1, content: line.replace(/^#+\s*/, "") }));
  }
  if (extension === "eml") return parseEml(await file.text());
  if (extension === "docx") {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.split(/\r?\n/).filter(Boolean).map((content: string, index: number) => ({ line: index + 1, content }));
  }
  if (extension === "pdf") {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const rows: Record<string, unknown>[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str || "").join(" ");
      rows.push({ page: pageNumber, content: text });
    }
    return rows;
  }
  return [{ content: await file.text() }];
}

async function extractPalette(file: File): Promise<BrandPalette> {
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Logo could not be read"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 48, 48);
    context.drawImage(image, 0, 0, 48, 48);
    const pixels = context.getImageData(0, 0, 48, 48).data;
    const buckets = new Map<string, number>();
    for (let index = 0; index < pixels.length; index += 4) {
      const [r, g, b, alpha] = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
      if (alpha < 80 || (r > 238 && g > 238 && b > 238) || (r < 18 && g < 18 && b < 18)) continue;
      const key = [Math.round(r / 24) * 24, Math.round(g / 24) * 24, Math.round(b / 24) * 24].join(",");
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    const [r, g, b] = (Array.from(buckets.entries()).sort((a, z) => z[1] - a[1])[0]?.[0] || "94,76,224").split(",").map(Number);
    const primary = `rgb(${r}, ${g}, ${b})`;
    const primaryHover = `rgb(${Math.max(0, r - 24)}, ${Math.max(0, g - 24)}, ${Math.max(0, b - 24)})`;
    const accent = `rgb(${Math.min(255, 255 - r + 32)}, ${Math.min(255, 255 - g + 32)}, ${Math.min(255, 255 - b + 32)})`;
    return { primary, primaryHover, accent, cardBg: "#f6f8fc" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function ingestFile(file: File): Promise<IngestResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "svg"].includes(extension)) {
    return { fileName: file.name, kind: "branding", entries: [], note: "Corporate colors sampled from the uploaded mark.", palette: await extractPalette(file) };
  }
  if (["txt", "md", "pdf", "docx", "eml"].includes(extension)) {
    const rows = await parseDocument(file);
    return { fileName: file.name, kind: "document", entries: rowsToEntries(rows, file.name), note: `${rows.length} document passages normalized locally.` };
  }
  if (["csv"].includes(extension)) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data && parsed.data.length ? parsed.data : parseCsvFallback(text);
    return { fileName: file.name, kind: "data", entries: rowsToEntries(rows, file.name), note: "CSV columns typed and normalized locally." };
  }
  if (["xlsx", "xls"].includes(extension)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const rows: Record<string, unknown>[] = [];
    workbook.SheetNames.forEach((sheetName: string) => {
      const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
      sheetRows.forEach((row: any) => rows.push({ sheet: sheetName, ...row }));
    });
    return { fileName: file.name, kind: "data", entries: rowsToEntries(rows, file.name), note: `${rows.length} spreadsheet rows normalized locally.` };
  }
  throw new Error(`No offline parser is available for .${extension || "this"} yet.`);
}

export function evaluateConfidence(
  fileName: string,
  entries: DataEntry[]
): { suggestedCategory: DataCategory | null; confidenceScore: number } {
  if (!entries.length) {
    return { suggestedCategory: null, confidenceScore: 30 };
  }

  const categoryScores: Record<DataCategory, number> = {
    sales: 0,
    employees: 0,
    inventory: 0,
    contracts: 0,
    tasks: 0,
    expenses: 0,
  };

  const name = fileName.toLowerCase();
  if (/sale|deal|order|quote|churn|revenue|client|customer/.test(name)) categoryScores.sales += 35;
  if (/employee|staff|worker|retention|attrition|hr|people|headcount/.test(name)) categoryScores.employees += 35;
  if (/inventory|stock|warehouse|sku|shipment|logistics|delivery|unit/.test(name)) categoryScores.inventory += 35;
  if (/contract|agreement|renewal|vendor|legal/.test(name)) categoryScores.contracts += 35;
  if (/task|ticket|sla|project|backlog|escalat|issue/.test(name)) categoryScores.tasks += 35;
  if (/expense|cost|spend|invoice|payment|bill/.test(name)) categoryScores.expenses += 35;

  const sample = entries.slice(0, 15);
  for (const entry of sample) {
    const keys = Object.keys(entry).join(" ").toLowerCase();
    const values = Object.values(entry).slice(0, 10).join(" ").toLowerCase();
    const text = `${keys} ${values}`;

    if (/customer|orderid|dealtype|revenue|quote|margin/.test(text)) categoryScores.sales += 5;
    if (/employeeid|department|role|tenure|review/.test(text)) categoryScores.employees += 5;
    if (/sku|units|fillrate|shipmentstatus|warehouse/.test(text)) categoryScores.inventory += 5;
    if (/contractid|renewaldate|vendor|agreement/.test(text)) categoryScores.contracts += 5;
    if (/taskid|queue|sla|priority|ticket/.test(text)) categoryScores.tasks += 5;
    if (/invoiceid|vendor|amount|approved|expense/.test(text)) categoryScores.expenses += 5;
  }

  const sorted = (Object.entries(categoryScores) as [DataCategory, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const [topCategory, topScore] = sorted[0];
  const secondScore = sorted[1]?.[1] || 0;

  if (topScore === 0) {
    return { suggestedCategory: null, confidenceScore: 40 };
  }

  let confidence: number;
  if (topScore >= 45 && (topScore - secondScore) >= 15) {
    confidence = Math.min(98, 86 + Math.round((topScore - secondScore) / 4));
  } else if (topScore >= 30) {
    confidence = Math.min(84, 68 + Math.round((topScore - secondScore) / 2));
  } else {
    confidence = Math.min(65, 45 + topScore);
  }

  return {
    suggestedCategory: topCategory,
    confidenceScore: confidence,
  };
}

