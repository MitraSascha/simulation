import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { PostService } from '../../../core/services/post.service';
import { SimulationService } from '../../../core/services/simulation.service';
import { Post } from '../../../core/models/content.model';
import { TickSnapshot } from '../../../core/models/simulation.model';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';

@Component({
  selector: 'app-sentiment',
  standalone: true,
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './sentiment.component.html',
})
export class SentimentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private postService = inject(PostService);
  private simService = inject(SimulationService);

  platformChart = signal<EChartsOption>({});
  activityChart = signal<EChartsOption>({});
  loading = signal(true);

  private simId = '';

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.loadData();
  }

  private loadData() {
    this.postService.list(this.simId, { limit: 1000 }).subscribe(res => {
      this.buildPlatformChart(res.items);
      this.loading.set(false);
    });
    this.simService.getTicks(this.simId).subscribe(ticks => {
      this.buildActivityChart(ticks);
    });
  }

  private buildPlatformChart(posts: Post[]) {
    const feedbook = posts.filter(p => p.platform === 'feedbook').length;
    const threadit = posts.filter(p => p.platform === 'threadit').length;

    this.platformChart.set({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c} ({d}%)' },
        data: [
          { value: feedbook, name: 'FeedBook', itemStyle: { color: '#3b82f6' } },
          { value: threadit, name: 'Threadit', itemStyle: { color: '#f97316' } },
        ],
      }],
    });
  }

  private buildActivityChart(ticks: TickSnapshot[]) {
    this.activityChart.set({
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: ticks.map(t => `Tag ${t.ingame_day}`) },
      yAxis: { type: 'value' },
      series: [{
        type: 'line',
        data: ticks.map(t => t.snapshot.personas_active),
        smooth: true,
        areaStyle: { opacity: 0.3 },
        color: '#8b5cf6',
        name: 'Aktive Personas'
      }],
    });
  }
}
