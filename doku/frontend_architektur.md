# Frontend-Architektur: Social Simulation Dashboard

**Erstellt:** 2026-04-29  
**Stack:** Angular 19 + PrimeNG + Tailwind CSS v4 + ECharts + Sigma.js  
**Basis:** Research-Report + Backend-API-Analyse

---

## 1. Tech-Stack & Dependencies

```json
{
  "core": {
    "@angular/core": "^19",
    "@angular/router": "^19",
    "@angular/forms": "^19",
    "@angular/common": "^19"
  },
  "ui": {
    "primeng": "^18",
    "primeicons": "^7",
    "tailwindcss": "^4"
  },
  "charts": {
    "echarts": "^5.6",
    "ngx-echarts": "^18"
  },
  "graph": {
    "sigma": "^3",
    "graphology": "^0.25",
    "graphology-layout-forceatlas2": "^0.10"
  },
  "utils": {
    "date-fns": "^4"
  }
}
```

---

## 2. Ordnerstruktur

```
frontend/src/
├── app/
│   ├── app.component.ts                    ← Shell: Sidebar + Router-Outlet
│   ├── app.config.ts                       ← provideRouter, provideHttpClient
│   ├── app.routes.ts                       ← Top-Level-Routes (lazy)
│   │
│   ├── core/                               ← Singleton-Services, Guards, Interceptors
│   │   ├── services/
│   │   │   ├── api.service.ts              ← HttpClient Wrapper (Base-URL, Error Handling)
│   │   │   ├── simulation.service.ts       ← Simulations-CRUD + Run/Cancel/Reset/Clone
│   │   │   ├── persona.service.ts          ← Persona-Liste, Detail, Chat
│   │   │   ├── post.service.ts             ← Posts, Comments, Reactions
│   │   │   ├── analysis.service.ts         ← Report laden/generieren
│   │   │   ├── sse.service.ts              ← SSE-Stream als RxJS Observable
│   │   │   ├── export.service.ts           ← JSON/CSV Download-Trigger
│   │   │   └── theme.service.ts            ← Dark/Light Mode Toggle (Signal)
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts         ← X-API-Key Header injizieren
│   │   ├── guards/
│   │   │   └── simulation-exists.guard.ts  ← Prüft ob Simulation existiert
│   │   └── models/
│   │       ├── simulation.model.ts         ← Interfaces: Simulation, SimulationConfig, SimulationStats
│   │       ├── persona.model.ts            ← Interfaces: Persona, PersonaState
│   │       ├── content.model.ts            ← Interfaces: Post, Comment, Reaction, InfluenceEvent
│   │       ├── analysis.model.ts           ← Interface: AnalysisReport (10 Felder)
│   │       └── api.model.ts                ← PaginatedResponse<T>, ApiError
│   │
│   ├── shared/                             ← Wiederverwendbare UI-Komponenten
│   │   ├── components/
│   │   │   ├── sidebar/
│   │   │   │   └── sidebar.component.ts    ← Navigation (Logo, Links, Theme-Toggle)
│   │   │   ├── kpi-card/
│   │   │   │   └── kpi-card.component.ts   ← Einzelne Metrik-Karte (Label, Wert, Trend-Icon)
│   │   │   ├── status-badge/
│   │   │   │   └── status-badge.component.ts ← pending/running/completed/failed Badge
│   │   │   ├── platform-icon/
│   │   │   │   └── platform-icon.component.ts ← FeedBook (blau) / Threadit (orange) Icon
│   │   │   ├── persona-avatar/
│   │   │   │   └── persona-avatar.component.ts ← Avatar mit Skeptiker-Indikator
│   │   │   ├── mood-indicator/
│   │   │   │   └── mood-indicator.component.ts  ← Farbcodierte Stimmung
│   │   │   ├── empty-state/
│   │   │   │   └── empty-state.component.ts     ← "Keine Daten" Placeholder
│   │   │   └── confirm-dialog/
│   │   │       └── confirm-dialog.component.ts  ← Bestätigung für Delete/Reset
│   │   └── pipes/
│   │       ├── relative-time.pipe.ts       ← "vor 3 Minuten"
│   │       └── truncate.pipe.ts            ← Text kürzen mit "..."
│   │
│   └── features/                           ← Feature-Module (lazy loaded)
│       │
│       ├── simulation-list/                ← /simulations
│       │   ├── simulation-list.routes.ts
│       │   ├── simulation-list.component.ts     ← Smart: Lädt Liste, Filter, Suche
│       │   ├── simulation-card.component.ts     ← Dumb: Einzelne Sim-Karte
│       │   └── simulation-list.store.ts         ← Signal-Store: Simulations[], filter, loading
│       │
│       ├── simulation-create/              ← /simulations/create
│       │   ├── simulation-create.routes.ts
│       │   ├── simulation-create.component.ts   ← Smart: Wizard-Stepper Container
│       │   ├── steps/
│       │   │   ├── step-product.component.ts    ← Step 1: Name, Produkt, Zielmarkt, Branche
│       │   │   ├── step-config.component.ts     ← Step 2: Persona-Anzahl, Tick-Anzahl
│       │   │   └── step-review.component.ts     ← Step 3: Zusammenfassung + Start-Button
│       │   └── simulation-create.store.ts       ← Signal-Store: Wizard-State
│       │
│       └── simulation-dashboard/           ← /simulation/:id/**
│           ├── simulation-dashboard.routes.ts
│           ├── simulation-dashboard.component.ts ← Smart: Shell mit Sub-Nav + KPI-Strip
│           ├── simulation-dashboard.store.ts     ← Signal-Store: Simulation, Personas, Posts, Stats
│           │
│           ├── overview/                         ← /simulation/:id/overview
│           │   ├── overview.component.ts         ← Smart: Orchestriert Sub-Komponenten
│           │   ├── sentiment-timeline.component.ts ← Dumb: ECharts Line Chart
│           │   ├── live-feed.component.ts        ← Dumb: Scrollbare Post-Liste (Echtzeit)
│           │   ├── tick-progress.component.ts    ← Dumb: Progress-Bar + Wave-Indicator
│           │   └── kpi-strip.component.ts        ← Dumb: 4-6 KPI-Cards in einer Reihe
│           │
│           ├── network/                          ← /simulation/:id/network
│           │   ├── network.component.ts          ← Smart: Sigma.js Container
│           │   ├── network-graph.component.ts    ← Dumb: Sigma.js Renderer
│           │   ├── network-legend.component.ts   ← Dumb: Farblegende (Skeptiker, Mood, etc.)
│           │   └── persona-tooltip.component.ts  ← Dumb: Hover-Tooltip auf Node
│           │
│           ├── influence/                        ← /simulation/:id/influence
│           │   ├── influence.component.ts        ← Smart: Lädt InfluenceEvents
│           │   ├── influence-flow.component.ts   ← Dumb: ECharts Sankey/Flow Diagramm
│           │   ├── influence-timeline.component.ts ← Dumb: Events chronologisch
│           │   └── top-influencers.component.ts  ← Dumb: Ranking der einflussreichsten Personas
│           │
│           ├── sentiment/                        ← /simulation/:id/sentiment
│           │   ├── sentiment.component.ts        ← Smart: Lädt Posts + Ticks
│           │   ├── sentiment-heatmap.component.ts ← Dumb: ECharts Heatmap (Tag × Persona)
│           │   ├── platform-comparison.component.ts ← Dumb: FeedBook vs Threadit Bar Chart
│           │   └── mood-distribution.component.ts   ← Dumb: Pie/Donut Chart Stimmungsverteilung
│           │
│           ├── personas/                         ← /simulation/:id/personas
│           │   ├── personas.component.ts         ← Smart: PrimeNG DataTable + Filter
│           │   ├── persona-detail.component.ts   ← Dumb: Detail-Panel (Sidebar oder Modal)
│           │   ├── persona-chat.component.ts     ← Smart: Chat-Interface mit Sonnet
│           │   └── persona-history.component.ts  ← Dumb: Aktions-Timeline einer Persona
│           │
│           └── report/                           ← /simulation/:id/report
│               ├── report.component.ts           ← Smart: Lädt AnalysisReport
│               ├── report-section.component.ts   ← Dumb: Einzelne Report-Dimension
│               ├── report-export.component.ts    ← Dumb: Export-Buttons (JSON, CSV, PDF?)
│               └── report-regenerate.component.ts ← Dumb: "Neu generieren" Button + Confirm
```

