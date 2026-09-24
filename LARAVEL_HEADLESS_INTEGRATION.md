# 🛡️ COREERP × OMNIDASH FUSIONS-HANDBUCH (LARAVEL 12 INTEGRATION)
**Status:** Definitives Übergabe- und Integrationsdokument für das Laravel-Backend-Team  
**Zielarchitektur:** Headless Laravel 12 Enterprise REST-API + Laravel Reverb WebSockets + React 19/Vite PWA (Offline-First)  
**Datum:** 25. September 2026  
**Autor:** OmniDash Engineering Team  

---

## Executive Summary & Systemübersicht

OmniDash wurde von einem klassischen Dashboard zu einem vollwertigen, **Offline-fähigen Enterprise Operating System (PWA)** transformiert. Um maximale Skalierbarkeit, Ausfallsicherheit und Benutzerergonomie zu garantieren, wird die bisherige monolithische Auslieferung über **Laravel Blade** vollständig abgelöst.

Das System gliedert sich in folgende Verantwortungsbereiche:
1. **Frontend (OmniDash Client):** Autonome Single Page Application (React 19 + TypeScript + Tailwind CSS), orchestriert über Dexie.js (IndexedDB), die auch bei vollständigem Netzwerkausfall uneingeschränkt operiert.
2. **Backend (CoreERP / Laravel 12):** Reines Headless-System. Verantwortlich für Authentifizierung (Sanctum), Datenpersistenz (Eloquent ORM / PostgreSQL / MariaDB), asynchrone Jobs (Laravel Queue / Scheduler), bidirektionale Echtzeit-Synchronisation (Laravel Reverb) sowie semantische Vektorsuche & LLM-Inferenz (NativeRAG + Ollama Qwen3 8B).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OMNIDASH CLIENT (PWA)                           │
│  React 19 │ Tailwind │ Dexie.js (IndexedDB) │ Command Palette (Ctrl+K) │
└──────────────────┬────────────────────────────────▲────────────────────┘
                   │                                │
    REST / JSON    │ POST /api/sync                 │ WebSockets (Reverb)
    (Sanctum Auth) │ (Batched Mutations)            │ Live Broadcast Events
                   ▼                                │
┌───────────────────────────────────────────────────┴────────────────────┐
│                    COREERP BACKEND (LARAVEL 12)                        │
│  REST API Routing  │ Eloquent ORM │ Laravel Queue │ Scheduler          │
│  NativeRAG Engine  │ Ollama Bridge (Qwen3 8B)     │ Laravel Reverb     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Vom Monolithen zur Headless-Architektur (Blade zu React/Vite SPA)

### 1.1 Ablösung der Blade-Views
Die bisher in `resources/views/` befindlichen Blade-Templates (wie `dashboard.blade.php`, `sales.blade.php`, etc.) werden aus dem Rendering-Pfad entfernt. CoreERP fungiert künftig ausschließlich als **stateless REST-API** (`routes/api.php`) sowie als Auslieferungsserver für die kompilierten PWA-Assets.

### 1.2 Build-Pipeline & Asset-Bereitstellung
Das Frontend wird mittels Vite kompiliert:
```bash
# Im OmniDash-Stammverzeichnis
npm run build
```
Der Build-Prozess generiert im Verzeichnis `dist/` ein vollständig inlined, ultra-optimiertes Single-File-Artefakt (`index.html`) sowie den Service Worker (`sw.js`).

**Deployment-Anweisung für Laravel:**
1. Kopieren Sie den Inhalt des `dist/`-Verzeichnisses in den öffentlichen Web-Root von Laravel (`public/`).
2. Konfigurieren Sie `routes/web.php` so, dass sämtliche nicht-API-Routen auf die PWA umgeleitet werden (SPA-Fallback):

```php
<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes - Single Page Application Catch-All
|--------------------------------------------------------------------------
| Alle GET-Anfragen, die nicht mit /api oder /sanctum beginnen,
| liefern die kompilierte OmniDash Single Page Application aus.
*/

Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '^(?!api|sanctum).*$');
```

