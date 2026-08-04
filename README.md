# KM Digital Labs Accountant

A private-by-design, browser-based bookkeeping workspace for small businesses. Record transactions, maintain double-entry journals, track payroll and generate core financial statements without a backend or subscription.

> Data stays in the current browser. Export regular JSON backups before clearing browser data or changing devices.

## Highlights

- Receipt, payment, transfer and manual journals
- Double-entry general ledger and chart of accounts
- Trial balance, profit and loss, and balance sheet reports
- Employee and contractor payment records
- PDF-ready receipts and financial statements
- JSON backup/restore and CSV transaction export
- Installable progressive web app with offline support
- No account, API key, database or build step required

## Quick start

```bash
git clone https://github.com/kegodev/kmdlabs-accountant.git
cd kmdlabs-accountant
python -m http.server 8000
```

Open `http://localhost:8000`, then use **Settings & Backup** to enter your business details.

## Important limitations

This application is intended for internal bookkeeping. Records do not sync automatically between devices. Financial statements and tax submissions should be reviewed by a qualified professional where required.

## Contributing

Bug reports, accessibility improvements, documentation corrections and focused feature proposals are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Project status

Current release: **3.1.0**. The version loader checks hosted installations for updates and refreshes cached assets when a newer release is available.

Developed by **KM Digital Labs**.