---

## 3. State-Management-Strategie

### Prinzip: Service-basierte Signals (kein NgRx)

Jedes Feature hat einen eigenen **Signal-Store** als injectable Service:

```typescript
// Beispiel: simulation-dashboard.store.ts
@Injectable()
export class SimulationDashboardStore {
  // --- Signals (State) ---
  private _simulation = signal<Simulation | null>(null);
  private _personas = signal<Persona[]>([]);
  private _posts = signal<Post[]>([]);
  private _stats = signal<SimulationStats | null>(null);
  private _loading = signal(false);
  private _sseConnected = signal(false);

  // --- Public Readonly ---
  readonly simulation = this._simulation.asReadonly();
  readonly personas = this._personas.asReadonly();
  readonly posts = this._posts.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();

  // --- Computed ---
  readonly progress = computed(() => {
    const sim = this._simulation();
    if (!sim || !sim.total_ticks) return 0;
    return Math.round((sim.current_tick / sim.total_ticks) * 100);
  });
  readonly skepticCount = computed(() =>
    this._personas().filter(p => p.is_skeptic).length
  );
  readonly isRunning = computed(() =>
    this._simulation()?.status === 'running'
  );
  readonly postsByDay = computed(() => {
    // Gruppiert Posts nach ingame_day
  });

  // --- Actions ---
  async loadSimulation(id: string) { ... }
  async loadPersonas(simulationId: string) { ... }
  connectSSE(simulationId: string) { ... }
  disconnectSSE() { ... }
}
```

