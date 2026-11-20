# Feature matrix — FF Billing

Status implementation as of the initial repository bootstrap.

## Available in this repository
| Area | Implemented |
|---|---|
| Admin access | Login, bcrypt password hash, SQLite session store, logout |
| Application security | CSRF, Helmet, request rate limit, Zod validation |
| Customer | Create, list, update, status, PPPoE username, GenieACS device ID |
| Packages | Create, list, price, speed, promo cycle, archive |
| Subscription | Assign customer to package, start date, end subscription |
| Billing | Monthly invoice generation, duplicate-period constraint, promo cycle |
| Payments | Manual cash/transfer/QRIS/other, partial and full payment |
| Dashboard | Active customers, open invoices, outstanding amount, current-month collection |
| GenieACS | NBI device list query, read-only |
| Audit | Login attempts and main customer/package/subscription/invoice/payment events |

## Planned modules based on the reference feature catalogue
| Module | Scope to implement |
|---|---|
| Customer portal | Self-service login, billing history, device status, support requests |
| Finance | Cash in/out, expense categories, financial reports |
| MikroTik | Multiple routers, RouterOS API connectivity, PPPoE and Hotspot management, session/traffic monitoring |
| Isolation | Manual and scheduled suspend/restore with auditable safeguards |
| GenieACS advanced | Device detail, parameter tree, tags, task queue, Wi-Fi config and reboot |
| OLT/ONU | OLT inventory, ONU mapping, signal and provisioning workflows |
| GIS | ODP locations, customer coordinates, fiber/network map |
| Messaging | WhatsApp/Telegram notifications and templates |
| Payments | Static QRIS reconciliation, gateway adapters, signed webhook verification |
| Agent and collector | Separate roles, balances, payment submission and approval |
| Technician | Tickets, assignment, field work and attendance |
| Voucher | Batch creation, stock, sales and redemption |
| Inventory | Network equipment and warehouse movement |
| Operations | Scheduled billing, reminder jobs, backup/restore, exports and monitoring |
| Administration | RBAC, settings, audit history and retention policy |

## Important limitations
The initial version is a working foundation, not a full parity clone of the reference application. Hardware-changing operations and automated customer isolation are deliberately not wired up. Promo pricing is basic; prorata, tax, FUP, night-mode bandwidth, and payment gateway callbacks are not implemented. Review and test every integration before production use.
