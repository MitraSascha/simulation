import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import { SimulationService } from '../../../core/services/simulation.service';
import { PersonaService } from '../../../core/services/persona.service';
import { PostService } from '../../../core/services/post.service';
import { Simulation, SimulationStats, TickSnapshot } from '../../../core/models/simulation.model';
import { Post } from '../../../core/models/content.model';
import { Persona } from '../../../core/models/persona.model';
import { KpiCardComponent } from '../../../shared/components/kpi-card.component';
import { TruncatePipe } from '../../../shared/pipes/truncate.pipe';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [NgxEchartsDirective, KpiCardComponent, TruncatePipe, RouterLink],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './overview.component.html',
})
export class OverviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private simService = inject(SimulationService);
  private personaService = inject(PersonaService);
  private postService = inject(PostService);

  simulation = signal<Simulation | null>(null);
  stats = signal<SimulationStats | null>(null);
  ticks = signal<TickSnapshot[]>([]);
  posts = signal<Post[]>([]);
  personas = signal<Persona[]>([]);
  chartOption = signal<any>({});
  selectedPersona = signal<Persona | null>(null);

  private simId = '';

  // Derived
  recentPosts = computed(() => [...this.posts()].sort((a, b) => b.ingame_day - a.ingame_day).slice(0, 15));
  skepticCount = computed(() => this.personas().filter(p => p.is_skeptic).length);

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.loadData();
  }

  private loadData() {
    this.simService.getById(this.simId).subscribe(s => this.simulation.set(s));
    this.simService.getStats(this.simId).subscribe(s => this.stats.set(s));
    this.simService.getTicks(this.simId).subscribe(t => { this.ticks.set(t); this.buildChart(t); });
    this.postService.list(this.simId, { limit: 200 }).subscribe(r => this.posts.set(r.items));
    this.personaService.list(this.simId, { limit: 200 }).subscribe(r => this.personas.set(r.items));
  }

  private buildChart(ticks: TickSnapshot[]) {
    this.chartOption.set({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e1e3f', borderColor: 'rgba(99,102,241,0.3)', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { data: ['Posts', 'Kommentare', 'Reaktionen'], bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      grid: { top: 16, right: 16, bottom: 36, left: 44 },
      xAxis: { type: 'category', data: ticks.map(t => `${t.ingame_day}`), axisLabel: { color: '#475569', fontSize: 10 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }, splitLine: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#475569', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      series: [
        { name: 'Posts', type: 'bar', stack: 'a', data: ticks.map(t => t.snapshot.new_posts), itemStyle: { color: '#6366f1', borderRadius: [4,4,0,0] }, barWidth: '60%' },
        { name: 'Kommentare', type: 'bar', stack: 'a', data: ticks.map(t => t.snapshot.new_comments), itemStyle: { color: '#8b5cf6' } },
        { name: 'Reaktionen', type: 'bar', stack: 'a', data: ticks.map(t => t.snapshot.new_reactions), itemStyle: { color: '#a855f7' } },
      ],
    });
  }

  getMoodColor(mood: string | undefined): string {
    if (!mood) return '#64748b';
    const m = mood.toLowerCase();
    if (m.includes('positiv') || m.includes('begeistert')) return '#10b981';
    if (m.includes('negativ') || m.includes('genervt') || m.includes('frustr')) return '#ef4444';
    if (m.includes('skepti') || m.includes('kritisch')) return '#f59e0b';
    if (m.includes('neugier')) return '#3b82f6';
    return '#64748b';
  }

  selectPersona(p: Persona) {
    this.selectedPersona.set(this.selectedPersona()?.id === p.id ? null : p);
  }
}
