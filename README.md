# FF Billing

Modern ISP/RTRWNet billing foundation built with Node.js, Express, EJS and SQLite.

This is an independent implementation inspired by the publicly documented feature categories of [alijayanet/billing-rtrw](https://github.com/alijayanet/billing-rtrw). It does not copy customer data, credentials, private configuration, or third-party secrets.

## Initial scope
- Admin authentication (bcrypt + SQLite sessions)
- SQLite migrations: users, customers, packages, subscriptions, invoices, payments, audit logs
- Customer and package management
- Monthly invoice generation and partial/full manual payment recording
- Dashboard metrics
- GenieACS REST adapter (read-only)
- CSRF protection, Helmet, request rate limiting and input validation

## Setup
```bash
cp .env.example .env
npm install
npm run db:migrate
npm run seed:admin
npm start
```

Open http://localhost:3000. Choose a strong `ADMIN_PASSWORD` in `.env` (minimum 10 characters) and change it after first use.

## GenieACS
Set `GENIEACS_URL`, `GENIEACS_USERNAME`, and `GENIEACS_PASSWORD` in `.env`. Billing uses a separate SQLite database. GenieACS continues using its own database; this app does not write to GenieACS MongoDB.

## Not yet production-enabled
MikroTik provisioning/isolation, OLT/ONU operations, payment gateways, WhatsApp, customer/technician/agent portals, recurring cron billing and exports require dedicated implementation and integration tests. The initial GenieACS adapter is read-only.

## License
Project code is MIT. See [LICENSE](LICENSE). The referenced project retains its own ownership and license.
