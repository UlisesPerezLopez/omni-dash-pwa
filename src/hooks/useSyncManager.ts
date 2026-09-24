import { useState, useEffect, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { api, isServerMode } from "../services/api";
import type { SyncQueueRecord } from "../types";

export interface UseSyncManagerResult {
  isOnline: boolean;
  pendingSyncCount: number;
  pendingRecords: SyncQueueRecord[];
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  lastSyncAt: string | null;
}

/**
 * Outbox pattern sync manager hook.
 * Monitors network online/offline state and dispatches pending mutations to /api/sync.
 */
export function useSyncManager(): UseSyncManagerResult {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  // Live query for pending records in the sync_queue table
  const syncQueue = useLiveQuery(
    () => db.sync_queue.toArray(),
    []
  );

  const pendingRecords = (syncQueue ?? []).filter((r) => r.status === "pending");
  const pendingSyncCount = pendingRecords.length;

  /**
   * Attempts to process all pending sync_queue records via dummy /api/sync or local mock.
   */
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    const pending = await api.getPendingSyncQueue();
    if (!pending || pending.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      if (!isServerMode) {
        // Mock sync request in local mode (simulate 500ms network latency)
        await new Promise((resolve) => setTimeout(resolve, 500));
        const ids = pending.map((item) => item.id);
        await api.markSyncBatch(ids, "synced");
        setLastSyncAt(new Date().toISOString());
        console.log(`[Mock Sync] Synced ${pending.length} items`);
      } else {
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ batch: pending }),
        });

        if (response.ok) {
          const ids = pending.map((item) => item.id);
          await api.markSyncBatch(ids, "synced");
          setLastSyncAt(new Date().toISOString());
        } else {
          // Server returned an error (e.g. 500/400)
          console.warn(`[SyncManager] /api/sync returned status ${response.status}`);
          const ids = pending.map((item) => item.id);
          await api.markSyncBatch(ids, "failed");
        }
      }
    } catch (err) {
      // In offline conditions or when no server is listening, fetch fails.
      // Records remain "pending" to retry when connectivity is restored.
      console.warn("[SyncManager] Offline or endpoint unreachable; mutations queued:", err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Listen to window online & offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check on mount if online and items are queued
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncNow();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  // Auto-sync when new mutations are queued and we are online
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine && pendingSyncCount > 0) {
      void syncNow();
    }
  }, [pendingSyncCount, syncNow]);

  // Periodic background sync attempt every 30 seconds (if online and items are queued)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine && pendingSyncCount > 0) {
        void syncNow();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [pendingSyncCount, syncNow]);

  return {
    isOnline,
    pendingSyncCount,
    pendingRecords,
    isSyncing,
    syncNow,
    lastSyncAt,
  };
}
