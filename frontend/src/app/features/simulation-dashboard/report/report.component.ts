import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AnalysisService } from '../../../core/services/analysis.service';
import { ExportService } from '../../../core/services/export.service';
import { AnalysisReport } from '../../../core/models/analysis.model';

@Component({
  selector: 'app-report',
  standalone: true,
  templateUrl: './report.component.html',
})
export class ReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private analysisService = inject(AnalysisService);
  protected exportService = inject(ExportService);

  report = signal<AnalysisReport | null>(null);
  loading = signal(true);
  regenerating = signal(false);
  noReport = signal(false);

  protected simId = '';

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.loadReport();
  }

  private loadReport() {
    this.loading.set(true);
    this.analysisService.getReport(this.simId).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.noReport.set(true);
        this.loading.set(false);
      },
    });
  }

  regenerate() {
    this.regenerating.set(true);
    this.analysisService.generateReport(this.simId).subscribe({
      next: (r) => {
        this.report.set(r);
        this.regenerating.set(false);
        this.noReport.set(false);
      },
      error: () => this.regenerating.set(false),
    });
  }

  getSectionContent(key: string): string | null {
    const r = this.report();
    if (!r) return null;
    return (r as Record<string, any>)[key] || null;
  }

  readonly sections = [
    { key: 'sentiment_over_time', label: 'Sentiment-Verlauf', icon: 'pi-chart-line' },
    { key: 'key_turning_points', label: 'Wendepunkte', icon: 'pi-bolt' },
    { key: 'criticism_points', label: 'Kritikpunkte', icon: 'pi-exclamation-triangle' },
    { key: 'opportunities', label: 'Chancen', icon: 'pi-star' },
    { key: 'target_segment_analysis', label: 'Zielgruppen', icon: 'pi-users' },
    { key: 'unexpected_findings', label: 'Ueberraschungen', icon: 'pi-question-circle' },
    { key: 'influence_network', label: 'Influence-Netzwerk', icon: 'pi-share-alt' },
    { key: 'platform_dynamics', label: 'Plattform-Dynamik', icon: 'pi-desktop' },
    { key: 'network_evolution', label: 'Netzwerk-Evolution', icon: 'pi-sitemap' },
  ];
}
