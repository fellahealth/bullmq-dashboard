import {
  DashboardRequest,
  FormatterField,
  JobCleanStatus,
  JobCounts,
  JobStatus,
  QueueAdapterOptions,
  QueueJob,
  QueueJobOptions,
  QueueType,
  Status,
} from '../../typings/app';

export abstract class BaseAdapter {
  public readOnlyMode: boolean;
  public allowRetries: boolean;
  public allowCompletedRetries: boolean;
  public readonly prefix: string;
  public readonly delimiter: string;
  public readonly description: string;
  public readonly displayName: string;
  public readonly type: QueueType;
  public readonly externalJobUrl: QueueAdapterOptions['externalJobUrl'];
  private formatters = new Map<FormatterField, (data: any) => any>();
  private _visibilityGuard: (request: DashboardRequest) => Promise<boolean> | boolean = () => true;

  protected constructor(
    type: QueueType,
    options: Partial<QueueAdapterOptions & { allowCompletedRetries: boolean }> = {}
  ) {
    this.readOnlyMode = options.readOnlyMode === true;
    this.allowRetries = this.readOnlyMode ? false : options.allowRetries !== false;
    this.allowCompletedRetries = this.allowRetries && options.allowCompletedRetries !== false;
    this.prefix = options.prefix || '';
    this.delimiter = options.delimiter || '';
    this.description = options.description || '';
    this.displayName = options.displayName || '';
    this.type = type;
    this.externalJobUrl = options.externalJobUrl;
  }

  public enableReadOnlyMode(): void {
    this.readOnlyMode = true;
    this.allowRetries = false;
    this.allowCompletedRetries = false;
  }

  public getDescription(): string {
    return this.description;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public setFormatter<T extends FormatterField>(
    field: T,
    formatter: (data: any) => T extends 'name' ? string : any
  ): void {
    this.formatters.set(field, formatter);
  }

  public format(field: FormatterField, data: any, defaultValue = data): any {
    const fieldFormatter = this.formatters.get(field);
    return typeof fieldFormatter === 'function' ? fieldFormatter(data) : defaultValue;
  }

  public setVisibilityGuard(guard: (request: DashboardRequest) => Promise<boolean> | boolean) {
    this._visibilityGuard = guard;
  }

  public isVisible(request: DashboardRequest) {
    return this._visibilityGuard(request);
  }

  public abstract clean(queueStatus: JobCleanStatus, graceTimeMs: number): Promise<void>;

  public abstract addJob(name: string, data: any, options: QueueJobOptions): Promise<QueueJob>;

  public abstract getJob(id: string): Promise<QueueJob | undefined | null>;

  public abstract getJobCounts(): Promise<JobCounts>;

  public abstract getJobs(
    jobStatuses: JobStatus[],
    start?: number,
    end?: number
  ): Promise<QueueJob[]>;

  public abstract getJobLogs(id: string): Promise<string[]>;

  public abstract getName(): string;

  public abstract getRedisInfo(): Promise<string>;

  public abstract isPaused(): Promise<boolean>;

  public abstract pause(): Promise<void>;

  public abstract resume(): Promise<void>;

  public abstract empty(): Promise<void>;

  public abstract obliterate(): Promise<void>;

  public abstract promoteAll(): Promise<void>;

  public abstract removeJobScheduler(id: string): Promise<boolean>;

  public abstract getStatuses(): Status[];

  public abstract getJobStatuses(): JobStatus[];

  public abstract getGlobalConcurrency(): Promise<number | null>;

  public abstract setGlobalConcurrency(concurrency: number): Promise<void>;

  /**
   * Worker-level concurrency, if known. The adapter doesn't try to compute
   * this itself — Bull v4 doesn't store the concurrency anywhere on the
   * Queue after `process(name, concurrency, handler)` returns, so reading
   * it would require a framework-aware scanner. Instead, framework
   * integrations (e.g. our @nestjs/bull discovery in the NestJS module)
   * call `setWorkerConcurrency()` once the value is known and the adapter
   * just returns it.
   */
  protected _workerConcurrency: number | null = null;

  public setWorkerConcurrency(value: number | null): void {
    this._workerConcurrency = value;
  }

  public async getWorkerConcurrency(): Promise<number | null> {
    return this._workerConcurrency;
  }
}
