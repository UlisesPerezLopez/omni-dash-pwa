import { useState, useEffect, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  getEntries as localGetEntries,
  saveEntries as localSaveEntries,
  clearEntries as localClearEntries,
  syncActionQueue as localSyncActionQueue,
  resolveActionInDb as localResolveAction,
  snoozeActionInDb as localSnoozeAction,
  seedDemoData as localSeedDemoData,
  getSettings as localGetSettings,
  saveSettings as localSaveSettings,
  getWidgets as localGetWidgets,
  saveWidgets as localSaveWidgets,
  createSnapshot as localCreateSnapshot,
  getStagingItems as localGetStagingItems,
  addStagingItem as localAddStagingItem,
  approveStagingItem as localApproveStagingItem,
  rejectStagingItem as localRejectStagingItem,
  pushSyncQueue as localPushSyncQueue,
  getSyncQueue as localGetSyncQueue,
  getPendingSyncRecords as localGetPendingSyncRecords,
  updateSyncStatus as localUpdateSyncStatus,
  markSyncBatch as localMarkSyncBatch,
} from "../lib/db";
import type {
  DataEntry,
  ActionQueueRecord,
  WidgetSetting,
  StagingEntry,
  DataCategory,
  SyncQueueRecord,
  SyncStatus,
  AppSetting,
} from "../types";

export interface SnapshotData {
  app: string;
  exportedAt: string;
  entries: DataEntry[];
  queue: ActionQueueRecord[];
  settings: Record<string, unknown>;
  widgets: WidgetSetting[];
  staging?: StagingEntry[];
  syncQueue?: SyncQueueRecord[];
}

/**
 * Standardized repository interface decoupling data access from Dexie or remote APIs.
 */
export interface DashboardRepository {
  getEntries(): Promise<DataEntry[]>;
  saveEntries(entries: DataEntry[]): Promise<void>;
  clearEntries(): Promise<void>;
  getQueue(): Promise<ActionQueueRecord[]>;
  syncActionQueue(entries: DataEntry[]): Promise<void>;
  resolveAction(actionId: string, entryId?: string, entryHint?: Record<string, unknown>): Promise<void>;
  snoozeAction(actionId: string): Promise<void>;
  seedDemoData(count?: number): Promise<DataEntry[]>;
  getSettings(): Promise<Record<string, unknown>>;
  saveSettings(values: Record<string, unknown>): Promise<void>;
  getWidgets(): Promise<WidgetSetting[]>;
  saveWidgets(widgets: WidgetSetting[]): Promise<void>;
  createSnapshot(): Promise<SnapshotData>;
  getStagingItems(): Promise<StagingEntry[]>;
  addStagingItem(item: StagingEntry): Promise<void>;
  approveStagingItem(id: string, overrideCategory?: DataCategory): Promise<void>;
  rejectStagingItem(id: string): Promise<void>;
  getSyncQueue(): Promise<SyncQueueRecord[]>;
  getPendingSyncQueue(): Promise<SyncQueueRecord[]>;
  updateSyncStatus(id: string, status: SyncStatus): Promise<void>;
  markSyncBatch(ids: string[], status: SyncStatus): Promise<void>;
}


/**
 * Local IndexedDB/Dexie repository implementation.
 */
export class LocalRepository implements DashboardRepository {
  async getEntries(): Promise<DataEntry[]> {
    return localGetEntries();
  }

  async saveEntries(entries: DataEntry[]): Promise<void> {
    await localSaveEntries(entries);
    await localPushSyncQueue("SAVE_ENTRIES", entries);
  }

  async clearEntries(): Promise<void> {
    await localClearEntries();
    await localPushSyncQueue("CLEAR_ENTRIES", null);
  }

  async getQueue(): Promise<ActionQueueRecord[]> {
    return db.action_queue.toArray();
  }

  async syncActionQueue(entries: DataEntry[]): Promise<void> {
    return localSyncActionQueue(entries);
  }

  async resolveAction(actionId: string, entryId?: string, entryHint?: Record<string, unknown>): Promise<void> {
    await localResolveAction(actionId, entryId, entryHint);
    await localPushSyncQueue("RESOLVE_ACTION", { actionId, entryId, entryHint }, actionId);
  }

  async snoozeAction(actionId: string): Promise<void> {
    await localSnoozeAction(actionId);
    await localPushSyncQueue("SNOOZE_ACTION", { actionId }, actionId);
  }

  async seedDemoData(count = 1250): Promise<DataEntry[]> {
    const entries = await localSeedDemoData(count);
    await localPushSyncQueue("SEED_DEMO_DATA", { count, entriesCount: entries.length });
    return entries;
  }

  async getSettings(): Promise<Record<string, unknown>> {
    return localGetSettings();
  }

  async saveSettings(values: Record<string, unknown>): Promise<void> {
    await localSaveSettings(values);
    await localPushSyncQueue("SAVE_SETTINGS", values);
  }

