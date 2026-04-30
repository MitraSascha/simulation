import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
      <i [class]="'pi ' + icon() + ' text-4xl mb-4'"></i>
      <p class="text-lg font-medium">{{ title() }}</p>
      @if (message()) {
        <p class="text-sm mt-1">{{ message() }}</p>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input('pi-inbox');
  title = input('Keine Daten');
  message = input<string>();
}
