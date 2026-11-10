# Day1-3 Project Architecture

## Directory layout

```text
Day1-3/
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── budgets.js
│       ├── expense-dashboard.js
│       ├── savings-goal-chart.js
│       ├── sign-in.js
│       └── transactions.js
├── data/
│   └── expense-data.json
├── docs/
│   └── PROJECT-ARCHITECTURE.md
├── pages/
│   ├── index-tailwind.html
│   ├── expense-dashboard.html
│   ├── partials/
│   │   └── savings-goal.html
│   ├── transactions.html
│   ├── budgets.html
│   └── index.html
└── README.md
```

## Page responsibilities

- `pages/index-tailwind.html` is the sign-in/entry screen. Its logic is in `assets/js/sign-in.js`. After sign-in it loads `expense-dashboard.html` without a full-page navigation.
- `pages/expense-dashboard.html` is the main app shell. Overview, Transactions, Budgets, Reports, and About Us are sections in the shell. The Savings Goal section is loaded from `pages/partials/savings-goal.html` by `assets/js/expense-dashboard.js`.
- `assets/js/savings-goal-chart.js` renders monthly deposit totals as one SVG line per calendar year. Year lines use a stable color sequence (2026 blue, 2027 pink), with endpoint labels and a legend that shows each year's total deposits. The January-to-December axis is shared across years, each line covers the goal start month through the current month, and the y-axis uses compact, readable tick labels scaled to the largest plotted monthly deposit. The dashboard passes the goal start date and deposit records to it after each update.
- The Overview reporting-period filter defaults to `This year`; its summary cards and chart update from the selected period.
- `pages/transactions.html` and `pages/budgets.html` are standalone versions of those views. Their logic is in `assets/js/transactions.js` and `assets/js/budgets.js`; both fetch the shared JSON data.
- `pages/index.html` is the standalone portfolio page. Its header Sign in button links to `pages/index-tailwind.html`. The dashboard's About Us section is currently embedded in `expense-dashboard.html`.

## Shared data flow

`data/expense-data.json` is the seed source for transaction history, category definitions, category budget limits, the monthly budget, and account summary values. The dashboard and standalone views load it with `fetch` and render financial values from its contents.

```text
data/expense-data.json
       ├── pages/expense-dashboard.html
       ├── pages/transactions.html
       └── pages/budgets.html
```

The main dashboard also reads user-added expenses from `localStorage` under `ledger-user-transactions`, the adjusted balance under `ledger-account-balance`, the active goal under `ledger-savings-goal`, and cancel/reset history under `ledger-savings-goal-history`. Canceling or restarting refunds the complete saved amount to the available balance. History rollback restores the prior goal by moving that same amount back out of the balance, and is blocked if the balance is now too low. Goal transfers are simulated when the dashboard is open and checked again when it is reopened; browser code cannot run a scheduled transfer while the page is closed. These values are local to the browser. The browser can read the JSON file through a local web server, but a static page cannot write changes back to that file or perform a real bank transfer. Use a server/API and a payment provider for shared or real-money transactions.

On a first visit with no goal or goal history, the dashboard seeds an illustrative RTX 5090 plan: $4,200 target, $850 monthly minimum, and a varied monthly deposit record from April 2025 through the current month. As of November 2026, that timeline is 19 months (about 1.6 years). Sample deposits are generated to add up to the saved amount, and that amount is deducted from the demo balance when available. Older sample histories migrate to monthly records across the same range while preserving their saved total; the future scheduled transfer date is kept separate from completed deposit history. A one-time repair also backfills a short legacy goal history when its start is this month and it contains a future-dated deposit, preserving the existing saved total and setting the timeline to April 2025 through the current month. The Savings Goal view opens its create/edit form in a centered dialog and displays the saved plan full width. It estimates monthly surplus from positive income and negative expenses in the transaction history, calculates a completion date for the selected contribution, and calculates a required monthly contribution when a target date is supplied. Users can add extra deposits at any time; scheduled and extra deposits are recorded for the average deposit, recent activity, and yearly line graph. Deposits reduce the locally stored available balance and increase the goal's saved amount. Before a cancel or reset, a dialog lets the user choose to return the full saved amount and cancel the goal, or return it and restart the same goal at zero. Both actions create history entries with an undo action. Adding an expense that would leave less than the planned monthly contribution asks the user to confirm; expenses larger than the available balance are blocked. This is a browser demo, so scheduled transfers are simulated and are only processed while the dashboard is open or when it is reopened.

## JSON fields

- `transactions`: records with `name`, `category`, ISO `date`, signed `amount`, and abbreviated `month`.
- `categories`: category names and display colors used by the chart and expense form.
- `categoryBudgets`: budget category, limit, color, and optional `matches` list for grouping transaction categories.
- `monthlyBudget`: overall monthly spending limit.
- `accountSummary`: account balance and month-over-month change percentage.

## Common change locations

- Update seed financial records or limits in `data/expense-data.json`.
- Change the main dashboard layout or interactions in `pages/expense-dashboard.html`.
- Change the entry/sign-in screen in `pages/index-tailwind.html`.
- Change standalone transaction and budget views in their corresponding files under `pages/`.
- Change the savings goal markup in `pages/partials/savings-goal.html`; the dashboard shell lazy-loads it. Change projections, deposit storage, simulated transfer schedule, and expense warning in `assets/js/expense-dashboard.js`. Change the SVG line graph in `assets/js/savings-goal-chart.js`.
- Put shared styles in `assets/css/`. The existing `style.css` is an empty placeholder and is not currently linked by the pages; styling is primarily Tailwind utility classes in the HTML.
- Put page behavior in the matching `assets/js/` file and load it from its page with a relative `<script src>` path.

## Local development notes

- Start a local HTTP server at the repository root or above `Day1-3` so `fetch` can read the JSON file.
- Keep JSON fetch paths relative to `pages/`: `../data/expense-data.json`. The dashboard fetches the Savings Goal partial from `pages/partials/savings-goal.html`.
- Dashboard page links are siblings under `pages/`; the sign-in screen's `expense-dashboard.html` URL intentionally resolves within that directory.
- The dashboard and sign-in page loaders fetch and execute the target page's external JavaScript when switching pages without a full reload. Keep that script-loading behavior in sync if the navigation implementation changes.
