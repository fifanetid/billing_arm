const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const Database=require('better-sqlite3');

test('SQLite migration creates billing, expenses and audit schema with constraints',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ff-billing-test-'));
 const dbPath=path.join(dir,'test.sqlite');
 const env={...process.env,NODE_ENV:'test',DATABASE_PATH:dbPath};
 const migration=spawnSync(process.execPath,['src/db/migrate.js'],{cwd:process.cwd(),env,encoding:'utf8'});
 assert.equal(migration.status,0,migration.stderr||migration.stdout);
 const db=new Database(dbPath);
 try{
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
  for(const table of ['users','customers','packages','subscriptions','invoices','payments','expenses','audit_logs','schema_migrations']) assert.ok(tables.includes(table),table+' table exists');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM schema_migrations').get().n,2);
  assert.throws(()=>db.prepare("INSERT INTO expenses(expense_date,category,description,amount) VALUES('2026-01-01','Test','Invalid',0)").run());
  assert.throws(()=>db.prepare("INSERT INTO invoices(invoice_number,customer_id,period_year,period_month,amount,due_date) VALUES('X',999,2026,1,100,'2026-01-10')").run());
 }finally{
  db.close();
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