### Store-Übersicht

| Store | Scope | Signals | Wo verwendet |
|---|---|---|---|
| `SimulationListStore` | Feature | simulations[], filter, loading | simulation-list/ |
| `SimulationCreateStore` | Feature | wizardStep, formData, submitting | simulation-create/ |
| `SimulationDashboardStore` | Feature | simulation, personas, posts, stats, sse | simulation-dashboard/ (alle Sub-Views) |
| `ThemeService` | Global (core) | isDarkMode | sidebar, app-root |

---

## 4. API-Service-Design

### ApiService (Base-Layer)

```typescript
// core/services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;  // z.B. http://localhost:8000

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: HttpParams): Observable<T>
  post<T>(path: string, body: any): Observable<T>
  delete(path: string): Observable<void>
}
```

### Auth Interceptor

```typescript
// core/interceptors/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiKey = localStorage.getItem('api_key') || '';
  const cloned = req.clone({
    setHeaders: { 'X-API-Key': apiKey }
  });
  return next(cloned);
};
```

### Feature-Services (nutzen ApiService)

| Service | Methoden |
|---|---|
| `SimulationService` | `list(params)`, `getById(id)`, `create(data)`, `run(id)`, `cancel(id)`, `reset(id)`, `clone(id)`, `delete(id)`, `getStats(id)`, `getTicks(id)` |
| `PersonaService` | `list(simulationId, params)`, `getById(id)`, `chat(personaId, messages)` |
| `PostService` | `list(simulationId, params)`, `getComments(postId)`, `getReactions(postId)` |
| `AnalysisService` | `getReport(simulationId)`, `generateReport(simulationId)` |
| `ExportService` | `downloadJson(simId)`, `downloadPostsCsv(simId)`, `downloadPersonasCsv(simId)` |

---

## 5. SSE-Service-Design

```typescript
// core/services/sse.service.ts
@Injectable({ providedIn: 'root' })
export class SseService {
  connect(simulationId: string): Observable<SimulationStreamEvent> {
    return new Observable(subscriber => {
      const url = `${environment.apiUrl}/simulations/${simulationId}/stream`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        subscriber.next(data);
      };

      eventSource.onerror = () => {
        subscriber.error('SSE connection lost');
        eventSource.close();
      };

      // Cleanup bei unsubscribe
      return () => eventSource.close();
    });
  }
}
```