  async getWidgets(): Promise<WidgetSetting[]> {
    return localGetWidgets();
  }

  async saveWidgets(widgets: WidgetSetting[]): Promise<void> {
    await localSaveWidgets(widgets);
    await localPushSyncQueue("SAVE_WIDGETS", widgets);
  }

  async createSnapshot(): Promise<SnapshotData> {
    return localCreateSnapshot();
  }

  async getStagingItems(): Promise<StagingEntry[]> {
    return localGetStagingItems();
  }

  async addStagingItem(item: StagingEntry): Promise<void> {
    await localAddStagingItem(item);
    await localPushSyncQueue("ADD_STAGING_ITEM", item, item.id);
  }

  async approveStagingItem(id: string, overrideCategory?: DataCategory): Promise<void> {
    await localApproveStagingItem(id, overrideCategory);
    await localPushSyncQueue("APPROVE_STAGING_ITEM", { id, overrideCategory }, id);
  }

  async rejectStagingItem(id: string): Promise<void> {
    await localRejectStagingItem(id);
    await localPushSyncQueue("REJECT_STAGING_ITEM", { id }, id);
  }

  async getSyncQueue(): Promise<SyncQueueRecord[]> {
    return localGetSyncQueue();
  }

  async getPendingSyncQueue(): Promise<SyncQueueRecord[]> {
    return localGetPendingSyncRecords();
  }

  async updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
    return localUpdateSyncStatus(id, status);
  }

  async markSyncBatch(ids: string[], status: SyncStatus): Promise<void> {
    return localMarkSyncBatch(ids, status);
  }
}

/**
 * Dummy Server repository implementation targeting a Laravel backend (CoreERP).
 */
export class ServerRepository implements DashboardRepository {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (import.meta.env.VITE_API_BASE_URL as string) || "/api";
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Server API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getEntries(): Promise<DataEntry[]> {
    try {
      return await this.request<DataEntry[]>("/entries");
    } catch (err) {
      console.warn("[ServerRepository] getEntries fallback:", err);
      return [];
    }
  }

