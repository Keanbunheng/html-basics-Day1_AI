# Day1-3 Ledger Demo

## Run locally

Serve the repository with a local web server, then open `Day1-3/pages/index-tailwind.html`. The dashboard fetches JSON, which browsers block when an HTML file is opened directly with `file://`.

## Project map

```text
Day1-3/
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── budgets.js
│       ├── expense-dashboard.js
│       ├── sign-in.js
│       └── transactions.js
├── data/
│   └── expense-data.json
├── docs/
│   └── PROJECT-ARCHITECTURE.md
└── pages/
    ├── index-tailwind.html
    ├── expense-dashboard.html
    ├── transactions.html
    ├── budgets.html
    └── index.html
```

See [the architecture guide](docs/PROJECT-ARCHITECTURE.md) for page roles, data flow, and where to make changes.

The dashboard lazy-loads its Savings Goal view from `pages/partials/savings-goal.html`. A first visit seeds an illustrative RTX 5090 goal ($4,200 target, at least $850 monthly, and one varied deposit record per month from April 2025 through the current month). As of November 2026, the sample timeline is 19 months (about 1.6 years). Its January-to-December chart draws one colored monthly-deposit line per year, includes a year legend with annual totals, runs from the goal start month through the current month, and scales its compact y-axis to the plotted deposits. Sample monthly amounts vary by month and year while preserving the saved total. Existing sample goals migrate to monthly records across the same timeline while preserving the saved total. Short legacy histories with a future-dated deposit are also repaired once, keeping future transfers out of completed history. The view also includes centered setup and cancel-confirmation dialogs, optional deadline planning, deposit statistics, and persistent goal history with balance-aware undo. The browser demo stores these changes locally; it does not connect to a bank or run scheduled transfers while closed.
