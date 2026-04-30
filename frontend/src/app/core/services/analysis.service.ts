import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AnalysisReport } from '../models/analysis.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private api = inject(ApiService);

  getReport(simulationId: string): Observable<AnalysisReport | null> {
    return this.api.get<AnalysisReport>(`/analysis/${simulationId}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  generateReport(simulationId: string): Observable<AnalysisReport> {
    return this.api.post(`/analysis/${simulationId}/generate`);
  }
}
