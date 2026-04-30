import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
      <p class="text-sm text-gray-500 dark:text-slate-400">{{ label() }}</p>
      <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{{ value() }}</p>
      @if (subtitle()) {
        <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class KpiCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  subtitle = input<string>();
}
