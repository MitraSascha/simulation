import { Component, input } from '@angular/core';
import { Platform } from '../../core/models/content.model';

@Component({
  selector: 'app-platform-icon',
  standalone: true,
  template: `
    <span [class]="iconClass()" class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded">
      <i [class]="platform() === 'feedbook' ? 'pi pi-facebook' : 'pi pi-reddit'"></i>
      {{ platform() === 'feedbook' ? 'FeedBook' : 'Threadit' }}
    </span>
  `,
})
export class PlatformIconComponent {
  platform = input.required<Platform>();

  protected iconClass = () =>
    this.platform() === 'feedbook'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
}