**Nutzung im Dashboard-Store:**
```typescript
connectSSE(simulationId: string) {
  this.sseSubscription = this.sseService
    .connect(simulationId)
    .subscribe(event => {
      this._simulation.update(sim => ({
        ...sim!,
        current_tick: event.current_tick,
        status: event.status,
      }));
    });
}
```

---

## 6. Routing-Konfiguration

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'simulations', pathMatch: 'full' },
  {
    path: 'simulations',
    loadChildren: () => import('./features/simulation-list/simulation-list.routes')
      .then(m => m.SIMULATION_LIST_ROUTES),
  },
  {
    path: 'simulations/create',
    loadChildren: () => import('./features/simulation-create/simulation-create.routes')
      .then(m => m.SIMULATION_CREATE_ROUTES),
  },
  {
    path: 'simulation/:id',
    loadChildren: () => import('./features/simulation-dashboard/simulation-dashboard.routes')
      .then(m => m.SIMULATION_DASHBOARD_ROUTES),
  },
  { path: '**', redirectTo: 'simulations' },
];

// features/simulation-dashboard/simulation-dashboard.routes.ts
export const SIMULATION_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: SimulationDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('./overview/overview.component').then(c => c.OverviewComponent) },
      { path: 'network', loadComponent: () => import('./network/network.component').then(c => c.NetworkComponent) },
      { path: 'influence', loadComponent: () => import('./influence/influence.component').then(c => c.InfluenceComponent) },
      { path: 'sentiment', loadComponent: () => import('./sentiment/sentiment.component').then(c => c.SentimentComponent) },
      { path: 'personas', loadComponent: () => import('./personas/personas.component').then(c => c.PersonasComponent) },
      { path: 'report', loadComponent: () => import('./report/report.component').then(c => c.ReportComponent) },
    ],
  },
];
```

---

## 7. Datenfluss-Diagramm

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                  │
│                                                           │
│  ┌─────────────┐    ┌──────────────────┐                 │
│  │  Component   │◄───│  Signal-Store    │                 │
│  │  (Template)  │    │  (Signals)       │                 │
│  │              │    │                  │                 │
│  │  @if, @for   │    │  simulation()    │                 │
│  │  [data]=...  │    │  personas()      │                 │
│  │  (click)=... │───►│  posts()         │                 │
│  └─────────────┘    │  loading()       │                 │
│                      │                  │                 │
│                      │  loadSimulation()│                 │
│                      │  connectSSE()    │                 │
│                      └────────┬─────────┘                 │
│                               │                           │
│                      ┌────────▼─────────┐                 │
│                      │  Feature-Service  │                 │
│                      │  (HttpClient)     │                 │
│                      └────────┬─────────┘                 │
│                               │                           │
│                      ┌────────▼─────────┐                 │
│                      │  Auth Interceptor │                 │
│                      │  (X-API-Key)      │                 │
│                      └────────┬─────────┘                 │
└───────────────────────────────┼───────────────────────────┘
                                │ HTTP / SSE
                    ┌───────────▼───────────┐
                    │  FastAPI Backend       │
                    │  localhost:8000        │
                    └───────────────────────┘
```

---

## 8. Design-System

### Farben

| Zweck | Farbe | Tailwind | Hex |
|---|---|---|---|
| Positiv / Gut | Grün | `emerald-500` | `#10b981` |
| Negativ / Schlecht | Rot | `red-500` | `#ef4444` |
| Neutral | Grau | `gray-500` | `#6b7280` |
| FeedBook | Blau | `blue-500` | `#3b82f6` |
| Threadit | Orange | `orange-500` | `#f97316` |
| Skeptiker | Lila | `purple-500` | `#8b5cf6` |
| Einflussreich | Amber | `amber-400` | `#fbbf24` |
| Primary (UI) | Indigo | `indigo-600` | `#4f46e5` |
| Background (Light) | Weiß | `white` | `#ffffff` |
| Background (Dark) | Slate | `slate-900` | `#0f172a` |

