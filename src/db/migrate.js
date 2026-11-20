const db=require('./index');
db.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin','operator','finance','technician')),
 is_active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS packages(
 id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,description TEXT NOT NULL DEFAULT '',
 price INTEGER NOT NULL CHECK(price>=0),speed_down INTEGER NOT NULL DEFAULT 0,speed_up INTEGER NOT NULL DEFAULT 0,
 promo_price INTEGER CHECK(promo_price IS NULL OR promo_price>=0),promo_cycles INTEGER NOT NULL DEFAULT 0 CHECK(promo_cycles>=0),
 prorate_first_invoice INTEGER NOT NULL DEFAULT 0,is_active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers(
 id INTEGER PRIMARY KEY AUTOINCREMENT,customer_code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,phone TEXT NOT NULL,
 email TEXT,address TEXT NOT NULL DEFAULT '',latitude REAL,longitude REAL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','inactive')),
 install_date TEXT,pppoe_username TEXT UNIQUE,genieacs_device_id TEXT,genieacs_tag TEXT,notes TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS subscriptions(
 id INTEGER PRIMARY KEY AUTOINCREMENT,customer_id INTEGER NOT NULL REFERENCES customers(id),
 package_id INTEGER NOT NULL REFERENCES packages(id),start_date TEXT NOT NULL,end_date TEXT,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','ended')),
 promo_cycles_used INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoices(
 id INTEGER PRIMARY KEY AUTOINCREMENT,invoice_number TEXT NOT NULL UNIQUE,customer_id INTEGER NOT NULL REFERENCES customers(id),
 subscription_id INTEGER REFERENCES subscriptions(id),period_year INTEGER NOT NULL,
 period_month INTEGER NOT NULL CHECK(period_month BETWEEN 1 AND 12),
 amount INTEGER NOT NULL CHECK(amount>=0),amount_paid INTEGER NOT NULL DEFAULT 0 CHECK(amount_paid>=0),
 status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','partial','paid','overdue','cancelled')),
 due_date TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(customer_id,period_year,period_month),CHECK(amount_paid<=amount)
);
CREATE TABLE IF NOT EXISTS payments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,invoice_id INTEGER NOT NULL REFERENCES invoices(id),
 amount INTEGER NOT NULL CHECK(amount>0),method TEXT NOT NULL DEFAULT 'cash',reference TEXT UNIQUE,
 notes TEXT NOT NULL DEFAULT '',recorded_by INTEGER REFERENCES users(id),
 paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER REFERENCES users(id),action TEXT NOT NULL,
 entity TEXT NOT NULL,entity_id INTEGER,details TEXT,ip_address TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status,due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_year,period_month);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);
`);
console.log('SQLite migrations completed.');
db.close();
