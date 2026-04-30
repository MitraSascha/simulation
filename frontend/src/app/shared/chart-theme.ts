/**
 * Mitra Chart Theme — geteilt von allen ECharts-Visualisierungen.
 * Clean, modern, Inter-Sans-Serif, abgestimmt auf die neuen Theme-Variablen.
 */

export const CHART = {
  ink:         '#0e0e0c',
  inkSoft:     '#2a2924',
  inkMute:     '#6b675c',
  inkFaint:    '#9c978a',
  paper:       '#ffffff',
  paperDeep:   '#faf7f1',
  paperEdge:   '#e3dccd',
  vermillion:  '#c8321f',
  feedbook:    '#1e3a8a',
  threadit:    '#a16207',
  moss:        '#15803d',
  rust:        '#b91c1c',
  slate:       '#5a6470',
} as const;

export const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

/** Standard-Tooltip — weiß mit dunkler Border, leichter Shadow */
export const tooltipStyle = {
  backgroundColor: '#ffffff',
  borderColor: CHART.ink,
  borderWidth: 1,
  borderRadius: 8,
  padding: [10, 14],
  textStyle: { color: CHART.ink, fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500 as any },
  extraCssText: 'box-shadow: 0 4px 12px rgba(14,14,12,0.10);',
};

/** Standard-Achsen-Konfiguration */
export const axisCommon = (overrides: any = {}) => ({
  axisLine:  { lineStyle: { color: CHART.paperEdge, width: 1 } },
  axisTick:  { show: false },
  axisLabel: { color: CHART.inkMute, fontFamily: FONT_SANS, fontSize: 11, ...overrides.axisLabel },
  splitLine: { lineStyle: { color: CHART.paperEdge, type: 'dashed' as any } },
  ...overrides,
});

/** Standard-Legende */
export const legendCommon = (data: string[]) => ({
  data,
  bottom: 0,
  textStyle: { color: CHART.inkMute, fontFamily: FONT_SANS, fontSize: 12 },
  itemWidth: 10,
  itemHeight: 10,
  icon: 'circle',
});
