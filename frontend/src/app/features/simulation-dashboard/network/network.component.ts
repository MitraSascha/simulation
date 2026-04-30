import { Component, inject, signal, OnInit, OnDestroy, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KeyValuePipe, DecimalPipe } from '@angular/common';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { PersonaService } from '../../../core/services/persona.service';
import { Persona } from '../../../core/models/persona.model';

@Component({
  selector: 'app-network',
  standalone: true,
  imports: [KeyValuePipe, DecimalPipe],
  templateUrl: './network.component.html',
})
export class NetworkComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private personaService = inject(PersonaService);

  graphContainer = viewChild<ElementRef>('graphContainer');
  personas = signal<Persona[]>([]);
  selectedPersona = signal<Persona | null>(null);
  loading = signal(true);

  private sigma: Sigma | null = null;
  private simId = '';

  constructor() {
    afterNextRender(() => {
      if (this.personas().length > 0) {
        this.renderGraph();
      }
    });
  }

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.personaService.list(this.simId, { limit: 200 }).subscribe(res => {
      this.personas.set(res.items);
      this.loading.set(false);
      // Small delay to ensure DOM is ready
      setTimeout(() => this.renderGraph(), 100);
    });
  }

  ngOnDestroy() {
    this.sigma?.kill();
  }

  private renderGraph() {
    const container = this.graphContainer()?.nativeElement;
    if (!container || this.personas().length === 0) return;

    const graph = new Graph();
    const personas = this.personas();
    const personaMap = new Map(personas.map(p => [p.id, p]));

    // Add nodes
    for (const persona of personas) {
      const mood = persona.current_state?.mood || 'neutral';
      const color = this.moodColor(mood);
      const strength = Object.values(persona.current_state?.connection_strength || {});
      const totalInfluence = strength.reduce((a, b) => a + b, 0);
      const size = Math.max(6, Math.min(20, 6 + totalInfluence * 0.5));

      graph.addNode(persona.id, {
        label: persona.name,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        color,
        borderColor: persona.is_skeptic ? '#8b5cf6' : undefined,
      });
    }

    // Add edges
    for (const persona of personas) {
      const connections = persona.social_connections || [];
      const strengths = persona.current_state?.connection_strength || {};
      for (const targetId of connections) {
        if (personaMap.has(targetId) && !graph.hasEdge(persona.id, targetId)) {
          const strength = strengths[targetId] || 1;
          graph.addEdge(persona.id, targetId, {
            size: Math.max(0.5, Math.min(3, strength * 0.3)),
            color: `rgba(156, 163, 175, ${Math.min(0.8, strength * 0.1)})`,
          });
        }
      }
    }

    // Apply force layout
    forceAtlas2.assign(graph, { iterations: 100, settings: { gravity: 1, scalingRatio: 10 } });

    // Cleanup previous
    this.sigma?.kill();

    // Render
    this.sigma = new Sigma(graph, container, {
      renderEdgeLabels: false,
      defaultEdgeType: 'line',
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 12,
      labelColor: { color: '#64748b' },
    });

    // Click handler
    this.sigma.on('clickNode', ({ node }) => {
      const persona = personaMap.get(node);
      this.selectedPersona.set(persona || null);
    });

    this.sigma.on('clickStage', () => {
      this.selectedPersona.set(null);
    });
  }

  private moodColor(mood: string): string {
    const lower = mood.toLowerCase();
    if (lower.includes('positiv') || lower.includes('begeistert') || lower.includes('optimist')) return '#10b981';
    if (lower.includes('negativ') || lower.includes('genervt') || lower.includes('wütend') || lower.includes('frustr')) return '#ef4444';
    if (lower.includes('skepti') || lower.includes('kritisch') || lower.includes('besorgt')) return '#f59e0b';
    if (lower.includes('neugier') || lower.includes('interessiert')) return '#3b82f6';
    return '#6b7280';
  }
}
