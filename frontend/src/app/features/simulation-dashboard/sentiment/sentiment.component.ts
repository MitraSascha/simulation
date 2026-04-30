import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { PostService } from '../../../core/services/post.service';
import { SimulationService } from '../../../core/services/simulation.service';
import { Post } from '../../../core/models/content.model';
import { TickSnapshot } from '../../../core/models/simulation.model';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { CHART, FONT_MONO, FONT_SANS, tooltipStyle, axisCommon, legendCommon } from '../../../shared/chart-theme';

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
  totalPosts = signal(0);
  loading = signal(true);

  private simId = '';

  ngOnInit() {
    this.simId = this.route.parent!.snapshot.params['id'];
    this.loadData();
  }

  private loadData() {
    this.postService.list(this.simId, { limit: 500 }).subscribe(res => {
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
    this.totalPosts.set(feedbook + threadit);

    this.platformChart.set({
      tooltip: { trigger: 'item', ...tooltipStyle },
      legend: legendCommon(['FeedBook', 'Threadit']),
      series: [{
        type: 'pie',
        radius: ['58%', '80%'],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: '#ffffff', borderWidth: 3, borderRadius: 4 },
        label: {
          show: true,
          formatter: '{b}\n{c} · {d}%',
          color: CHART.ink,
          fontFamily: FONT_SANS,
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 16,
        },
        labelLine: { lineStyle: { color: CHART.paperEdge, width: 1 } },
        data: [
          { value: feedbook, name: 'FeedBook', itemStyle: { color: CHART.feedbook } },
          { value: threadit, name: 'Threadit', itemStyle: { color: CHART.threadit } },
        ],
      }],
    });
  }

  private buildActivityChart(ticks: TickSnapshot[]) {
    this.activityChart.set({
      tooltip: { trigger: 'axis', ...tooltipStyle },
      grid: { top: 16, right: 16, bottom: 32, left: 44 },
      xAxis: {
        type: 'category',
        data: ticks.map(t => `T${t.ingame_day}`),
        ...axisCommon({ splitLine: { show: false } }),
      },
      yAxis: { type: 'value', ...axisCommon() },
      series: [{
        type: 'line',
        data: ticks.map(t => t.snapshot.personas_active),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: CHART.vermillion, width: 2 },
        itemStyle: { color: CHART.vermillion, borderColor: CHART.paperDeep, borderWidth: 2 },
        areaStyle: { color: CHART.vermillion, opacity: 0.12 },
        name: 'Aktive Personas',
      }],
    });
  }
}
