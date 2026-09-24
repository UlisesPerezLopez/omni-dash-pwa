import Dexie, { type Table } from "dexie";
import type {
  DataEntry,
  ActionQueueRecord,
  AppSetting,
  WidgetSetting,
  StagingEntry,
  DataCategory,
  SyncQueueRecord,
  SyncStatus,
} from "../types";
import { generateDemoEntries } from "./demo";
import { buildActionItems } from "../components/ActionCenter";

export class OmniDashDB extends Dexie {
  data_entries!: Table<DataEntry, string>;
  action_queue!: Table<ActionQueueRecord, string>;
  app_settings!: Table<AppSetting, string>;
  custom_widgets!: Table<WidgetSetting, string>;
  staging_inbox!: Table<StagingEntry, string>;
  sync_queue!: Table<SyncQueueRecord, string>;

  constructor() {
    super("omnidash_enterprise_os");
    this.version(2).stores({
      data_entries: "id, category, ingestedAt, sourceName, date, site, region, status, dealType, shipmentStatus, priority, resolved, approved",
      action_queue: "id, kind, priority, resolved, snoozedAt, entryId",
      app_settings: "key, updatedAt",
      custom_widgets: "id, visible, pinned",
    });
    this.version(3).stores({
      data_entries: "id, category, ingestedAt, sourceName, date, site, region, status, dealType, shipmentStatus, priority, resolved, approved",
      action_queue: "id, kind, priority, resolved, snoozedAt, entryId",
      app_settings: "key, updatedAt",
      custom_widgets: "id, visible, pinned",
      staging_inbox: "id, status, confidenceScore, ingestedAt",
    });
    this.version(4).stores({
      data_entries: "id, category, ingestedAt, sourceName, date, site, region, status, dealType, shipmentStatus, priority, resolved, approved",
      action_queue: "id, kind, priority, resolved, snoozedAt, entryId",
      app_settings: "key, updatedAt",
      custom_widgets: "id, visible, pinned",
      staging_inbox: "id, status, confidenceScore, ingestedAt",
      sync_queue: "id, actionType, entityId, payload, timestamp, status",
    });
  }
}

export const db = new OmniDashDB();


const now = () => new Date().toISOString();

/** Syncs action queue from data entries into IndexedDB */
export async function syncActionQueue(entries: DataEntry[]): Promise<void> {
  if (!entries || entries.length === 0) return;
  const derived = buildActionItems(entries);
  const existingQueue = await db.action_queue.toArray();
  const existingMap = new Map(existingQueue.map((item) => [item.id, item]));

  const recordsToPut: ActionQueueRecord[] = derived.map((item) => {
    const existing = existingMap.get(item.id);
    return {
      ...item,
      resolved: existing ? existing.resolved : false,
      snoozedAt: existing ? existing.snoozedAt : null,
      resolvedAt: existing ? existing.resolvedAt : null,
    };
  });

  if (recordsToPut.length > 0) {
    await db.action_queue.bulkPut(recordsToPut);
  }
}

/** Seeds Dexie with 50+ realistic cross-departmental records and populates action queue */
export async function seedDemoData(count = 1250): Promise<DataEntry[]> {
  const entries = generateDemoEntries(count);
  await db.transaction("rw", [db.data_entries, db.action_queue], async () => {
    await db.data_entries.clear();
    await db.data_entries.bulkPut(entries);
    const derived = buildActionItems(entries);
    await db.action_queue.clear();
    await db.action_queue.bulkPut(
      derived.map((item) => ({
        ...item,
        resolved: false,
        snoozedAt: null,
        resolvedAt: null,
      }))
    );
  });
  return entries;
}

/** Ingest and save entries */
export async function saveEntries(entries: DataEntry[]): Promise<void> {
  if (!entries.length) return;
  await db.data_entries.bulkPut(entries);
  await syncActionQueue(entries);
}

export async function getEntries(): Promise<DataEntry[]> {
  return await db.data_entries.toArray();
}

export async function clearEntries(): Promise<void> {
  await db.transaction("rw", [db.data_entries, db.action_queue], async () => {
    await db.data_entries.clear();
    await db.action_queue.clear();
  });
}

export async function saveSettings(values: Record<string, unknown>): Promise<void> {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, updatedAt: now() }));
  await db.app_settings.bulkPut(rows);
}