### Netzwerk-Graph Farbcodierung

- **Node-Farbe:** Mood-basiert (grün=positiv, rot=negativ, grau=neutral)
- **Node-Größe:** Influence-Score (mehr Einfluss = größerer Node)
- **Node-Rahmen:** Lila wenn Skeptiker
- **Edge-Farbe:** Verbindungsstärke (dunkel=stark, hell=schwach)
- **Edge-Dicke:** Interaktions-Häufigkeit

---

## 9. Entwicklungs-Reihenfolge

### Phase F1: Grundgerüst (Tag 1)
1. Angular CLI Projekt erstellen (`ng new frontend --standalone --style=scss`)
2. Tailwind v4 + PrimeNG installieren & konfigurieren
3. `AppComponent` mit Sidebar-Shell
4. Routing-Konfiguration (alle Routes, lazy loading)
5. `ApiService` + Auth-Interceptor
6. TypeScript-Interfaces (Models)
7. `ThemeService` (Dark/Light Mode)
8. Environment-Konfiguration (API-URL)

### Phase F2: Simulation-Liste + Erstellen (Tag 2)
1. `SimulationListStore` + `SimulationService`
2. `SimulationListComponent` mit PrimeNG DataView
3. `SimulationCardComponent` mit Status-Badge
4. `SimulationCreateComponent` (Wizard: 3 Steps)
5. Formulare mit ReactiveFormsModule + Validierung

### Phase F3: Dashboard-Shell + Overview (Tag 3)
1. `SimulationDashboardComponent` (Shell + Sub-Nav)
2. `SimulationDashboardStore` (Simulation, Personas, Posts laden)
3. `SseService` + SSE-Integration
4. KPI-Cards (Tick-Progress, Persona-Count, Post-Count, Sentiment)
5. `SentimentTimelineComponent` (ECharts Line Chart)
6. `LiveFeedComponent` (Posts in Echtzeit)

### Phase F4: Netzwerk + Influence (Tag 4)
1. Sigma.js + Graphology Integration
2. `NetworkGraphComponent` (Personas als Nodes, Connections als Edges)
3. Hover-Tooltips + Click-to-Detail
4. `InfluenceFlowComponent` (ECharts Sankey Diagramm)
5. `TopInfluencersComponent` (Ranking-Liste)

### Phase F5: Sentiment + Personas (Tag 5)
1. `SentimentHeatmapComponent` (ECharts Heatmap)
2. `PlatformComparisonComponent` (FeedBook vs Threadit)
3. `PersonasComponent` (PrimeNG DataTable mit Filter/Sort)
4. `PersonaDetailComponent` (Sidebar-Panel)
5. `PersonaChatComponent` (Chat-Interface)

### Phase F6: Report + Export + Polish (Tag 6)
1. `ReportComponent` (10 Dimensionen als Cards/Sections)
2. Export-Buttons (JSON, CSV)
3. Responsive Anpassungen (Tablet)
4. Loading-States, Error-States, Empty-States
5. Animations (Route-Transitions, Chart-Einblendungen)

---

## 10. Offene Architektur-Entscheidungen

| # | Frage | Empfehlung |
|---|---|---|
| 1 | API-Key-Eingabe: Login-Page oder Settings? | Settings-Page mit Key-Input, gespeichert in localStorage |
| 2 | Chat: Modal oder eigene Route? | Slide-In-Panel (PrimeNG Sidebar) auf der Personas-Seite |
| 3 | Persona-Detail: Modal oder Sidebar? | Sidebar-Panel (PrimeNG Drawer) — mehr Platz als Modal |
| 4 | Report-Regenerierung: Polling oder SSE? | Polling (alle 5s) — Report-Gen ist einmalig, kein SSE nötig |
| 5 | Sigma.js: Canvas oder WebGL? | WebGL (performanter bei 50+ Nodes mit Animationen) |
