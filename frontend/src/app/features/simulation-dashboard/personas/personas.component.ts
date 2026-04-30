import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PersonaService } from '../../../core/services/persona.service';
import { Persona, ChatMessage } from '../../../core/models/persona.model';
import { CHART } from '../../../shared/chart-theme';

export type SortKey = 'name' | 'mood' | 'skeptic' | 'reach';
export type MoodKey = 'positiv' | 'negativ' | 'skeptisch' | 'neugierig' | 'neutral';

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [FormsModule, ScrollingModule],
  templateUrl: './personas.component.html',
})
export class PersonasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private personaService = inject(PersonaService);

  personas = signal<Persona[]>([]);
  filteredPersonas = signal<Persona[]>([]);
  selectedPersona = signal<Persona | null>(null);
  loading = signal(true);
  searchTerm = signal('');
  showSkepticsOnly = signal(false);

  sortKey = signal<SortKey>('name');
  activeMoods = signal<Set<MoodKey>>(new Set());

  readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name (A–Z)' },
    { key: 'mood', label: 'Stimmung' },
    { key: 'skeptic', label: 'Skeptiker zuerst' },
    { key: 'reach', label: 'Reichweite' },
  ];

  readonly moodOptions: { key: MoodKey; label: string }[] = [
    { key: 'positiv', label: 'positiv' },
    { key: 'negativ', label: 'negativ' },
    { key: 'skeptisch', label: 'skeptisch' },
    { key: 'neugierig', label: 'neugierig' },
    { key: 'neutral', label: 'neutral' },
  ];

  showChat = signal(false);
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = signal('');
  chatLoading = signal(false);

  private simId = '';

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.personaService.list(this.simId, { limit: 200 }).subscribe(res => {
      this.personas.set(res.items);
      this.applyFilter();
      this.loading.set(false);
    });
  }

  applyFilter() {
    let result = this.personas().slice();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.location || '').toLowerCase().includes(term) ||
        (p.occupation || '').toLowerCase().includes(term)
      );
    }

    if (this.showSkepticsOnly()) {
      result = result.filter(p => p.is_skeptic);
    }

    const moods = this.activeMoods();
    if (moods.size > 0) {
      result = result.filter(p => {
        const cat = this.classifyMood(p.current_state?.mood);
        return moods.has(cat);
      });
    }

    result.sort((a, b) => this.compare(a, b, this.sortKey()));
    this.filteredPersonas.set(result);
  }

  toggleMood(m: MoodKey) {
    const next = new Set(this.activeMoods());
    if (next.has(m)) next.delete(m); else next.add(m);
    this.activeMoods.set(next);
    this.applyFilter();
  }

  isMoodActive(m: MoodKey): boolean {
    return this.activeMoods().has(m);
  }

  setSort(key: SortKey) {
    this.sortKey.set(key);
    this.applyFilter();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.showSkepticsOnly.set(false);
    this.activeMoods.set(new Set());
    this.applyFilter();
  }

  hasActiveFilters(): boolean {
    return !!this.searchTerm() || this.showSkepticsOnly() || this.activeMoods().size > 0;
  }

  activeFilterCount(): number {
    let n = 0;
    if (this.searchTerm()) n++;
    if (this.showSkepticsOnly()) n++;
    n += this.activeMoods().size;
    return n;
  }

  private compare(a: Persona, b: Persona, key: SortKey): number {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'mood': {
        const am = (a.current_state?.mood || '').toLowerCase();
        const bm = (b.current_state?.mood || '').toLowerCase();
        return am.localeCompare(bm) || a.name.localeCompare(b.name);
      }
      case 'skeptic': {
        const av = a.is_skeptic ? 0 : 1;
        const bv = b.is_skeptic ? 0 : 1;
        return av - bv || a.name.localeCompare(b.name);
      }
      case 'reach': {
        const ar = a.social_connections?.length ?? 0;
        const br = b.social_connections?.length ?? 0;
        return br - ar || a.name.localeCompare(b.name);
      }
    }
  }

  private classifyMood(mood: string | undefined): MoodKey {
    if (!mood) return 'neutral';
    const m = mood.toLowerCase();
    if (m.includes('positiv') || m.includes('begeistert') || m.includes('froh')) return 'positiv';
    if (m.includes('negativ') || m.includes('genervt') || m.includes('frustr') || m.includes('wütend') || m.includes('wuet')) return 'negativ';
    if (m.includes('skepti') || m.includes('kritisch')) return 'skeptisch';
    if (m.includes('neugier') || m.includes('interess')) return 'neugierig';
    return 'neutral';
  }

  selectPersona(p: Persona) {
    this.selectedPersona.set(p);
    this.showChat.set(false);
    this.chatMessages.set([]);
  }

  clearSelection() {
    this.selectedPersona.set(null);
    this.showChat.set(false);
    this.chatMessages.set([]);
  }

  openChat() {
    this.showChat.set(true);
  }

  getMoodColor(mood: string | undefined): string {
    if (!mood) return CHART.inkMute;
    const m = mood.toLowerCase();
    if (m.includes('positiv') || m.includes('begeistert')) return CHART.moss;
    if (m.includes('negativ') || m.includes('genervt') || m.includes('frustr')) return CHART.rust;
    if (m.includes('skepti') || m.includes('kritisch')) return CHART.threadit;
    if (m.includes('neugier')) return CHART.feedbook;
    return CHART.inkMute;
  }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  sendMessage() {
    const msg = this.chatInput().trim();
    if (!msg || this.chatLoading()) return;

    const persona = this.selectedPersona();
    if (!persona) return;

    this.chatMessages.update(msgs => [...msgs, { role: 'user' as const, content: msg }]);
    this.chatInput.set('');
    this.chatLoading.set(true);

    this.personaService.chat(persona.id, { messages: this.chatMessages() }).subscribe({
      next: (res) => {
        this.chatMessages.update(msgs => [...msgs, { role: 'assistant' as const, content: res.response }]);
        this.chatLoading.set(false);
      },
      error: () => {
        this.chatMessages.update(msgs => [...msgs, { role: 'assistant' as const, content: 'Fehler bei der Kommunikation.' }]);
        this.chatLoading.set(false);
      },
    });
  }
}
