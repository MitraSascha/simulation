import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SimulationService } from '../../core/services/simulation.service';
import { SimulationCreate } from '../../core/models/simulation.model';

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

  // Presets
  readonly presets = [
    { label: 'Schnelltest', icon: 'pi-bolt', personas: 10, ticks: 5, desc: '~2 Min, günstig' },
    { label: 'Standard', icon: 'pi-chart-bar', personas: 30, ticks: 15, desc: '~8 Min, empfohlen' },
    { label: 'Deep Dive', icon: 'pi-search', personas: 50, ticks: 20, desc: '~20 Min, detailliert' },
    { label: 'Enterprise', icon: 'pi-building', personas: 100, ticks: 30, desc: '~60 Min, maximal' },
  ];

  selectedPreset = signal('Standard');

  applyPreset(preset: typeof this.presets[0]) {
    this.selectedPreset.set(preset.label);
    this.personaCount.set(preset.personas);
    this.tickCount.set(preset.ticks);
  }

  nextStep() { if (this.currentStep() < 3) this.currentStep.update(s => s + 1); }
  prevStep() { if (this.currentStep() > 1) this.currentStep.update(s => s - 1); }

  canProceed(): boolean {
    return this.name().trim().length > 0 && this.productDescription().trim().length > 10;
  }

  estimatedCost(): string {
    return (this.personaCount() * this.tickCount() * 0.00016).toFixed(2);
  }

  estimatedMinutes(): number {
    return Math.ceil(this.personaCount() * this.tickCount() / 60);
  }

  submit() {
    this.submitting.set(true);
    const data: SimulationCreate = {
      name: this.name(),
      product_description: this.productDescription(),
      target_market: this.targetMarket() || undefined,
      industry: this.industry() || undefined,
      config: { persona_count: this.personaCount(), tick_count: this.tickCount() },
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