### 1.3 Webserver-Konfiguration (Nginx Beispiel)
Stellen Sie sicher, dass PWA-Routen direkt aufgelöst werden und der Service Worker mit den korrekten Cache-Headern ausgeliefert wird:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Service-Worker-Allowed "/";
}
```

---

## Phase 2: Authentifizierung & Session-Management

### 2.1 Authentifizierungsmodell (Laravel Sanctum)
OmniDash unterstützt sowohl Cookie-basierte Sessions (SPA-Modus via `EnsureFrontendRequestsAreStateful`) als auch Bearer-Token-Header. Für die nahtlose Browser-Nutzung wird **Sanctum SPA-Cookie-Auth** empfohlen.

1. **CSRF-Initialisierung:** Beim Laden der PWA ruft der Client `GET /sanctum/csrf-cookie` auf.
2. **Login:** Über `POST /api/login` authentifiziert sich der Benutzer.
3. **Identität:** Über `GET /api/user` erhält das Frontend das Benutzerobjekt:
   ```json
   {
     "id": 1,
     "name": "Ulises Pérez",
     "initials": "UP",
     "email": "u.perez@company.de",
     "role": "Quality Control / IT Admin",
     "verified": true
   }
   ```

### 2.2 Abmelde-Prozess ("Log out" Button)
In der Topbar von OmniDash ([`src/components/Topbar.tsx`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/components/Topbar.tsx)) existiert im Benutzerprofil das Aktions-Element **"Cerrar sesión" / "Abmelden"**.

**Backend-Implementierung (`routes/api.php`):**
```php
Route::middleware('auth:sanctum')->post('/logout', function (Request $request) {
    // Session-Invalidierung & CSRF-Token-Erneuerung
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    // Falls Token-basiert:
    if ($request->user()->currentAccessToken()) {
        $request->user()->currentAccessToken()->delete();
    }

    return response()->json(['message' => 'Erfolgreich abgemeldet.'], 200);
});
```

### 2.3 Handhabung von `401 Unauthorized` & Datensicherheit
Wenn eine Anfrage an das Backend mit dem HTTP-Statuscode **`401 Unauthorized`** beantwortet wird (z. B. durch Sitzungsablauf oder serverseitige Rechtesperrung), reagiert der OmniDash-Client unmittelbar:
- **Lokaler Workspace-Purge:** Zum Schutz vertraulicher Unternehmensdaten auf Shared-Desktops werden alle temporären und sensiblen Dexie.js-Tabellen gelöscht:
  ```typescript
  await db.dataEntries.clear();
  await db.actionQueue.clear();
  await db.stagingEntries.clear();
  await db.syncQueue.clear();
  ```
- **Login-Redirect:** Der Benutzer wird umgehend auf die Anmeldeseite (`/login`) weitergeleitet.

---

## Phase 3: Daten-Synchronisation (Outbox-Pattern & Hintergrundaufgaben)

### 3.1 Das Offline-First Outbox-Pattern
OmniDash speichert jede Erstellung, Aktualisierung oder Löschung zuerst in der lokalen Tabelle `sync_queue` ([`src/hooks/useSyncManager.ts`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/hooks/useSyncManager.ts)). Dadurch blockiert die UI niemals bei Netzwerklatenz oder Verbindungsverlust. Sobald die Online-Verbindung aktiv ist, sendet das Frontend gesammelte Mutationen an `POST /api/sync`.

### 3.2 Das Datenformat von `POST /api/sync`
```json
{
  "batchId": "batch_98f7a6b5-4321",
  "clientTimestamp": "2026-09-25T00:15:00.000Z",
  "mutations": [
    {
      "id": "sync_c1d2e3f4",
      "actionType": "SAVE_ENTRIES",
      "category": "sales",
      "payload": {
        "id": "entry_01h8x9abc",
        "category": "sales",
        "orderId": "ORD-9482",
        "customer": "Apex Global Logistics",
        "revenue": 145000.50,
        "margin": 0.28,
        "status": "On track"
      }
    },
    {
      "id": "sync_e5f6g7h8",
      "actionType": "RESOLVE_ACTION",
      "entityId": "act_8832a",
      "payload": {
        "entryId": "entry_01h8x9abc",
        "entryHint": { "status": "Delivered" }
      }
    }
  ]
}
```

### 3.3 Backend-Verarbeitung mit Transaktionen & Laravel Queues
Um Dateninkonsistenzen und Race Conditions zu verhindern, muss die Verarbeitung atomar und idempotent erfolgen.

**Implementierungs-Vorschlag (`app/Http/Controllers/Api/SyncController.php`):**
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Jobs\ProcessIngestionQueue;
use App\Models\DataEntry;
use App\Models\ActionQueue;

class SyncController extends Controller
{
    public function sync(Request $request)
    {
        $validated = $request->validate([
          'batchId' => 'required|string',
          'mutations' => 'required|array',
          'mutations.*.id' => 'required|string',
          'mutations.*.actionType' => 'required|string',
          'mutations.*.payload' => 'required|array',
        ]);

        $processedIds = [];

        DB::transaction(function () use ($validated, &$processedIds) {
            foreach ($validated['mutations'] as $mutation) {
                // Idempotenz-Schutz: Wurde diese Mutation bereits verarbeitet?
                if (DB::table('synced_mutations')->where('mutation_id', $mutation['id'])->exists()) {
                    $processedIds[] = $mutation['id'];
                    continue;
                }

                switch ($mutation['actionType']) {
                    case 'SAVE_ENTRIES':
                        DataEntry::updateOrCreate(
                            ['client_id' => $mutation['payload']['id']],
                            $mutation['payload']
                        );
                        break;

                    case 'RESOLVE_ACTION':
                        ActionQueue::where('id', $mutation['payload']['actionId'] ?? $mutation['entityId'])
                            ->update(['resolved' => true, 'resolved_at' => now()]);
                        break;

                    case 'APPROVE_STAGING_ITEM':
                        // Übergabe an asynchrone Laravel Queue für rechenintensive Validierung
                        dispatch(new ProcessIngestionQueue($mutation['payload']));
                        break;
                }

                DB::table('synced_mutations')->insert([
                    'mutation_id' => $mutation['id'],
                    'created_at' => now(),
                ]);

                $processedIds[] = $mutation['id'];
            }
        });

        return response()->json([
            'success' => true,
            'processedCount' => count($processedIds),
            'processedIds' => $processedIds,
            'serverTimestamp' => now()->toIso8601String(),
        ], 200);
    }
}
```

