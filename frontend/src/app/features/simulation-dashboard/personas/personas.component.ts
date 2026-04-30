import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PersonaService } from '../../../core/services/persona.service';
import { Persona, ChatMessage } from '../../../core/models/persona.model';
import { TruncatePipe } from '../../../shared/pipes/truncate.pipe';

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [FormsModule, TruncatePipe],
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

  // Chat state
  showChat = signal(false);
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = signal('');
  chatLoading = signal(false);

  private simId = '';

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.personaService.list(this.simId, { limit: 200 }).subscribe(res => {
      this.personas.set(res.items);
      this.filteredPersonas.set(res.items);
      this.loading.set(false);
    });
  }

  applyFilter() {
    let result = this.personas();
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
    this.filteredPersonas.set(result);
  }

  selectPersona(p: Persona) {
    this.selectedPersona.set(p);
    this.showChat.set(false);
    this.chatMessages.set([]);
  }

  openChat() {
    this.showChat.set(true);
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
