import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import { ApiService } from '../../../core/services/api.service';
import { PersonaService } from '../../../core/services/persona.service';
import { InfluenceEvent } from '../../../core/models/content.model';
import { Persona } from '../../../core/models/persona.model';

@Component({
  selector: 'app-influence',
  standalone: true,
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './influence.component.html',
})
export class InfluenceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private personaService = inject(PersonaService);

  events = signal<InfluenceEvent[]>([]);
  personas = signal<Persona[]>([]);
  sankeyChart = signal<any>({});
  topInfluencers = signal<{ name: string; count: number; isSceptic: boolean }[]>([]);
  loading = signal(true);

  private simId = '';

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];

    // Load influence events — these are not paginated, just a direct list
    // The backend doesn't have a dedicated endpoint for influence events,
    // so we'll use the JSON export and extract them
    this.personaService.list(this.simId, { limit: 200 }).subscribe(res => {
      this.personas.set(res.items);

      // Load influence events from the export endpoint
      this.api.get<any>(`/simulations/${this.simId}/export/json`).subscribe({
        next: (data) => {
          const influenceEvents: InfluenceEvent[] = data.influence_events || [];
          this.events.set(influenceEvents);
          this.buildSankeyChart(influenceEvents, res.items);
          this.buildTopInfluencers(influenceEvents, res.items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  private buildSankeyChart(events: InfluenceEvent[], personas: Persona[]) {
    if (events.length === 0) return;

    const nameMap = new Map(personas.map(p => [p.id, p.name]));

    // Count influence relationships
    const linkMap = new Map<string, number>();
    for (const event of events) {
      const source = nameMap.get(event.source_persona_id) || 'Unbekannt';
      const target = nameMap.get(event.target_persona_id) || 'Unbekannt';
      const key = `${source}|||${target}`;
      linkMap.set(key, (linkMap.get(key) || 0) + 1);
    }

    // Build sankey data
    const nodeNames = new Set<string>();
    const links: { source: string; target: string; value: number }[] = [];

    for (const [key, count] of linkMap) {
      const [source, target] = key.split('|||');
      nodeNames.add(source);
      nodeNames.add(target);
      links.push({ source, target, value: count });
    }

    // Top 20 links for readability
    links.sort((a, b) => b.value - a.value);
    const topLinks = links.slice(0, 20);
    const usedNodes = new Set<string>();
    topLinks.forEach(l => { usedNodes.add(l.source); usedNodes.add(l.target); });

    this.sankeyChart.set({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        data: Array.from(usedNodes).map(name => ({ name })),
        links: topLinks,
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { fontSize: 11 },
      }],
    });
  }

  private buildTopInfluencers(events: InfluenceEvent[], personas: Persona[]) {
    const countMap = new Map<string, number>();
    for (const event of events) {
      countMap.set(event.source_persona_id, (countMap.get(event.source_persona_id) || 0) + 1);
    }

    const personaMap = new Map(personas.map(p => [p.id, p]));

    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const p = personaMap.get(id);
        return { name: p?.name || 'Unbekannt', count, isSceptic: p?.is_skeptic || false };
      });

    this.topInfluencers.set(sorted);
  }
}
