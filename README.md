# FreeSleep

Dynamically set the temperature of your Eight Sleep Pod 2 throughout the night —
without paying for a subscription.

Eight Sleep gates scheduled temperature changes behind a paid membership.
FreeSleep talks to the same Eight Sleep API your app uses, stores a temperature
schedule you draw yourself, and nudges the pod to follow it minute by minute.

![FreeSleep UI](/etc/screenshot.png)

The graph has a sign-in-free demo at the `/demo` route — run it locally (see
[Running locally](#running-locally)) to try it.

## Features

- 🌡️ **Draw your own night curve** — set a different temperature for each part of
  the night by dragging an interactive graph.
- ➕ **Add / remove points** — double-click an empty gap to add a schedule point,
  or double-click a handle to remove it.
- 🔴 **Live "now" marker** — see where you are in the night and the pod's current
  temperature at a glance.
- 🛏️ **Both sides** — independent schedules for the left and right side of the bed.
- 🌗 **Light & dark themes** — follows your system preference, with a manual toggle.
- ⏱️ **Set-and-forget** — a server-side job reconciles the pod every minute, so the
  schedule keeps running whether or not the page is open.
- 🆓 **No subscription** — self-host it for free on hardware you already own (a
  ready-to-run Docker image is published).

## The UI

The schedule is a draggable temperature curve. Time runs left-to-right across the
night; the fill is tinted warm where the curve is high and cool where it dips.

| Action | Gesture |
| --- | --- |
| Change a temperature | Drag a handle up or down (snaps to 0.5 °C) |
| Add a schedule point | Double-click an empty gap on the curve |
| Remove a point | Double-click its handle |
| Switch side | **Left / Right** toggle |
| Switch theme | ☀️ / 🌙 toggle (top right) |

The same component, in light mode:

![FreeSleep UI — light theme](/etc/screenshot-light.png)

## How it works

1. You sign in with your Eight Sleep credentials. The session and your drawn
   schedule are stored in Deno KV (a local SQLite database when self-hosted).
2. The graph saves your schedule as a list of `{ time, level }` points per side.
3. A `Deno.cron` job (`server/control_loop.ts`)
   runs **every minute**. For each logged-in user and each side it:
   - reads the pod's current target heating level from the Eight Sleep API,
   - looks up the temperature your schedule expects *right now*, and
   - writes the new heating level back to the pod if they differ.

Temperatures (13–30 °C in the UI) are mapped to Eight Sleep's internal heating
levels (−100…100) via the table in `server/constants.ts`.

## Tech stack

- [Deno](https://deno.com) + [Fresh 2](https://github.com/denoland/fresh) (Preact islands)
- [paper.js](http://paperjs.org/) for the canvas graph
- [Vite](https://vite.dev) build, [Zod](https://zod.dev) for validation,
  [Biome](https://biomejs.dev) for lint/format
- Deno KV (SQLite-backed) for storage and `Deno.cron` for the control loop

## Running locally

You need [Deno](https://deno.com) 2.x installed.

```sh
# install dependencies
deno install

# start the dev server with hot reload (http://localhost:8000)
deno task dev
```

Open <http://localhost:8000/demo> to play with the graph without signing in.

To run the full app the way the Docker image does (Deno KV + the every-minute
control loop), build first and serve the output:

```sh
deno task build
deno task start
```

Other tasks:

| Task | What it does |
| --- | --- |
| `deno task dev` | Vite dev server with hot reload |
| `deno task build` | Production build into `_fresh/` |
| `deno task start` | Serve the build with `--unstable-kv --unstable-cron` |
| `deno task check` | Biome lint + format (writes fixes) |

## Project structure

```
routes/            Fresh routes
  index.tsx          main app page
  demo.tsx           standalone graph demo
  api/               login / logout / state / expected-state endpoints
islands/
  App.tsx            authenticated app: side + theme controls, wiring
  Demo.tsx           interactive graph playground
components/
  Graph.tsx          the paper.js temperature graph
  Paper.tsx          lazy paper.js setup (browser-only)
  Login.tsx          sign-in form
server/
  control_loop.ts    every-minute reconciliation job
  state.ts           current/expected state + Eight Sleep calls
  session.ts         KV-backed sessions
  constants.ts       temperature ⇄ heating-level table
  eightsleep_api/    typed Eight Sleep API client
main.ts              app entrypoint + Deno.cron registration
```

## Self-hosting

FreeSleep is meant to be self-hosted on any always-on machine — a home server,
NAS, Raspberry Pi, or an Unraid box. It only makes **outbound** calls to the
Eight Sleep API, so it never needs to be exposed to the internet.

The [`Publish Docker image`](.github/workflows/docker-publish.yml) workflow builds
and pushes `ghcr.io/v3rm0n/freesleep` on every push to `main`. Run it with:

```sh
docker run -d \
  --name freesleep \
  -p 8000:8000 \
  -v freesleep-data:/data \
  ghcr.io/v3rm0n/freesleep:latest
```

- **Port `8000`** serves the web UI.
- The **`/data` volume** holds the Deno KV SQLite database — `DENO_KV_PATH` is
  preset to `/data/kv.sqlite3`, so your sessions and schedule survive restarts.

On **Unraid**, add a container with repository `ghcr.io/v3rm0n/freesleep:latest`,
map a host port to container `8000`, and map a share to `/data`. (GHCR packages
are private by default — either make the package public, or add a registry login
with a token that has `read:packages`.)

Then open the web UI, sign in with your Eight Sleep account, and draw your
schedule — the control loop keeps running inside the container.

## Disclaimer

Not affiliated with, endorsed by, or supported by Eight Sleep. It uses the
private Eight Sleep API and may break at any time. Use at your own risk.
