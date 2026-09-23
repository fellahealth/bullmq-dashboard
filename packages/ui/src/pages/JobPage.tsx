import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Cpu,
  Repeat,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ChevronsUp,
  ExternalLink,
} from 'lucide-react';
import { useJob, useJobLogs } from '../hooks/useQueues';
import { useConfirm } from '../hooks/useConfirm';
import { api } from '../lib/api';
import { uiConfig } from '../lib/uiConfig';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatAbsolute, formatDurationMs, formatRelative, cn } from '../lib/utils';

export default function JobPage() {
  const { queueName, jobId } = useParams<{ queueName: string; jobId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data, isLoading } = useJob(queueName, jobId);
  const { data: logs } = useJobLogs(queueName, jobId);
  const [tab, setTab] = useState<'data' | 'returnValue' | 'opts' | 'logs' | 'error'>('data');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['job', queueName, jobId] });
    qc.invalidateQueries({ queryKey: ['queues'] });
  };

  const retry = useMutation({
    mutationFn: () => api.retryJob(queueName!, jobId!),
    onSuccess: invalidate,
  });
  const clean = useMutation({
    mutationFn: () => api.cleanJob(queueName!, jobId!),
    onSuccess: () => {
      invalidate();
      navigate(`/queue/${queueName}`);
    },
  });
  const promote = useMutation({
    mutationFn: () => api.promoteJob(queueName!, jobId!),
    onSuccess: invalidate,
  });

  const handleRetry = async () => {
    if (
      await confirm({
        title: `Retry job #${jobId}?`,
        description: 'The job moves back to the waiting state and will be picked up by a worker.',
        confirmText: 'Retry',
        icon: <RotateCcw />,
      })
    ) {
      retry.mutate();
    }
  };

  const handlePromote = async () => {
    if (
      await confirm({
        title: `Promote job #${jobId}?`,
        description: 'The job leaves the delayed set and runs as soon as a worker is free.',
        confirmText: 'Promote',
        icon: <ChevronsUp />,
      })
    ) {
      promote.mutate();
    }
  };

  const handleRemove = async () => {
    if (
      await confirm({
        title: `Remove job #${jobId}?`,
        description: 'This permanently deletes the job. Cannot be undone.',
        confirmText: 'Remove',
        variant: 'danger',
        icon: <Trash2 />,
      })
    ) {
      clean.mutate();
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const job = data.job;
  const status = data.status;
  const duration =
    job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/queue/${queueName}`}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to {queueName}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-fg)]">
            {job.name}
          </h1>
          <span className="font-mono text-sm text-[var(--color-fg-subtle)]">#{String(job.id)}</span>
          <Badge status={status} size="md" />
          {job.externalUrl && (
            <a
              href={job.externalUrl.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
            >
              {job.externalUrl.displayText ?? 'External'}{' '}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {!uiConfig.readOnlyMode && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleRetry}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
          {status === 'delayed' && (
            <Button variant="secondary" size="sm" onClick={handlePromote}>
              <ChevronsUp className="h-3.5 w-3.5" /> Promote
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRemove}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon={<Clock className="h-3.5 w-3.5" />} label="Created" value={formatRelative(job.timestamp)} hint={formatAbsolute(job.timestamp)} />
        <MetricTile
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="Processed"
          value={job.processedOn ? formatRelative(job.processedOn) : '—'}
          hint={job.processedBy ? `By ${job.processedBy}` : undefined}
        />
        <MetricTile
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Duration"
          value={formatDurationMs(duration)}
          hint={job.finishedOn ? formatAbsolute(job.finishedOn) : undefined}
        />
        <MetricTile
          icon={<Repeat className="h-3.5 w-3.5" />}
          label="Attempts"
          value={`${job.attempts ?? 0}`}
          hint={job.delay ? `Delay ${formatDurationMs(job.delay)}` : undefined}
        />
      </section>

      <Card>
        <CardHeader className="overflow-x-auto py-0">
          <div className="flex">
            {(['data', 'returnValue', 'opts', 'logs', 'error'] as const).map((t) => {
              const visible =
                t === 'error' ? job.failedReason || job.stacktrace?.length > 0 : true;
              if (!visible) return null;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'border-b-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors',
                    tab === t
                      ? 'border-blue-500 text-[var(--color-fg)]'
                      : 'border-transparent text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]'
                  )}
                >
                  {t === 'returnValue' ? 'Return' : t}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardBody>
          {tab === 'data' && <JsonView value={job.data} />}
          {tab === 'returnValue' && <JsonView value={job.returnValue} />}
          {tab === 'opts' && <JsonView value={job.opts} />}
          {tab === 'logs' && (
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--color-surface-2)] p-3 font-mono text-xs leading-relaxed text-[var(--color-fg)]">
              {logs?.length ? logs.join('\n') : <span className="text-[var(--color-fg-subtle)]">No logs.</span>}
            </pre>
          )}
          {tab === 'error' && (
            <div className="space-y-3">
              {job.failedReason && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <span className="font-mono text-xs">{job.failedReason}</span>
                </div>
              )}
              {job.stacktrace?.length > 0 && (
                <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--color-surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--color-fg-muted)]">
                  {job.stacktrace.join('\n\n')}
                </pre>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-base font-semibold text-[var(--color-fg)]">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-[var(--color-fg-subtle)]">{hint}</p>}
    </div>
  );
}

function JsonView({ value }: { value: unknown }) {
  let text = '';
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  if (!text || text === '""' || text === 'null' || text === '{}') {
    return <p className="text-xs text-[var(--color-fg-subtle)]">Empty.</p>;
  }
  return (
    <pre className="max-h-[480px] overflow-auto rounded-md bg-[var(--color-surface-2)] p-3 font-mono text-xs leading-relaxed text-[var(--color-fg)]">
      {text}
    </pre>
  );
}
