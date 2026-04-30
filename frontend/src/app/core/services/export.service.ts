import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private api = inject(ApiService);

  downloadJson(simulationId: string): void {
    this.api.getBlob(`/simulations/${simulationId}/export/json`).subscribe(blob => {
      this._download(blob, `simulation_${simulationId}.json`);
    });
  }

  downloadPostsCsv(simulationId: string): void {
    this.api.getBlob(`/simulations/${simulationId}/export/posts/csv`).subscribe(blob => {
      this._download(blob, `posts_${simulationId}.csv`);
    });
  }

  downloadPersonasCsv(simulationId: string): void {
    this.api.getBlob(`/simulations/${simulationId}/export/personas/csv`).subscribe(blob => {
      this._download(blob, `personas_${simulationId}.csv`);
    });
  }

  private _download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