### 3.4 Zusammenspiel mit Laravel Scheduler & Worker
CoreERP führt im Hintergrund Aufgaben wie E-Mail-Ingestion (IMAP/SMTP), Rechnungsprüfung und automatisierte Mahnläufe aus:
```bash
# Produktions-Daemon für asynchrone Aufträge
php artisan queue:work --tries=3 --timeout=90

# Scheduler für regelmäßige Jobs (z. B. Ingestion-Polling)
php artisan schedule:run
```

---

## Phase 4: Echtzeit-Kommunikation mit Laravel Reverb

### 4.1 Reverb WebSocket-Architektur
CoreERP nutzt **Laravel Reverb** als hochperformanten WebSocket-Server. Sobald ein Benutzer oder ein Hintergrund-Worker (z. B. IMAP-Ingestion) einen Datensatz modifiziert, wird ein Event ausgestrahlt, das alle aktiven OmniDash-Clients in Echtzeit synchronisiert.

### 4.2 Definition des Broadcast-Events
Erstellen Sie das Event `app/Events/EntityUpdatedEvent.php`:
```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EntityUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $type,        // 'ENTRY_UPDATED', 'ACTION_CREATED', 'STAGING_READY'
        public string $category,    // 'sales', 'purchasing', etc.
        public array $data          // Datensatz-Payload
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('enterprise-workspace'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'entity.updated';
    }
}
```

### 4.3 Trigger in Eloquent-Modellen
Verankern Sie das Broadcasting in den Modell-Hooks oder Repositories:
```php
// In DataEntry.php oder im Observer
protected static function booted()
{
    static::saved(function ($entry) {
        broadcast(new EntityUpdatedEvent('ENTRY_UPDATED', $entry->category, $entry->toArray()));
    });
}
```

### 4.4 Anbindung im Frontend (`useSyncManager.ts`)
Das Frontend abonniert den Reverb-Kanal via `laravel-echo` / `pusher-js`. Sobald ein Event empfangen wird, aktualisiert der Client gezielt den lokalen Dexie.js-Speicher:
```typescript
// Client-seitige Abonnierung in useSyncManager.ts
window.Echo.private('enterprise-workspace')
  .listen('.entity.updated', async (event: { type: string; category: string; data: any }) => {
    console.log('[Reverb] Live-Aktualisierung empfangen:', event);
    if (event.type === 'ENTRY_UPDATED') {
      await db.dataEntries.put(event.data);
      window.dispatchEvent(new CustomEvent('omnidash:local-data-changed'));
    }
  });
```

---

## Phase 5: KI-Integration & OmniSearch (Ollama + NativeRAG)

### 5.1 Architektur der hybriden OmniSearch
Die in Phase 18 eingeführte **OmniSearch Command Palette** ([`src/components/OmniSearch.tsx`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/components/OmniSearch.tsx)) reagiert global auf `Ctrl + K` bzw. `Cmd + K`.

Bislang durchsucht sie clientseitig die lokalen Dexie.js-Tabellen. Durch die Fusion mit CoreERP wird sie an den **NativeRAG-Endpunkt** angebunden:
1. **Sofort-Ergebnisse (0ms):** Lokale IndexedDB-Navigation & häufigste Aktionen.
2. **Tiefensuche & semantische KI-Abfrage (~180ms):** Hintergrundanfrage an `POST /api/omnisearch`. CoreERP führt eine Vektorsuche in Dokumenten, Verträgen und E-Mails durch und nutzt **Ollama mit Qwen3 8B** zur Beantwortung komplexer Fragen.

