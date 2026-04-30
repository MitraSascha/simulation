import { Component, input } from '@angular/core';
import { SimulationStatus } from '../../core/models/simulation.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span [class]="badgeClass()">
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  status = input.required<SimulationStatus>();

  protected badgeClass = () => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (this.status()) {
      case 'pending': return `${base} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
      case 'running': return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'completed': return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300`;
      case 'failed': return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      default: return base;
    }
  };

  protected label = () => {
    switch (this.status()) {
      case 'pending': return 'Ausstehend';
      case 'running': return 'Läuft';
      case 'completed': return 'Abgeschlossen';
      case 'failed': return 'Fehlgeschlagen';
      default: return this.status();
    }
  };
}
