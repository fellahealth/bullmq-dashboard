export type Status =
  | 'latest'
  | 'active'
  | 'waiting'
  | 'waiting-children'
  | 'prioritized'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

export type JobStatus = Exclude<Status, 'latest'>;

export type JobCounts = Record<Status, number>;

export type QueueType = 'bull' | 'bullmq' | 'bullmqpro';

export interface AppJob {
  id?: string | number | null;
  name: string;
  timestamp: number;
  processedOn?: number | null;
  processedBy?: string | null;
  finishedOn?: number | null;
  progress: string | boolean | number | object;
  attempts: number;
  failedReason: string;
  stacktrace: string[];
  delay?: number;
  opts: Record<string, unknown>;
  data: unknown;
  returnValue: unknown;
  isFailed: boolean;
  externalUrl?: { displayText?: string; href: string };
  groupId?: string | number;
}

export interface Pagination {
  pageCount: number;
  range: { start: number; end: number };
}

export interface AppQueue {
  delimiter: string;
  name: string;
  displayName?: string;
  description?: string;
  counts: JobCounts;
  jobs: AppJob[];
  statuses: Status[];
  pagination: Pagination;
  readOnlyMode: boolean;
  allowRetries: boolean;
  allowCompletedRetries: boolean;
  isPaused: boolean;
  type: QueueType;
  globalConcurrency: number | null;
  workerConcurrency: number | null;
}

export interface GetQueuesResponse {
  queues: AppQueue[];
}

export interface GetJobResponse {
  job: AppJob;
  status: Status;
}

export interface RedisStats {
  version: string;
  mode: string;
  port: number;
  os: string;
  uptime: number;
  memory: {
    total: number;
    used: number;
    fragmentationRatio: number;
    peak: number;
  };
  clients: {
    connected: number;
    blocked: number;
  };
}

export interface UIConfig {
  readOnlyMode?: boolean;
  title?: string;
  subtitle?: string;
  pollingInterval?: { showSetting?: boolean; forceInterval?: number };
  environment?: { label: string; color: string; textColor?: string };
  hideRedisDetails?: boolean;
  miscLinks?: Array<{ text: string; url: string }>;
}

export const ALL_STATUSES: JobStatus[] = [
  'active',
  'waiting',
  'waiting-children',
  'prioritized',
  'completed',
  'failed',
  'delayed',
  'paused',
];

export type JobCleanStatus = 'completed' | 'wait' | 'active' | 'delayed' | 'failed';
export type JobRetryStatus = 'completed' | 'failed';