```
OmniSearch (Ctrl+K)
       │
       ├──► 1. Lokale Dexie.js Suche (Tabellen, Routen, Cached Data) [Sofort]
       │
       └──► 2. POST /api/omnisearch { "query": "..." }
                     │
                     ▼
             CoreERP Backend
                     │
                     ├──► NativeRAG Vector Store (Embeddings-Suche)
                     └──► Ollama Inferenz (qwen3:8b)
```

### 5.2 Der NativeRAG Controller (`POST /api/omnisearch`)
Erstellen Sie `app/Http/Controllers/Api/OmniSearchController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\NativeRAGService;

class OmniSearchController extends Controller
{
    public function search(Request $request, NativeRAGService $ragService)
    {
        $query = $request->input('query', '');

        if (empty(trim($query))) {
            return response()->json(['records' => [], 'aiSummary' => null]);
        }

        // 1. Semantische Suche über NativeRAG
        $ragContext = $ragService->similaritySearch($query, $limit = 5);

        // 2. Ollama Inferenz via lokalem Server (Qwen3 8B)
        $aiResponse = Http::timeout(8)->post('http://127.0.0.1:11434/api/generate', [
            'model' => 'qwen3:8b',
            'prompt' => "Kontext aus ERP-Dokumenten:\n" . $ragContext . 
                        "\n\nBenutzerfrage: " . $query . 
                        "\nAntworte in maximal 2 prägnanten Sätzen für das Dashboard.",
            'stream' => false,
        ]);

        $summary = $aiResponse->json('response');

        return response()->json([
            'query' => $query,
            'aiSummary' => $summary,
            'records' => $ragService->formatResultsForOmniSearch($ragContext),
        ]);
    }
}
```

### 5.3 Antwortformat für die Command Palette
Das Frontend erwartet folgendes JSON-Format zur direkten Darstellung:
```json
{
  "query": "Lieferverzögerung Apex Logistics",
  "aiSummary": "Apex Logistics meldet 3 Tage Verzug bei Order ORD-9482 wegen Zollprüfung in Rotterdam.",
  "records": [
    {
      "id": "rag_doc_441",
      "title": "E-Mail: Zollverzögerung Rotterdam Hub",
      "subtitle": "Apex Global Logistics • Vor 2 Stunden",
      "category": "quality",
      "meta": "SLA-Warnung"
    }
  ]
}
```

---

## Phase 6: Referenz-Checkliste für den Go-Live

| Modul | Status | Verantwortlichkeit | Prüfkriterium |
| :--- | :---: | :--- | :--- |
| **Vite Singlefile Build** | ✅ Bereit | Frontend (`npm run build`) | `dist/index.html` liegt in `public/` und lädt fehlerfrei. |
| **SPA Catch-All Route** | ⏳ Offen | Laravel (`routes/web.php`) | Alle Pfade (`/sales`, `/purchasing`) liefern `index.html` aus. |
| **Sanctum SPA Auth** | ⏳ Offen | Laravel (`routes/api.php`) | `401 Unauthorized` löst im Client Dexie-Purge & Redirect aus. |
| **Batch Sync API** | ⏳ Offen | Laravel (`POST /api/sync`) | Mutationen werden in `DB::transaction()` verarbeitet. |
| **Laravel Reverb WS** | ⏳ Offen | Laravel & Echo | Client empfängt `.entity.updated` und refresht Dexie. |
| **NativeRAG / Ollama** | ⏳ Offen | CoreERP / Ollama | `POST /api/omnisearch` beantwortet Suchanfragen mit Qwen3 8B. |

---

## Wichtige Dateipfade im Frontend zur Referenz

- **API Repositories & Typen:** [`src/services/api.ts`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/services/api.ts) & [`src/types/index.ts`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/types/index.ts)
- **Lokale IndexedDB-Definition (Dexie.js):** [`src/lib/db.ts`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/lib/db.ts)
- **Synchronisations-Manager (Outbox):** [`src/hooks/useSyncManager.ts`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/hooks/useSyncManager.ts)
- **OmniSearch Command Palette:** [`src/components/OmniSearch.tsx`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/components/OmniSearch.tsx)
- **Topbar & Benutzerprofil:** [`src/components/Topbar.tsx`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/components/Topbar.tsx)
- **Internationalisierung (7 Sprachen):** [`src/locales/index.ts`](file:///c:/Users/titou/Desktop/Desarrollo/Proyectos%20activos/Omni%20Dash/DashGenerator/src/locales/index.ts)
