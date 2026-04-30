import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SimulationService } from '../../core/services/simulation.service';
import { SimulationCreate, LlmProvider } from '../../core/models/simulation.model';

@Component({
  selector: 'app-simulation-create',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './simulation-create.component.html',
})
export class SimulationCreateComponent {
  private simService = inject(SimulationService);
  private router = inject(Router);

  currentStep = signal(1);
  submitting = signal(false);

  // Step 1: Product
  name = signal('');
  productDescription = signal('');
  targetMarket = signal('');
  industry = signal('');

  // Step 2: Configuration
  personaCount = signal(30);
  tickCount = signal(15);
  llmProvider = signal<LlmProvider>('anthropic');

  readonly providers: { id: LlmProvider; label: string; sub: string; icon: string }[] = [
    { id: 'anthropic', label: 'Claude (Anthropic)', sub: 'Sonnet 4.6 + Haiku 4.5', icon: 'pi-sparkles' },
    { id: 'openai',    label: 'OpenAI',             sub: 'GPT-4o + GPT-4o-mini',   icon: 'pi-bolt' },
  ];

  // Presets
  readonly presets = [
    { label: 'Schnelltest', icon: 'pi-bolt', personas: 10, ticks: 5, desc: '~2 Min, günstig' },
    { label: 'Standard', icon: 'pi-chart-bar', personas: 30, ticks: 15, desc: '~8 Min, empfohlen' },
    { label: 'Deep Dive', icon: 'pi-search', personas: 50, ticks: 20, desc: '~20 Min, detailliert' },
    { label: 'Enterprise', icon: 'pi-building', personas: 100, ticks: 30, desc: '~60 Min, maximal' },
    { label: 'Großfeld', icon: 'pi-th-large', personas: 200, ticks: 20, desc: '~90 Min, breit' },
    { label: 'Repräsentativ', icon: 'pi-users', personas: 500, ticks: 30, desc: '~3 Std, Studien-Niveau' },
  ];

  selectedPreset = signal('Standard');

  applyPreset(preset: typeof this.presets[0]) {
    this.selectedPreset.set(preset.label);
    this.personaCount.set(preset.personas);
    this.tickCount.set(preset.ticks);
  }

  /** Personas-Slider: bis 100 in 5er-Schritten, ab 100 in 25er-Schritten. */
  setPersonaCount(raw: number) {
    let v = Number(raw);
    if (v > 100) {
      v = Math.round(v / 25) * 25;
    } else {
      v = Math.round(v / 5) * 5;
    }
    this.personaCount.set(v);
    this.selectedPreset.set('');
  }

  setTickCount(raw: number) {
    this.tickCount.set(Number(raw));
    this.selectedPreset.set('');
  }

  nextStep() { if (this.currentStep() < 3) this.currentStep.update(s => s + 1); }
  prevStep() { if (this.currentStep() > 1) this.currentStep.update(s => s - 1); }

  canProceed(): boolean {
    return this.name().trim().length > 0 && this.productDescription().trim().length > 10;
  }

  /** API-Kosten = Haiku-Aktionen + Sonnet Persona-Gen + Sonnet Report. */
  estimatedCost(): string {
    const haiku = this.personaCount() * this.tickCount() * 0.00016;
    const personaGen = this.personaCount() * 0.001;   // Sonnet Batches
    const report = 0.05;                              // Sonnet Final-Report (Pauschal)
    return (haiku + personaGen + report).toFixed(2);
  }

  estimatedMinutes(): number {
    // Parallelisiert: ~180 Persona-Aktionen pro Minute realistisch.
    const actionMinutes = Math.ceil(this.personaCount() * this.tickCount() / 180);
    // Persona-Gen: ~25 pro Batch, 4 parallel, ~25s pro Batch.
    const genMinutes = Math.ceil(this.personaCount() / (25 * 4) * 0.5);
    return Math.max(2, actionMinutes + genMinutes + 1);
  }

  /** Warnt ab Sims, die voraussichtlich >60 Min laufen. */
  isLongRun(): boolean {
    return this.estimatedMinutes() >= 60;
  }

  durationLabel(): string {
    const m = this.estimatedMinutes();
    if (m < 60) return `~${m} Min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `~${h} Std` : `~${h} Std ${rest} Min`;
  }

  submit() {
    this.submitting.set(true);
    const data: SimulationCreate = {
      name: this.name(),
      product_description: this.productDescription(),
      target_market: this.targetMarket() || undefined,
      industry: this.industry() || undefined,
      config: { persona_count: this.personaCount(), tick_count: this.tickCount() },
      llm_provider: this.llmProvider(),
    };
    this.simService.create(data).subscribe({
      next: (sim) => {
        this.simService.run(sim.id).subscribe({
          next: () => this.router.navigate(['/simulation', sim.id, 'overview']),
          error: () => this.router.navigate(['/simulation', sim.id, 'overview']),
        });
      },
      error: () => this.submitting.set(false),
    });
  }
}