  async saveEntries(entries: DataEntry[]): Promise<void> {
    try {
      await this.request<void>("/entries", {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
    } catch (err) {
      console.warn("[ServerRepository] saveEntries error:", err);
    }
  }

  async clearEntries(): Promise<void> {
    try {
      await this.request<void>("/entries", {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[ServerRepository] clearEntries error:", err);
    }
  }

  async getQueue(): Promise<ActionQueueRecord[]> {
    try {
      return await this.request<ActionQueueRecord[]>("/actions");
    } catch (err) {
      console.warn("[ServerRepository] getQueue fallback:", err);
      return [];
    }
  }

  async syncActionQueue(entries: DataEntry[]): Promise<void> {
    try {
      await this.request<void>("/actions/sync", {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
    } catch (err) {
      console.warn("[ServerRepository] syncActionQueue error:", err);
    }
  }

  async resolveAction(actionId: string, entryId?: string, entryHint?: Record<string, unknown>): Promise<void> {
    try {
      await this.request<void>(`/actions/${actionId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ entryId, entryHint }),
      });
    } catch (err) {
      console.warn("[ServerRepository] resolveAction error:", err);
    }
  }

  async snoozeAction(actionId: string): Promise<void> {
    try {
      await this.request<void>(`/actions/${actionId}/snooze`, {
        method: "POST",
      });
    } catch (err) {
      console.warn("[ServerRepository] snoozeAction error:", err);
    }
  }

  async seedDemoData(count = 1250): Promise<DataEntry[]> {
    try {
      return await this.request<DataEntry[]>("/demo/seed", {
        method: "POST",
        body: JSON.stringify({ count }),
      });
    } catch (err) {
      console.warn("[ServerRepository] seedDemoData error:", err);
      return [];
    }
  }

  async getSettings(): Promise<Record<string, unknown>> {
    try {
      return await this.request<Record<string, unknown>>("/settings");
    } catch (err) {
      console.warn("[ServerRepository] getSettings fallback:", err);
      return {};
    }
  }

  async saveSettings(values: Record<string, unknown>): Promise<void> {
    try {
      await this.request<void>("/settings", {
        method: "POST",
        body: JSON.stringify(values),
      });
    } catch (err) {
      console.warn("[ServerRepository] saveSettings error:", err);
    }
  }

  async getWidgets(): Promise<WidgetSetting[]> {
    try {
      return await this.request<WidgetSetting[]>("/widgets");
    } catch (err) {
      console.warn("[ServerRepository] getWidgets fallback:", err);
      return [];
    }
  }

  async saveWidgets(widgets: WidgetSetting[]): Promise<void> {
    try {
      await this.request<void>("/widgets", {
        method: "POST",
        body: JSON.stringify(widgets),
      });
    } catch (err) {
      console.warn("[ServerRepository] saveWidgets error:", err);
    }
  }

  async createSnapshot(): Promise<SnapshotData> {
    try {
      return await this.request<SnapshotData>("/snapshot");
    } catch (err) {
      console.warn("[ServerRepository] createSnapshot fallback:", err);
      return {
        app: "OmniDash Enterprise OS",
        exportedAt: new Date().toISOString(),
        entries: [],
        queue: [],
        settings: {},
        widgets: [],
      };
    }
  }

  async getStagingItems(): Promise<StagingEntry[]> {
    try {
      return await this.request<StagingEntry[]>("/staging");
    } catch (err) {
      console.warn("[ServerRepository] getStagingItems fallback:", err);
      return [];
    }
  }

  async addStagingItem(item: StagingEntry): Promise<void> {
    try {
      await this.request<void>("/staging", {
        method: "POST",
        body: JSON.stringify(item),
      });
    } catch (err) {
      console.warn("[ServerRepository] addStagingItem error:", err);
    }
  }

  async approveStagingItem(id: string, overrideCategory?: DataCategory): Promise<void> {
    try {
      await this.request<void>(`/staging/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ category: overrideCategory }),
      });
    } catch (err) {
      console.warn("[ServerRepository] approveStagingItem error:", err);
    }
  }

  async rejectStagingItem(id: string): Promise<void> {
    try {
      await this.request<void>(`/staging/${id}/reject`, {
        method: "POST",
      });
    } catch (err) {
      console.warn("[ServerRepository] rejectStagingItem error:", err);
    }
  }

  async getSyncQueue(): Promise<SyncQueueRecord[]> {
    return [];
  }

  async getPendingSyncQueue(): Promise<SyncQueueRecord[]> {
    return [];
  }

  async updateSyncStatus(_id: string, _status: SyncStatus): Promise<void> {
    // No-op in server mode
  }

  async markSyncBatch(_ids: string[], _status: SyncStatus): Promise<void> {
    // No-op in server mode
  }
}

export const isServerMode = import.meta.env.VITE_API_MODE === "server";

export const api: DashboardRepository = isServerMode
  ? new ServerRepository()
  : new LocalRepository();

export interface UseDashboardDataResult {
  records: DataEntry[];
  queueRecords: ActionQueueRecord[];
  stagingItems: StagingEntry[];
  settings: Record<string, unknown>;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Custom hook abstracting useLiveQuery (Dexie) and standard React state (Server mode).
 */
export function useDashboardData(): UseDashboardDataResult {
  const [serverRecords, setServerRecords] = useState<DataEntry[]>([]);
  const [serverQueue, setServerQueue] = useState<ActionQueueRecord[]>([]);
  const [serverStaging, setServerStaging] = useState<StagingEntry[]>([]);
  const [serverSettings, setServerSettings] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState<boolean>(isServerMode);

  // Live queries active when in local mode
  const liveDbRecords = useLiveQuery<DataEntry[]>(
    () => (isServerMode ? Promise.resolve([] as DataEntry[]) : db.data_entries.toArray()),
    []
  );
  const liveQueue = useLiveQuery<ActionQueueRecord[]>(
    () => (isServerMode ? Promise.resolve([] as ActionQueueRecord[]) : db.action_queue.toArray()),
    []
  );
  const liveStaging = useLiveQuery<StagingEntry[]>(
    () => (isServerMode ? Promise.resolve([] as StagingEntry[]) : db.staging_inbox.toArray()),
    []
  );
  const liveSettingsRows = useLiveQuery<AppSetting[]>(
    () => (isServerMode ? Promise.resolve([] as AppSetting[]) : db.app_settings.toArray()),
    []
  );

  const fetchServerData = useCallback(async () => {
    if (!isServerMode) return;
    setIsLoading(true);
    try {
      const [entries, queue, staging, sett] = await Promise.all([
        api.getEntries(),
        api.getQueue(),
        api.getStagingItems(),
        api.getSettings(),
      ]);
      setServerRecords(entries || []);
      setServerQueue(queue || []);
      setServerStaging(staging || []);
      setServerSettings(sett || {});
    } catch (err) {
      console.warn("[useDashboardData] Server fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isServerMode) {
      void fetchServerData();
    }
  }, [fetchServerData]);

  const records = isServerMode ? serverRecords : (liveDbRecords ?? []);
  const queueRecords = isServerMode ? serverQueue : (liveQueue ?? []);
  const stagingItems = isServerMode ? serverStaging : (liveStaging ?? []);
  const settings = useMemo(() => {
    if (isServerMode) return serverSettings;
    if (!liveSettingsRows) return {};
    return Object.fromEntries(liveSettingsRows.map((row) => [row.key, row.value]));
  }, [liveSettingsRows, serverSettings]);

  return {
    records,
    queueRecords,
    stagingItems,
    settings,
    isLoading,
    refresh: fetchServerData,
  };
}
