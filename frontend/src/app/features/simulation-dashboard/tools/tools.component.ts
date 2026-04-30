import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExportService } from '../../../core/services/export.service';

interface ToolCard {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  status: 'active' | 'soon';
  navigate?: string[];
  isExport?: boolean;
}

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="animate-fade-in">

      <!-- Section Header -->
      <div class="mb-6">
        <h2 style="font-size: 22px; font-weight: 700; color: var(--ink); letter-spacing: -0.02em;">
          Werkzeuge
        </h2>
        <p style="font-size: 14px; color: var(--ink-3); margin-top: 6px; max-width: 640px;">
          Vier Werkzeuge zur qualitativen Vertiefung.
        </p>
      </div>

      <!-- Tool Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        @for (card of cards; track card.key) {
          <div class="card card-hover tool-card" [class.tool-disabled]="card.status === 'soon'">

            <!-- Status Badge -->
            @if (card.status === 'soon') {
              <span class="badge badge-muted tool-badge">demnächst</span>
            }

            <!-- Icon Box -->
            <div class="tool-icon-box">
              <i [class]="'pi ' + card.icon"></i>
            </div>

            <!-- Title -->
            <h3 class="tool-title">{{ card.title }}</h3>

            <!-- Subtitle -->
            <p class="tool-subtitle">{{ card.subtitle }}</p>

            <!-- Action area -->
            @if (card.status === 'active') {
              @if (card.isExport) {
                <div class="export-mini-buttons">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="exportService.downloadJson(simId)">
                    <i class="pi pi-download"></i> JSON
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="exportService.downloadPostsCsv(simId)">
                    <i class="pi pi-file"></i> Posts
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="exportService.downloadPersonasCsv(simId)">
                    <i class="pi pi-file"></i> Personas
                  </button>
                </div>
              } @else if (card.navigate) {
                <a [routerLink]="card.navigate" class="btn btn-secondary btn-sm tool-cta">
                  Öffnen <i class="pi pi-arrow-right"></i>
                </a>
              }
            }
          </div>
        }
      </div>
    </div>

    <style>
      .tool-card {
        position: relative;
        padding: 24px;
        display: flex;
        flex-direction: column;
        min-height: 200px;
      }
      .tool-card.tool-disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .tool-badge {
        position: absolute;
        top: 16px;
        right: 16px;
      }

      .tool-icon-box {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: var(--primary-l);
        color: var(--primary);
        border-radius: var(--radius);
        margin-bottom: 4px;
      }
      .tool-icon-box i {
        font-size: 20px;
      }

      .tool-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--ink);
        margin: 16px 0 0;
        letter-spacing: -0.01em;
      }

      .tool-subtitle {
        font-size: 14px;
        line-height: 1.5;
        color: var(--ink-3);
        margin: 6px 0 16px;
        flex: 1;
      }

      .tool-cta {
        align-self: flex-start;
      }

      .export-mini-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
    </style>
  `,
})
export class ToolsComponent {
  private route = inject(ActivatedRoute);
  protected exportService = inject(ExportService);

  protected simId = this.route.parent!.snapshot.params['id'] ?? '';

  readonly cards: ToolCard[] = [
    {
      key: 'persona-chat',
      icon: 'pi-comments',
      title: 'Persona-Gespräch',
      subtitle: 'Sprich mit einer Persona aus deiner Vermessung',
      status: 'active',
      navigate: ['../../karte/personas'],
    },
    {
      key: 'fulltext-search',
      icon: 'pi-search',
      title: 'Volltextsuche',
      subtitle: 'Durchsuche alle Beiträge und Kommentare',
      status: 'soon',
    },
    {
      key: 'cluster-compare',
      icon: 'pi-objects-column',
      title: 'Cluster-Vergleich',
      subtitle: 'Vergleiche zwei Persona-Gruppen',
      status: 'soon',
    },
    {
      key: 'data-export',
      icon: 'pi-download',
      title: 'Daten-Export',
      subtitle: 'JSON, Posts CSV, Personas CSV',
      status: 'active',
      isExport: true,
    },
  ];
}
