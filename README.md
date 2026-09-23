# BullMQ Dashboard

A modern, professional dashboard for monitoring **[BullMQ](https://bullmq.io/)** and legacy
**[Bull](https://github.com/OptimalBits/bull)** queues. Drop-in alternative to
[`bull-board`](https://github.com/felixmosh/bull-board), same wire protocol, same server
adapters you already know, with a refreshed UI built on React 19, Tailwind v4, TanStack Query
and a focused design system.

[![npm version](https://img.shields.io/npm/v/@aios-medical/bullmq-dashboard-nestjs.svg)](https://www.npmjs.com/package/@aios-medical/bullmq-dashboard-nestjs)
[![npm org](https://img.shields.io/badge/npm-%40aios--medical-cb3837?logo=npm)](https://www.npmjs.com/org/aios-medical)
[![license](https://img.shields.io/npm/l/@aios-medical/bullmq-dashboard-nestjs.svg)](./LICENSE)

All four packages are published under the [`@aios-medical`](https://www.npmjs.com/org/aios-medical) npm org.

---

<img alt="Overview: live view of all queues, their throughput and health" src="./screenshots/overview.png" />

_More views (queue detail, job inspection, job actions and settings) are available in the [`screenshots`](./screenshots) folder._


## A fork, not a rewrite

This project is **derived from [`felixmosh/bull-board`](https://github.com/felixmosh/bull-board)**.
The server-side packages (the framework-agnostic queue/job API and the Express/NestJS
adapters) are ports of bull-board's source (MIT, attributed in
[LICENSE](./LICENSE)). They needed almost no changes; bull-board's architecture is solid.

The **UI is rewritten from scratch** with a different design vocabulary:

- A dark-first palette designed for long sessions in front of a queue monitor
- **Light / dark / system themes** with a no-flash inline init
- Real-time charts and a sidebar that surfaces active job counts at a glance
- A dedicated **Settings page** (polling interval, theme, future preferences)
- Modern stack: Vite 6, React 19, Tailwind CSS v4, TanStack Query v5, React Router 7

**Inspiration:** bull-board (UI conventions, REST endpoints), the Vercel and Linear dashboards
(layout, color, motion), and the BullMQ admin tooling space in general. The goal isn't to
replace bull-board; it's to offer an alternative for teams who want a more polished,
opinionated UI without giving up the adapter ecosystem bull-board already built out.

---

## Packages

| Package                                                                                          | Purpose                                                                          |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [`@aios-medical/bullmq-dashboard-api`](https://www.npmjs.com/package/@aios-medical/bullmq-dashboard-api)         | Framework-agnostic API. Wire-compatible with `@bull-board/api`.                  |
| [`@aios-medical/bullmq-dashboard-ui`](https://www.npmjs.com/package/@aios-medical/bullmq-dashboard-ui)           | The new React UI. Ships as a static bundle (`dist/index.ejs` + `dist/static/`).  |
| [`@aios-medical/bullmq-dashboard-express`](https://www.npmjs.com/package/@aios-medical/bullmq-dashboard-express) | Express server adapter.                                                          |
| [`@aios-medical/bullmq-dashboard-nestjs`](https://www.npmjs.com/package/@aios-medical/bullmq-dashboard-nestjs)   | NestJS module (works with `@nestjs/bull` and `@nestjs/bullmq`).                  |

---

## Adapters

There are two kinds of adapters. You pick **one server adapter** (how the dashboard mounts
into your HTTP layer) and **one queue adapter per queue** (which queue library that queue uses).

### Server adapters

| Adapter        | Import                                                              | Use with                          |
| -------------- | ------------------------------------------------------------------ | --------------------------------- |
| `ExpressAdapter` | `@aios-medical/bullmq-dashboard-express`                         | Express 4 / 5 (also used by NestJS) |
| NestJS module    | `@aios-medical/bullmq-dashboard-nestjs`                          | NestJS 9 / 10 / 11                |

> Using Fastify, Koa, Hono, or another framework? It isn't shipped yet. The API is
> framework-agnostic and wire-compatible with `@bull-board/api`, so a new server adapter is
> straightforward to add. Contributions welcome.

### Queue adapters

| Adapter          | Import                                                  | Queue library                          |
| ---------------- | ------------------------------------------------------- | -------------------------------------- |
| `BullMQAdapter`  | `@aios-medical/bullmq-dashboard-api/bullMQAdapter`      | **BullMQ v5** (`bullmq`, `@nestjs/bullmq`) |
| `BullAdapter`    | `@aios-medical/bullmq-dashboard-api/bullAdapter`        | **Legacy Bull v4** (`bull`, `@nestjs/bull`) |

```ts
import { BullMQAdapter } from '@aios-medical/bullmq-dashboard-api/bullMQAdapter';
import { BullAdapter } from '@aios-medical/bullmq-dashboard-api/bullAdapter';

// one adapter instance per queue
new BullMQAdapter(bullmqQueue);
new BullAdapter(bullQueue);
```

You can mix both in the same dashboard: wrap each queue in the adapter that matches its library.

---

## Quick start (NestJS)

```bash
yarn add \
  @aios-medical/bullmq-dashboard-api \
  @aios-medical/bullmq-dashboard-express \
  @aios-medical/bullmq-dashboard-nestjs \
  @aios-medical/bullmq-dashboard-ui
```

```ts
import { Module } from '@nestjs/common';
import { AIOSBullMQDashboardModule } from '@aios-medical/bullmq-dashboard-nestjs';
import { BullAdapter } from '@aios-medical/bullmq-dashboard-api/bullAdapter';
import { ExpressAdapter } from '@aios-medical/bullmq-dashboard-express';
import basicAuth from 'express-basic-auth';

@Module({
  imports: [
    AIOSBullMQDashboardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      dashboardOptions: {
        uiConfig: {
          title: 'My Queues',
          subtitle: 'production',
          environment: { label: 'Production', color: '#ef4444' },
        },
      },
      middleware: basicAuth({
        challenge: true,
        users: { admin: process.env.DASHBOARD_PASSWORD! },
      }),
    }),
    AIOSBullMQDashboardModule.forFeature(
      { name: 'emails', adapter: BullAdapter, options: { displayName: 'Emails' } },
      { name: 'reports', adapter: BullAdapter, options: { displayName: 'Reports' } },
    ),
  ],
})
export class AppModule {}
```

Mount the queues with `@nestjs/bull` or `@nestjs/bullmq` as usual; the dashboard discovers
them via `AIOSBullMQDashboardModule.forFeature`. Open your app at `/queues`.

Use `BullAdapter` for `@nestjs/bull` (legacy Bull v4) and `BullMQAdapter` (from
`@aios-medical/bullmq-dashboard-api/bullMQAdapter`) for `@nestjs/bullmq`.

---

## Configuration

All options passed to `createDashboard({ options: { uiConfig: ... } })`:

| Option                      | Type                                           | Default                  |
| --------------------------- | ---------------------------------------------- | ------------------------ |
| `title`                | `string`                                       | `'AIOS BullMQ Dashboard'`|
| `subtitle`             | `string`                                       | unset (hidden)           |
| `favIcon`                   | `{ default: string; alternative: string }`     | shipped icons            |
| `environment`               | `{ label: string; color: string; textColor?: string }` | -                        |
| `pollingInterval.forceInterval` | `number` (ms)                              | unset (user-controlled)  |
| `miscLinks`                 | `Array<{ text: string; url: string }>`         | `[]`                     |
| `hideRedisDetails`          | `boolean`                                      | `false`                  |

If `pollingInterval.forceInterval` is set, the user's local setting on the Settings page is
ignored and the UI displays a banner explaining the server-side override.

---

## Read-only mode

Pass `readOnlyMode: true` at the top level of the dashboard options (alongside `uiConfig`, not
inside it) to turn the whole dashboard into a viewer. The server rejects every mutating request
with `405 Method Not Allowed`, and the UI hides all action controls (retry, promote, remove,
pause/resume, clean, add job). Read endpoints (queues, jobs, logs, search) keep working.

```ts
createDashboard({
  queues,
  serverAdapter,
  options: {
    readOnlyMode: true,
    uiConfig: { title: 'My Queues (read-only)' },
  },
});
```

For NestJS, set it inside `dashboardOptions`:

```ts
AIOSBullMQDashboardModule.forRoot({
  route: '/queues',
  adapter: ExpressAdapter,
  dashboardOptions: { readOnlyMode: true },
});
```

The flag applies to **every** queue, including queues registered later at runtime, and takes
precedence over per-queue `readOnlyMode` options. Enforcement is server-side, so it holds even
if a client is modified to re-enable the buttons.

---

## Local development

The repo is a yarn workspace. To work on the packages:

```bash
yarn install
yarn build           # build all packages once
yarn workspace @aios-medical/bullmq-dashboard-ui dev   # UI in dev mode with HMR
yarn typecheck       # run tsc across the workspace
```

The UI dev server runs on `http://localhost:9000` and proxies `/api` to whichever
server you have running on `:3000`. Wire it up against your own Express/NestJS app for
end-to-end testing.

### Repository layout

```
packages/
├── api/          Framework-agnostic API (ported from @bull-board/api)
├── express/      Express server adapter
├── nestjs/       NestJS module
└── ui/           Modern React UI (Vite + React 19 + Tailwind v4)
```

---

## Compatibility

- **Node** ≥ 18
- **Bull** v4
- **BullMQ** v5
- **NestJS** v9, v10, v11 (peer-depended on `@nestjs/common` and `@nestjs/core`)
- **Express** 4 or 5

---

## Acknowledgments

- **[Felix Mosheev](https://github.com/felixmosh)** and the bull-board contributors:
  the API, adapters, and overall protocol design are theirs. Without bull-board this
  project would have been months of work instead of a weekend.
- The **BullMQ** team for the queue itself.
- The **Radix UI**, **Tailwind**, and **lucide-react** teams for the building blocks.

---

## License

MIT. See [LICENSE](./LICENSE). Portions of `packages/api`, `packages/express`, and
`packages/nestjs` are adapted from
[felixmosh/bull-board](https://github.com/felixmosh/bull-board) (MIT, © Felix Mosheev).
