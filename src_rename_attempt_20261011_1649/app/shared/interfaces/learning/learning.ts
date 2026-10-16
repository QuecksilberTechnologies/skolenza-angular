import { ChartSeries } from '../performance/dashboard';

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type LearningStatus = 'NotStarted' | 'InProgress' | 'Completed';
export type AssignPriority = 'Low' | 'Medium' | 'High';

/** Generic mock response envelope (mirrors PmsResponse). */
export interface LearningResponse<T> {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: T;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface CourseLesson {
  id: string;
  title: string;
  durationMinutes: number;
  type: 'video' | 'reading' | 'quiz';
}

export interface CourseSection {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseResource {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'file';
  url: string;
}

export interface CourseReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  category: string;
  level: CourseLevel;
  durationHours: number;
  rating: number;
  ratingCount: number;
  enrolledCount: number;
  language: string;
  thumbnail: string;
  banner: string;
  tags: string[];
  skills: string[];
  description: string;
  sections: CourseSection[];
  resources: CourseResource[];
  reviews: CourseReview[];
}

export interface MyLearningItem {
  id: string;
  courseId: string;
  title: string;
  category: string;
  thumbnail: string;
  durationHours: number;
  progress: number;
  status: LearningStatus;
  lastAccessed: string;
}

export interface Certificate {
  id: string;
  courseTitle: string;
  certificateNumber: string;
  completionDate: string;
  instructor: string;
  skills: string[];
}

export interface DeadlineItem {
  id: string;
  title: string;
  dueDate: string;
  type: 'Assignment' | 'Assessment' | 'Course';
}

export interface LearningKpis {
  totalCourses: number;
  inProgress: number;
  completed: number;
  assigned: number;
  certificates: number;
  pendingAssessments: number;
}

export interface LearningDashboard {
  kpis: LearningKpis;
  continueLearning: MyLearningItem[];
  recommended: Course[];
  recentCertificates: Certificate[];
  upcomingDeadlines: DeadlineItem[];
  monthlyEnrollments: ChartSeries;
  skillDistribution: ChartSeries;
  completionRate: ChartSeries;
}

export interface CourseFilter {
  search?: string;
  category?: string | null;
  skill?: string | null;
  level?: CourseLevel | null;
  maxDuration?: number | null;
  minRating?: number | null;
}

export interface MyLearningFilter {
  search?: string;
  category?: string | null;
  status?: LearningStatus | null;
}

// ---- Phase 2 ----

export interface LearningPathStep {
  id: string;
  title: string;
  status: LearningStatus;
  durationHours: number;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  role: string;
  estimatedHours: number;
  progress: number;
  steps: LearningPathStep[];
}

export interface AssignedCourse {
  id: string;
  courseId: string;
  title: string;
  assignedBy: string;
  assignedDate: string;
  dueDate: string;
  priority: AssignPriority;
  progress: number;
  status: LearningStatus;
  mandatory: boolean;
}

export interface AssignedFilter {
  priority?: AssignPriority | null;
  status?: LearningStatus | null;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Assessment {
  id: string;
  courseTitle: string;
  category: string;
  durationMinutes: number;
  passingScore: number;
  questions: Question[];
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
}

export interface KnowledgeAttachment {
  name: string;
  url: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  author: string;
  updatedAt: string;
  popular: boolean;
  attachments: KnowledgeAttachment[];
}

export interface KnowledgeFilter {
  search?: string;
  category?: string | null;
}

export type EventType = 'Session' | 'Live Training' | 'Webinar' | 'Deadline';

export interface LearningEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  host: string;
  location: string;
}

export type CoursesResponse = LearningResponse<Course[]>;
export type CourseResponse = LearningResponse<Course>;
export type MyLearningResponse = LearningResponse<MyLearningItem[]>;
export type CertificatesResponse = LearningResponse<Certificate[]>;
export type LearningDashboardResponse = LearningResponse<LearningDashboard>;
export type LearningPathsResponse = LearningResponse<LearningPath[]>;
export type AssignedResponse = LearningResponse<AssignedCourse[]>;
export type AssessmentsResponse = LearningResponse<Assessment[]>;
export type AssessmentResponse = LearningResponse<Assessment>;
export type KnowledgeResponse = LearningResponse<KnowledgeArticle[]>;
export type CalendarResponse = LearningResponse<LearningEvent[]>;
