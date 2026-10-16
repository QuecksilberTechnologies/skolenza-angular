import { PmsDashboard } from './dashboard';
import { Feedback } from './feedback';
import { Goal } from './goal';
import { HistoryEvent } from './history';
import { OneOnOne } from './one-on-one';
import { PmsResponse } from './pms-common';
import { Review } from './review';

export type GoalsResponse = PmsResponse<Goal[]>;
export type ReviewsResponse = PmsResponse<Review[]>;
export type FeedbackResponse = PmsResponse<Feedback[]>;
export type OneOnOneResponse = PmsResponse<OneOnOne[]>;
export type HistoryResponse = PmsResponse<HistoryEvent[]>;
export type DashboardResponse = PmsResponse<PmsDashboard>;
