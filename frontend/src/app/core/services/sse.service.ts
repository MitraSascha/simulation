import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SimulationStreamEvent } from '../models/simulation.model';

@Injectable({ providedIn: 'root' })
export class SseService {
  connect(simulationId: string): Observable<SimulationStreamEvent> {
    return new Observable(subscriber => {
      // EventSource kann keine Custom-Header senden — Key als Query-Param.
      const apiKey = localStorage.getItem('sim_api_key') || '';
      const url = `${environment.apiUrl}/simulations/${simulationId}/stream?api_key=${encodeURIComponent(apiKey)}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SimulationStreamEvent;
          subscriber.next(data);
          if (data.status === 'completed' || data.status === 'failed') {
            subscriber.complete();
            eventSource.close();
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        subscriber.complete();
      };

      return () => eventSource.close();
    });
  }
}
