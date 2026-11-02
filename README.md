# Edgebook

A private P&L journal for crypto, stocks and forex traders. Log trades by hand, get a clean
dashboard, and read back the patterns behind your results.

## What's inside

- **One ledger, three markets** — crypto, stocks and forex with long/short and open/closed states.
- **Real analytics** — net P&L, win rate, profit factor, expectancy, payoff, drawdown, streaks,
  hold times, weekday edge, strategy and symbol breakdowns, return distribution and custom insights.
- **A dashboard that answers questions** — equity curve, daily P&L, win/loss split, market mix,
  open positions and recent trades for 7D / 30D / 90D / YTD / All.
- **Accounts that persist** — email + password sign-up, bcrypt hashing, server-side httpOnly cookie
  sessions and SQLite storage. No exchange connections or API keys.
- **A demo worth exploring** — one click boots an account preloaded with 49 deterministic sample
  trades (46 closed, 3 open). Demo accounts are cleaned up after 48 hours.
- **Utilities** — editable trades, filters and sorting, CSV export, display currency, profile and
  account deletion.

## Stack

React 19 + TypeScript + Vite on the client. Express 5 + `node:sqlite` on the server. No external
database or ORM. Sessions are stored as SHA-256 token hashes; passwords use bcrypt. The UI is
hand-built CSS with [Lucide](https://lucide.dev) icons, Fontsource Instrument Sans / Space Grotesk,
and custom SVG charts — no chart or component library.

## Run it

Requires **Node.js 22.5+** (for the built-in `node:sqlite` module).

```bash
npm install
npm run dev
```

Open <http://localhost:4300>. Vite runs in middleware mode inside the Express server, so there is
one port and one process.

Click **Explore the demo account** on the sign-in screen, or create an account. New accounts start
with an empty ledger and can load the same sample set from the onboarding card or Settings.

### Scripts

| Script            | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Express + Vite dev server with HMR on port 4300   |
| `npm run typecheck` | TypeScript check without emitting                |
| `npm run build`   | Typecheck and build the client to `dist/`         |
| `npm start`       | Serve the production build from Express           |

### Configuration

| Variable         | Default              | Notes                                                        |
| ---------------- | -------------------- | ------------------------------------------------------------ |
| `PORT`           | `4300`               | HTTP port                                                    |
| `HOST`           | `0.0.0.0`            | Bind address                                                 |
| `DATABASE_PATH`  | `data/edgebook.db`   | SQLite file; parent directories are created automatically    |
| `COOKIE_SECURE`  | on in production     | Set to `false` only when testing production over plain HTTP  |

Production startup enables a strict Content-Security-Policy and serves hashed assets from `dist/`.
Put Edgebook behind TLS (or terminate TLS at a proxy) so secure session cookies work.

## Data model

Trades belong to a user and store symbol, market, side, status, entry/exit prices, quantity, fees,
entry/exit dates, strategy and notes. P&L is calculated as:

```
gross = (exit − entry) × quantity × (long ? 1 : −1)
net   = gross − fees
return % = net / (entry × quantity)
```

Open trades use the optional exit price as a manual mark price for unrealized P&L and are excluded
from realized stats, the equity curve and weekly/daily breakdowns.

The display currency is **display-only**. Existing values are not FX-converted; changing the
currency only changes the symbol used for journals whose trades are quoted in that currency.
This keeps the math honest for mixed-market books.

## Project layout

```
server/    Express API, auth/sessions, SQLite schema, validation, sample data
shared/    Types and constants used by both server and client
src/       React app, analytics, charts, pages and styles
data/      Runtime SQLite database (git-ignored)
dist/      Production client build (git-ignored)
```

`data/edgebook.db` is created on first run. Delete it to reset all accounts and trades.
