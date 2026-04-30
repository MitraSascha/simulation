import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { SimulationService } from '../../core/services/simulation.service';
import { PersonaService } from '../../core/services/persona.service';
import { PostService } from '../../core/services/post.service';
import { SseService } from '../../core/services/sse.service';
import { Simulation } from '../../core/models/simulation.model';
import { Persona } from '../../core/models/persona.model';
import { Post } from '../../core/models/content.model';
@Component({
  selector: 'app-simulation-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SlicePipe],
  templateUrl: './simulation-dashboard.component.html',
})
export class SimulationDashboardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private simService = inject(SimulationService);
  private personaService = inject(PersonaService);
  private postService = inject(PostService);
  private sseService = inject(SseService);
  private sseSub?: Subscription;

  simulation = signal<Simulation | null>(null);
  personas = signal<Persona[]>([]);
  posts = signal<Post[]>([]);
  loading = signal(true);

  private simulationId = '';

  ngOnInit() {
    this.simulationId = this.route.snapshot.params['id'];
    this.loadData();
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
  }

  private loadData() {
    this.simService.getById(this.simulationId).subscribe(sim => {
      this.simulation.set(sim);
      this.loading.set(false);

      if (sim.status === 'running') {
        this.connectSSE();
      }
    });

    this.personaService.list(this.simulationId, { limit: 200 }).subscribe(res => {
      this.personas.set(res.items);
    });

    this.postService.list(this.simulationId, { limit: 500 }).subscribe(res => {
      this.posts.set(res.items);
    });
  }

  private connectSSE() {
    this.sseSub = this.sseService.connect(this.simulationId).subscribe({
      next: (event) => {
        this.simulation.update(sim => sim ? {
          ...sim,
          current_tick: event.current_tick,
          status: event.status,
        } : sim);

        if (event.status === 'completed') {
          this.loadData(); // Reload all data after completion
        }
      },
    });
  }

  get progress(): number {
    const sim = this.simulation();
    if (!sim || !sim.total_ticks) return 0;
    return Math.round((sim.current_tick / sim.total_ticks) * 100);
  }

  readonly tabs = [
    { label: 'Übersicht', route: 'overview', icon: 'pi-chart-bar' },
    { label: 'Netzwerk', route: 'network', icon: 'pi-sitemap' },
    { label: 'Influence', route: 'influence', icon: 'pi-arrows-alt' },
    { label: 'Sentiment', route: 'sentiment', icon: 'pi-chart-line' },
    { label: 'Personas', route: 'personas', icon: 'pi-users' },
    { label: 'Report', route: 'report', icon: 'pi-file' },
  ];
}
