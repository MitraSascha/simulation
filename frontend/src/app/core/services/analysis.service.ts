import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AnalysisReport } from '../models/analysis.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private api = inject(ApiService);

  getReport(simulationId: string): Observable<AnalysisReport> {
    return this.api.get(`/analysis/${simulationId}`);
  }

  generateReport(simulationId: string): Observable<AnalysisReport> {
    return this.api.post(`/analysis/${simulationId}/generate`);
  }
}
