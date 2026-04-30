import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Persona, ChatRequest, ChatResponse } from '../models/persona.model';
import { PaginatedResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class PersonaService {
  private api = inject(ApiService);

  list(simulationId: string, params?: { limit?: number; offset?: number; is_skeptic?: boolean }): Observable<PaginatedResponse<Persona>> {
    return this.api.get('/personas/', { simulation_id: simulationId, ...params } as Record<string, string | number | boolean>);
  }

  getById(id: string): Observable<Persona> {
    return this.api.get(`/personas/${id}`);
  }

  chat(personaId: string, messages: ChatRequest): Observable<ChatResponse> {
    return this.api.post(`/personas/${personaId}/chat`, messages);
  }
}
