import { Component, inject, signal, computed, OnInit, OnDestroy, ElementRef, viewChild, afterNextRender, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { PersonaService } from '../../../core/services/persona.service';
import { Persona } from '../../../core/models/persona.model';

const COLOR_DIM = 'rgba(14,14,12,0.12)';
const COLOR_EDGE_DIM = 'rgba(14,14,12,0.04)';

@Component({
  selector: 'app-network',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './network.component.html',
})
export class NetworkComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private personaService = inject(PersonaService);

  graphContainer = viewChild<ElementRef>('graphContainer');
  personas = signal<Persona[]>([]);
  selectedPersona = signal<Persona | null>(null);
  loading = signal(true);

  // Toolbar state
  searchTerm = signal('');
  highlightSkeptics = signal(false);
  highlightInfluencers = signal(false);

  // Computed: top-10% influencer threshold (number of connections)
  private influencerThreshold = computed(() => {
    const counts = this.personas()
      .map(p => p.social_connections?.length || 0)
      .sort((a, b) => b - a);
    if (counts.length === 0) return Infinity;
    const idx = Math.max(0, Math.floor(counts.length * 0.1) - 1);
    return counts[idx] ?? counts[0];
  });

  private sigma: Sigma | null = null;
  private simId = '';

  constructor() {
    afterNextRender(() => {
      if (this.personas().length > 0) {
        this.renderGraph();
      }
    });

    // Re-trigger sigma refresh when filters change
    effect(() => {
      // touch signals
      this.searchTerm();
      this.highlightSkeptics();
      this.highlightInfluencers();
      this.sigma?.refresh();
    });
  }

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.personaService.list(this.simId, { limit: 200 }).subscribe(res => {
      this.personas.set(res.items);
      this.loading.set(false);
      setTimeout(() => this.renderGraph(), 100);
    });
  }

  ngOnDestroy() {
    this.sigma?.kill();
  }

  // === Toolbar actions ===
  onSearchInput(value: string) {
    this.searchTerm.set(value);
  }
  toggleSkeptics() {
    this.highlightSkeptics.update(v => !v);
  }
  toggleInfluencers() {
    this.highlightInfluencers.update(v => !v);
  }
  clearSelection() {
    this.selectedPersona.set(null);
  }

  zoomIn() {
    this.sigma?.getCamera().animatedZoom({ duration: 220 });
  }
  zoomOut() {
    this.sigma?.getCamera().animatedUnzoom({ duration: 220 });
  }
  zoomFit() {
    this.sigma?.getCamera().animatedReset({ duration: 280 });
  }

  private isInfluencer(p: Persona): boolean {
    const count = p.social_connections?.length || 0;
    const t = this.influencerThreshold();
    return count > 0 && count >= t;
  }

  private isMatch(p: Persona): boolean {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return true;
    const hay = [
      p.name,
      p.location || '',
      p.occupation || '',
      p.current_state?.mood || '',
    ].join(' ').toLowerCase();
    return hay.includes(term);
  }

  private renderGraph() {
    const container = this.graphContainer()?.nativeElement;
    if (!container || this.personas().length === 0) return;

    const graph = new Graph();
    const personas = this.personas();
    const personaMap = new Map(personas.map(p => [p.id, p]));

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
        color: persona.is_skeptic ? '#c8321f' : color,
        baseColor: persona.is_skeptic ? '#c8321f' : color,
      });
    }

    for (const persona of personas) {
      const connections = persona.social_connections || [];
      const strengths = persona.current_state?.connection_strength || {};
      for (const targetId of connections) {
        if (personaMap.has(targetId) && !graph.hasEdge(persona.id, targetId)) {
          const strength = strengths[targetId] || 1;
          graph.addEdge(persona.id, targetId, {
            size: Math.max(0.5, Math.min(3, strength * 0.3)),
            color: `rgba(14, 14, 12, ${Math.min(0.55, 0.12 + strength * 0.08)})`,
            baseColor: `rgba(14, 14, 12, ${Math.min(0.55, 0.12 + strength * 0.08)})`,
          });
        }
      }
    }

    forceAtlas2.assign(graph, { iterations: 100, settings: { gravity: 1, scalingRatio: 10 } });

    this.sigma?.kill();

    this.sigma = new Sigma(graph, container, {
      renderEdgeLabels: false,
      defaultEdgeType: 'line',
      labelFont: "'Inter', system-ui, sans-serif",
      labelSize: 12,
      labelWeight: '500',
      labelColor: { color: '#0e0e0c' },
    });

    // Dynamic node reducer — applies search/filter dimming
    this.sigma.setSetting('nodeReducer', (node, data) => {
      const persona = personaMap.get(node);
      if (!persona) return data;

      const matches = this.isMatch(persona);
      const skepticOn = this.highlightSkeptics();
      const influencerOn = this.highlightInfluencers();

      let dimmed = !matches;
      let color = data['baseColor'] || data['color'];

      if (skepticOn) {
        if (persona.is_skeptic) {
          color = '#c8321f';
        } else {
          dimmed = true;
        }
      }
      if (influencerOn) {
        if (this.isInfluencer(persona)) {
          color = '#a16207';
        } else {
          dimmed = true;
        }
      }

      if (dimmed) {
        return { ...data, color: COLOR_DIM, label: '', zIndex: 0 };
      }
      return { ...data, color, zIndex: 1 };
    });

    this.sigma.setSetting('edgeReducer', (edge, data) => {
      const [s, t] = (this.sigma as Sigma).getGraph().extremities(edge);
      const ps = personaMap.get(s);
      const pt = personaMap.get(t);
      if (!ps || !pt) return data;

      const skepticOn = this.highlightSkeptics();
      const influencerOn = this.highlightInfluencers();
      const term = this.searchTerm().trim();

      let visible = true;
      if (term) visible = this.isMatch(ps) && this.isMatch(pt);
      if (skepticOn) visible = visible && (ps.is_skeptic || pt.is_skeptic);
      if (influencerOn) visible = visible && (this.isInfluencer(ps) || this.isInfluencer(pt));

      if (!visible) {
        return { ...data, color: COLOR_EDGE_DIM };
      }
      return { ...data, color: data['baseColor'] || data['color'] };
    });

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
    if (lower.includes('positiv') || lower.includes('begeistert') || lower.includes('optimist')) return '#3d5a3d';
    if (lower.includes('negativ') || lower.includes('genervt') || lower.includes('wütend') || lower.includes('frustr')) return '#8b3a1b';
    if (lower.includes('skepti') || lower.includes('kritisch') || lower.includes('besorgt')) return '#a16207';
    if (lower.includes('neugier') || lower.includes('interessiert')) return '#1e3a8a';
    return '#0e0e0c';
  }
}
