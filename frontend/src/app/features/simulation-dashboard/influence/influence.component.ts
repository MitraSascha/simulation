import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import { ApiService } from '../../../core/services/api.service';
import { PersonaService } from '../../../core/services/persona.service';
import { PostService } from '../../../core/services/post.service';
import { SimulationService } from '../../../core/services/simulation.service';
import { InfluenceEvent } from '../../../core/models/content.model';
import { Persona } from '../../../core/models/persona.model';
import { Simulation } from '../../../core/models/simulation.model';
import { CHART, FONT_MONO, FONT_SANS, tooltipStyle } from '../../../shared/chart-theme';

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
  private postService = inject(PostService);
  private simService = inject(SimulationService);

  events = signal<InfluenceEvent[]>([]);
  personas = signal<Persona[]>([]);
  simulation = signal<Simulation | null>(null);
  sankeyChart = signal<any>({});
  topInfluencers = signal<{ name: string; count: number; isSceptic: boolean }[]>([]);
  // Fallback: Personas mit den meisten Posts (Proxy für Reichweite, wenn keine Events)
  topPosters = signal<{ name: string; count: number; isSceptic: boolean }[]>([]);
  loading = signal(true);

  private simId = '';

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];

    this.simService.getById(this.simId).subscribe(s => this.simulation.set(s));

    this.personaService.list(this.simId, { limit: 200 }).subscribe(res => {
      this.personas.set(res.items);

      this.api.get<any>(`/simulations/${this.simId}/export/json`).subscribe({
        next: (data) => {
          const influenceEvents: InfluenceEvent[] = data.influence_events || [];
          this.events.set(influenceEvents);
          this.buildSankeyChart(influenceEvents, res.items);
          this.buildTopInfluencers(influenceEvents, res.items);

          // Fallback: Top-Poster aus Posts berechnen
          this.postService.list(this.simId, { limit: 500 }).subscribe(postRes => {
            this.buildTopPosters(postRes.items, res.items);
            this.loading.set(false);
          });
        },
        error: () => this.loading.set(false),
      });
    });
  }

  private buildTopPosters(posts: any[], personas: Persona[]) {
    const countMap = new Map<string, number>();
    for (const post of posts) {
      countMap.set(post.author_id, (countMap.get(post.author_id) || 0) + 1);
    }
    const personaMap = new Map(personas.map(p => [p.id, p]));
    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const p = personaMap.get(id);
        return { name: p?.name || 'Unbekannt', count, isSceptic: p?.is_skeptic || false };
      });
    this.topPosters.set(sorted);
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
      tooltip: { trigger: 'item', ...tooltipStyle },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        data: Array.from(usedNodes).map(name => ({
          name,
          itemStyle: { color: CHART.ink, borderColor: CHART.ink },
        })),
        links: topLinks,
        lineStyle: { color: CHART.vermillion, opacity: 0.45, curveness: 0.5 },
        label: {
          fontFamily: FONT_SANS,
          fontSize: 11,
          color: CHART.ink,
        },
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
