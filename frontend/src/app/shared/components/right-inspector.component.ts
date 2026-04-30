import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Wiederverwendbare Right-Inspector-Komponente (Editorial-Light-Theme).
 *
 * Verhalten:
 *  - `open: true`  → volle Drawer-Breite (`width`-Input), slidet von rechts ein.
 *  - `open: false` → 32px schmaler Streifen mit vertikal rotiertem Hint-Text.
 *
 * Outputs:
 *  - `closed`  → X-Button geklickt
 *  - `opened`  → Collapsed-Streifen geklickt
 *
 * Slots:
 *  - Default-Slot   → Body
 *  - `[inspector-footer]` → optionaler Footer-Slot
 */
@Component({
  selector: 'app-right-inspector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="ri-root"
      [class.ri-open]="open()"
      [class.ri-collapsed]="!open()"
      [style.width]="open() ? width() : '32px'"
      role="complementary"
      [attr.aria-label]="label()"
      [attr.aria-expanded]="open()"
    >
      @if (open()) {
        <header class="ri-header">
          <div class="ri-header-text">
            <p class="plate-label ri-label">{{ label() }}</p>
            <h3 class="ri-title">{{ title() }}</h3>
          </div>
          @if (closable()) {
            <button
              type="button"
              class="ri-close"
              (click)="closed.emit()"
              aria-label="Inspector schließen"
              title="Schließen"
            >
              ×
            </button>
          }
        </header>

        <div class="ri-body">
          <ng-content></ng-content>
        </div>

        <footer class="ri-footer">
          <ng-content select="[inspector-footer]"></ng-content>
        </footer>
      } @else {
        <button
          type="button"
          class="ri-strip"
          (click)="opened.emit()"
          [attr.aria-label]="'Inspector öffnen: ' + label()"
          title="Öffnen"
        >
          <span class="ri-strip-text">{{ label() }}</span>
        </button>
      }
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .ri-root {
      position: relative;
      height: 100%;
      background: var(--paper-deep);
      border-left: 2px solid var(--ink);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition:
        width 280ms cubic-bezier(0.2, 0.7, 0.2, 1),
        transform 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }

    .ri-open {
      transform: translateX(0);
      animation: ri-slide-in 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }

    @keyframes ri-slide-in {
      from { transform: translateX(8px); opacity: 0.4; }
      to   { transform: translateX(0); opacity: 1; }
    }

    .ri-collapsed {
      cursor: pointer;
    }

    /* ── Header ───────────────────────────────────────── */
    .ri-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--paper-edge);
      background: var(--paper-deep);
      flex-shrink: 0;
    }
    .ri-header-text { min-width: 0; flex: 1; }
    .ri-label { margin-bottom: 4px; }
    .ri-title {
      font-family: var(--font-sans);
      font-weight: 700;
      font-size: 18px;
      letter-spacing: -0.015em;
      line-height: 1.3;
      color: var(--ink);
      margin: 0;
      word-break: break-word;
    }

    .ri-close {
      flex-shrink: 0;
      width: 28px; height: 28px;
      border: 1px solid var(--ink);
      background: transparent;
      color: var(--ink);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 140ms ease, color 140ms ease;
    }
    .ri-close:hover {
      background: var(--ink);
      color: var(--paper);
    }

    /* ── Body ─────────────────────────────────────────── */
    .ri-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .ri-footer:empty { display: none; }
    .ri-footer {
      border-top: 1px solid var(--paper-edge);
      padding: 12px 24px;
      flex-shrink: 0;
    }

    /* ── Collapsed Strip ──────────────────────────────── */
    .ri-strip {
      width: 32px;
      height: 100%;
      background: var(--paper-deep);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 140ms ease;
    }
    .ri-strip:hover { background: var(--paper-edge); }

    .ri-strip-text {
      font-family: var(--font-mono, 'IBM Plex Mono', monospace);
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--ink-mute);
      transform: rotate(-90deg);
      white-space: nowrap;
      user-select: none;
    }
    .ri-strip:hover .ri-strip-text { color: var(--ink); }
  `],
})
export class RightInspectorComponent {
  open = input<boolean>(false);
  width = input<string>('380px');
  label = input<string>('Inspector');
  title = input<string>('');
  closable = input<boolean>(true);

  closed = output<void>();
  opened = output<void>();
}