export async function getSettings(): Promise<Record<string, unknown>> {
  const rows = await db.app_settings.toArray();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function saveWidgets(widgets: WidgetSetting[]): Promise<void> {
  await db.custom_widgets.bulkPut(widgets);
}

export async function getWidgets(): Promise<WidgetSetting[]> {
  return await db.custom_widgets.toArray();
}

export async function resolveActionInDb(actionId: string, entryId?: string, entryHint?: Record<string, unknown>): Promise<void> {
  await db.transaction("rw", [db.data_entries, db.action_queue], async () => {
    await db.action_queue.update(actionId, {
      resolved: true,
      resolvedAt: now(),
    });
    if (entryId && entryHint) {
      const entry = await db.data_entries.get(entryId);
      if (entry) {
        await db.data_entries.put({ ...entry, ...entryHint });
      }
    }
  });
}

export async function snoozeActionInDb(actionId: string): Promise<void> {
  await db.action_queue.update(actionId, {
    snoozedAt: now(),
  });
}

export async function createSnapshot() {
  const [entries, queue, settings, widgets, staging, syncQueue] = await Promise.all([
    db.data_entries.toArray(),
    db.action_queue.toArray(),
    getSettings(),
    getWidgets(),
    db.staging_inbox.toArray(),
    db.sync_queue.toArray(),
  ]);
  return {
    app: "OmniDash Enterprise OS",
    exportedAt: now(),
    entries,
    queue,
    settings,
    widgets,
    staging,
    syncQueue,
  };
}

export async function getStagingItems(): Promise<StagingEntry[]> {
  return await db.staging_inbox.toArray();
}

export async function addStagingItem(item: StagingEntry): Promise<void> {
  await db.staging_inbox.put(item);
}

export async function approveStagingItem(id: string, overrideCategory?: DataCategory): Promise<void> {
  const item = await db.staging_inbox.get(id);
  if (!item) return;

  const category: DataCategory = overrideCategory || item.suggestedCategory || "sales";
  let entriesToSave: DataEntry[] = [];

  if (Array.isArray(item.rawContent)) {
    entriesToSave = item.rawContent.map((row: any, idx: number) => {
      if (row && typeof row === "object" && "category" in row) {
        return {
          ...row,
          category,
          sourceName: item.originalFileName,
        };
      }
      return {
        id: `staging_${id}_${idx}`,
        category,
        sourceName: item.originalFileName,
        ingestedAt: item.ingestedAt,
        ...(typeof row === "object" ? row : { value: row }),
      };
    });
  } else if (item.rawContent && typeof item.rawContent === "object") {
    entriesToSave = [
      {
        id: `staging_${id}`,
        category,
        sourceName: item.originalFileName,
        ingestedAt: item.ingestedAt,
        ...(item.rawContent as Record<string, unknown>),
      },
    ];
  }

  await db.transaction("rw", [db.data_entries, db.action_queue, db.staging_inbox], async () => {
    if (entriesToSave.length > 0) {
      await db.data_entries.bulkPut(entriesToSave);
      const derived = buildActionItems(entriesToSave);
      if (derived.length > 0) {
        await db.action_queue.bulkPut(
          derived.map((action) => ({
            ...action,
            resolved: false,
            snoozedAt: null,
            resolvedAt: null,
          }))
        );
      }
    }
    await db.staging_inbox.update(id, { status: "approved" });
  });
}

export async function rejectStagingItem(id: string): Promise<void> {
  await db.staging_inbox.update(id, { status: "rejected" });
}

/** Enqueue a mutation into the sync_queue table for outbox offline sync */
export async function pushSyncQueue(
  actionType: string,
  payload: unknown,
  entityId?: string
): Promise<SyncQueueRecord> {
  const record: SyncQueueRecord = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    actionType,
    entityId,
    payload,
    timestamp: now(),
    status: "pending",
  };
  await db.sync_queue.put(record);
  return record;
}

export async function getSyncQueue(): Promise<SyncQueueRecord[]> {
  return await db.sync_queue.toArray();
}

export async function getPendingSyncRecords(): Promise<SyncQueueRecord[]> {
  return await db.sync_queue.where("status").equals("pending").toArray();
}

export async function updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
  await db.sync_queue.update(id, { status });
}

export async function markSyncBatch(ids: string[], status: SyncStatus): Promise<void> {
  await db.transaction("rw", db.sync_queue, async () => {
    for (const id of ids) {
      await db.sync_queue.update(id, { status });
    }
  });
}

export async function clearSyncedQueue(): Promise<void> {
  await db.sync_queue.where("status").equals("synced").delete();
}


