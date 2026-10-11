export interface PmsKpiSummary {
  activeGoals: number;
  pendingReviews: number;
  completedReviews: number;
  feedbackReceived: number;
  averageRating: number; // 1–5
}

export interface ChartSeries {
  labels: string[];
  values: number[];
}

export interface PmsDashboard {
  kpis: PmsKpiSummary;
  /** Goal progress distribution by category. */
  goalProgress: ChartSeries;
  /** Average rating trend across review cycles. */
  ratingTrend: ChartSeries;
}
