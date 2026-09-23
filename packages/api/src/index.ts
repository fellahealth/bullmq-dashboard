import path from 'path';
import { DashboardOptions, IServerAdapter } from '../typings/app';
import { errorHandler } from './handlers/error';
import { BaseAdapter } from './queueAdapters/base';
import { getQueuesApi } from './queuesApi';
import { appRoutes } from './routes';

export function createDashboard({
  queues,
  serverAdapter,
  options = { uiConfig: {} },
}: {
  queues: ReadonlyArray<BaseAdapter>;
  serverAdapter: IServerAdapter;
  options?: DashboardOptions;
}) {
  const readOnlyMode = options.readOnlyMode === true;
  const base = getQueuesApi(queues);
  const { queueRegistry, removeQueue } = base;

  // When the dashboard is read-only, force every queue (current and any added
  // later, e.g. via runtime discovery) into read-only so the server rejects
  // mutations and the UI hides the corresponding actions.
  const enforce = (queue: BaseAdapter): BaseAdapter => {
    if (readOnlyMode) queue.enableReadOnlyMode();
    return queue;
  };
  if (readOnlyMode) queueRegistry.forEach((queue) => queue.enableReadOnlyMode());

  const addQueue = (queue: BaseAdapter) => base.addQueue(enforce(queue));
  const setQueues = (newQueues: ReadonlyArray<BaseAdapter>) =>
    base.setQueues(newQueues.map(enforce));
  const replaceQueues = (newQueues: ReadonlyArray<BaseAdapter>) =>
    base.replaceQueues(newQueues.map(enforce));

  const uiBasePath =
    options.uiBasePath ||
    // oxlint-disable-next-line no-eval
    path.dirname(eval(`require.resolve('@aios-medical/bullmq-dashboard-ui/package.json')`));

  serverAdapter
    .setQueues(queueRegistry)
    .setViewsPath(path.join(uiBasePath, 'dist'))
    .setStaticPath('/static', path.join(uiBasePath, 'dist/static'))
    .setUIConfig({
      title: 'AIOS BullMQ Dashboard',
      favIcon: {
        default: 'static/images/logo.svg',
        alternative: 'static/favicon-32x32.png',
      },
      ...options.uiConfig,
      ...(readOnlyMode ? { readOnlyMode: true } : {}),
    })
    .setEntryRoute(appRoutes.entryPoint)
    .setErrorHandler(errorHandler)
    .setApiRoutes(appRoutes.api);

  return { setQueues, replaceQueues, addQueue, removeQueue };
}
