const express=require('express');
const session=require('express-session');
const SQLiteStore=require('connect-sqlite3')(session);
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const csrf=require('csurf');
const bcrypt=require('bcryptjs');
const {z}=require('zod');
const path=require('node:path');
const config=require('./config');
const db=require('./db');
const genieacs=require('./services/genieacs');

const app=express();
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.urlencoded({extended:false,limit:'100kb'}));
app.use(express.static(path.join(__dirname,'public')));
app.use(rateLimit({windowMs:15*60*1000,limit:300,standardHeaders:true,legacyHeaders:false}));
app.use(session({
 store:new SQLiteStore({db:'sessions.sqlite',dir:path.dirname(config.databasePath)}),
 secret:config.sessionSecret||'development-only-change-this-secret',
 resave:false,saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:'lax',secure:config.env==='production',maxAge:8*60*60*1000}
}));
app.use(csrf());
app.use((req,res,next)=>{
 res.locals.csrfToken=req.csrfToken();
 res.locals.currentUser=req.session.user||null;
 next();
});
function audit(req,action,entity,id=null,details=null){
 db.prepare('INSERT INTO audit_logs(user_id,action,entity,entity_id,details,ip_address) VALUES(?,?,?,?,?,?)')
 .run(req.session.user?.id||null,action,entity,id,details?JSON.stringify(details):null,req.ip);
}
function auth(req,res,next){
 if(!req.session.user) return res.redirect('/login');
 next();
}
function render(res,page,title,data={}){
 res.render('page',{page,title,...data});
}
const customerSchema=z.object({
 customer_code:z.string().trim().min(2).max(40),name:z.string().trim().min(2).max(120),
 phone:z.string().trim().min(6).max(30),email:z.string().trim().email().optional().or(z.literal('')),
 address:z.string().trim().max(500).optional(),status:z.enum(['active','suspended','inactive']).default('active'),
 pppoe_username:z.string().trim().max(100).optional().or(z.literal('')),
 genieacs_device_id:z.string().trim().max(200).optional().or(z.literal(''))
});
const packageSchema=z.object({
 name:z.string().trim().min(2).max(80),description:z.string().trim().max(500).optional(),
 price:z.coerce.number().int().min(0),speed_down:z.coerce.number().int().min(0),
 speed_up:z.coerce.number().int().min(0),promo_price:z.union([z.literal(''),z.coerce.number().int().min(0)]).optional(),
 promo_cycles:z.coerce.number().int().min(0).default(0)
});
const subscriptionSchema=z.object({
 customer_id:z.coerce.number().int().positive(),package_id:z.coerce.number().int().positive(),
 start_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

app.get('/health',(req,res)=>res.json({ok:true,service:'ff-billing'}));
app.get('/login',(req,res)=>render(res,'login','Login',{error:null}));
app.post('/login',(req,res)=>{
 const username=String(req.body.username||'').trim();
 const password=String(req.body.password||'');
 const user=db.prepare('SELECT id,username,password_hash,role,is_active FROM users WHERE username=?').get(username);
 if(!user||!user.is_active||!bcrypt.compareSync(password,user.password_hash)){
  audit(req,'login_failed','users',null,{username});
  return res.status(401).render('page',{page:'login',title:'Login',error:'Username atau password salah.'});
 }
 req.session.regenerate(err=>{
  if(err) return res.status(500).send('Gagal membuat sesi.');
  req.session.user={id:user.id,username:user.username,role:user.role};
  audit(req,'login','users',user.id);
  res.redirect('/');
 });
});
app.post('/logout',auth,(req,res)=>req.session.destroy(()=>res.redirect('/login')));

app.get('/',auth,(req,res)=>{
 const metrics={
  customers:db.prepare("SELECT COUNT(*) n FROM customers WHERE status='active'").get().n,
  unpaid:db.prepare("SELECT COUNT(*) n FROM invoices WHERE status IN ('unpaid','partial','overdue')").get().n,
  due:db.prepare("SELECT COALESCE(SUM(amount-amount_paid),0) n FROM invoices WHERE status IN ('unpaid','partial','overdue')").get().n,
  collected:db.prepare("SELECT COALESCE(SUM(amount),0) n FROM payments WHERE substr(paid_at,1,7)=strftime('%Y-%m','now','localtime')").get().n
 };
 render(res,'dashboard','Dashboard',{metrics});
});

// Customers
app.get('/customers',auth,(req,res)=>{
 const customers=db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
 render(res,'customers','Pelanggan',{customers});
});
app.get('/customers/new',auth,(req,res)=>render(res,'customer-form','Tambah pelanggan',{customer:{},error:null}));
app.post('/customers',auth,(req,res)=>{
 const p=customerSchema.safeParse(req.body);
 if(!p.success) return res.status(400).render('page',{page:'customer-form',title:'Tambah pelanggan',customer:req.body,error:p.error.issues[0].message});
 const d=p.data;
 try{
  const r=db.prepare('INSERT INTO customers(customer_code,name,phone,email,address,status,pppoe_username,genieacs_device_id) VALUES(@customer_code,@name,@phone,@email,@address,@status,@pppoe_username,@genieacs_device_id)')
   .run({...d,email:d.email||null,address:d.address||'',pppoe_username:d.pppoe_username||null,genieacs_device_id:d.genieacs_device_id||null});
  audit(req,'customer_created','customers',Number(r.lastInsertRowid));
  res.redirect('/customers');
 }catch(e){
  res.status(400).render('page',{page:'customer-form',title:'Tambah pelanggan',customer:req.body,error:e.code==='SQLITE_CONSTRAINT_UNIQUE'?'Kode pelanggan atau PPPoE sudah digunakan.':'Gagal menyimpan pelanggan.'});
 }
});
app.get('/customers/:id/edit',auth,(req,res)=>{
 const customer=db.prepare('SELECT * FROM customers WHERE id=?').get(Number(req.params.id));
 if(!customer) return res.sendStatus(404);
 render(res,'customer-form','Edit pelanggan',{customer,error:null});
});
app.post('/customers/:id/update',auth,(req,res)=>{
 const p=customerSchema.safeParse(req.body);
 if(!p.success) return res.status(400).render('page',{page:'customer-form',title:'Edit pelanggan',customer:{...req.body,id:req.params.id},error:p.error.issues[0].message});
 const d=p.data;
 try{
  db.prepare('UPDATE customers SET customer_code=@customer_code,name=@name,phone=@phone,email=@email,address=@address,status=@status,pppoe_username=@pppoe_username,genieacs_device_id=@genieacs_device_id,updated_at=CURRENT_TIMESTAMP WHERE id=@id')
   .run({...d,id:Number(req.params.id),email:d.email||null,address:d.address||'',pppoe_username:d.pppoe_username||null,genieacs_device_id:d.genieacs_device_id||null});
  audit(req,'customer_updated','customers',Number(req.params.id));
  res.redirect('/customers');
 }catch{
  res.status(400).render('page',{page:'customer-form',title:'Edit pelanggan',customer:{...req.body,id:req.params.id},error:'Gagal memperbarui pelanggan. Periksa kode dan PPPoE.'});
 }
});

// Packages
app.get('/packages',auth,(req,res)=>{
 const packages=db.prepare('SELECT * FROM packages ORDER BY name').all();
 render(res,'packages','Paket internet',{packages});
});
app.post('/packages',auth,(req,res)=>{
 const p=packageSchema.safeParse(req.body);
 if(!p.success) return res.status(400).send(p.error.issues[0].message);
 const d=p.data;
 try{
  const r=db.prepare('INSERT INTO packages(name,description,price,speed_down,speed_up,promo_price,promo_cycles) VALUES(?,?,?,?,?,?,?)')
   .run(d.name,d.description||'',d.price,d.speed_down,d.speed_up,d.promo_price===''?null:d.promo_price,d.promo_cycles);
  audit(req,'package_created','packages',Number(r.lastInsertRowid));
  res.redirect('/packages');
 }catch{res.status(400).send('Nama paket sudah digunakan atau data tidak valid.');}
});
app.post('/packages/:id/archive',auth,(req,res)=>{
 db.prepare('UPDATE packages SET is_active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(Number(req.params.id));
 audit(req,'package_archived','packages',Number(req.params.id));
 res.redirect('/packages');
});

// Subscriptions
app.get('/subscriptions',auth,(req,res)=>{
 const subscriptions=db.prepare('SELECT s.*,c.name customer_name,c.customer_code,p.name package_name,p.price,p.speed_down,p.speed_up FROM subscriptions s JOIN customers c ON c.id=s.customer_id JOIN packages p ON p.id=s.package_id ORDER BY s.id DESC').all();
 render(res,'subscriptions','Langganan',{subscriptions});
});
app.get('/subscriptions/new',auth,(req,res)=>{
 render(res,'subscription-form','Buat langganan',{
  customers:db.prepare("SELECT id,customer_code,name FROM customers WHERE status='active' ORDER BY name").all(),
  packages:db.prepare('SELECT id,name,price,speed_down,speed_up FROM packages WHERE is_active=1 ORDER BY name').all()
 });
});
app.post('/subscriptions',auth,(req,res)=>{
 const p=subscriptionSchema.safeParse(req.body);
 if(!p.success) return res.status(400).send(p.error.issues[0].message);
 const d=p.data;
 const customer=db.prepare("SELECT id FROM customers WHERE id=? AND status='active'").get(d.customer_id);
 const pack=db.prepare('SELECT id FROM packages WHERE id=? AND is_active=1').get(d.package_id);
 if(!customer||!pack) return res.status(400).send('Pelanggan atau paket tidak tersedia.');
 const r=db.prepare('INSERT INTO subscriptions(customer_id,package_id,start_date) VALUES(?,?,?)').run(d.customer_id,d.package_id,d.start_date);
 audit(req,'subscription_created','subscriptions',Number(r.lastInsertRowid));
 res.redirect('/subscriptions');
});
app.post('/subscriptions/:id/end',auth,(req,res)=>{
 db.prepare("UPDATE subscriptions SET status='ended',end_date=date('now','localtime') WHERE id=? AND status='active'").run(Number(req.params.id));
 audit(req,'subscription_ended','subscriptions',Number(req.params.id));
 res.redirect('/subscriptions');
});

// Invoices & payments
app.get('/invoices',auth,(req,res)=>{
 const invoices=db.prepare('SELECT i.*,c.name customer_name,c.customer_code FROM invoices i JOIN customers c ON c.id=i.customer_id ORDER BY i.id DESC').all();
 render(res,'invoices','Tagihan',{invoices});
});
app.post('/invoices/generate',auth,(req,res)=>{
 const year=Number(req.body.year),month=Number(req.body.month),due=String(req.body.due_date||'');
 if(!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(month)||month<1||month>12||!/^\d{4}-\d{2}-\d{2}$/.test(due)) return res.status(400).send('Periode atau jatuh tempo tidak valid.');
 const periodStart=year+'-'+String(month).padStart(2,'0')+'-01';
 const periodEnd=year+'-'+String(month).padStart(2,'0')+'-31';
 const rows=db.prepare("SELECT c.id customer_id,s.id subscription_id,p.price,p.promo_price,p.promo_cycles,s.promo_cycles_used FROM subscriptions s JOIN customers c ON c.id=s.customer_id JOIN packages p ON p.id=s.package_id WHERE s.status='active' AND c.status='active' AND p.is_active=1 AND s.start_date<=? AND NOT EXISTS(SELECT 1 FROM invoices i WHERE i.customer_id=c.id AND i.period_year=? AND i.period_month=?)").all(periodEnd,year,month);
 const insert=db.prepare('INSERT INTO invoices(invoice_number,customer_id,subscription_id,period_year,period_month,amount,due_date,notes) VALUES(?,?,?,?,?,?,?,?)');
 const create=db.transaction(items=>items.forEach(r=>{
  const promo=r.promo_price!==null&&r.promo_cycles_used<r.promo_cycles;
  const amount=promo?r.promo_price:r.price;
  const number='FF-'+year+String(month).padStart(2,'0')+'-'+String(r.customer_id).padStart(5,'0');
  insert.run(number,r.customer_id,r.subscription_id,year,month,amount,due,promo?'Harga promo':'');
  if(promo) db.prepare('UPDATE subscriptions SET promo_cycles_used=promo_cycles_used+1 WHERE id=?').run(r.subscription_id);
 }));
 try{create(rows);}catch(e){return res.status(400).send('Generate invoice gagal: '+e.message);}
 audit(req,'invoices_generated','invoices',null,{year,month,count:rows.length});
 res.redirect('/invoices');
});
app.post('/invoices/:id/payments',auth,(req,res)=>{
 const amount=Number(req.body.amount),method=String(req.body.method||'cash');
 if(!Number.isSafeInteger(amount)||amount<=0||!['cash','transfer','qris','other'].includes(method)) return res.status(400).send('Pembayaran tidak valid.');
 try{
  db.transaction(()=>{
   const invoice=db.prepare('SELECT * FROM invoices WHERE id=?').get(Number(req.params.id));
   if(!invoice||invoice.status==='cancelled') throw new Error('Tagihan tidak ditemukan atau dibatalkan.');
   if(amount>invoice.amount-invoice.amount_paid) throw new Error('Nominal melebihi sisa tagihan.');
   db.prepare('INSERT INTO payments(invoice_id,amount,method,recorded_by) VALUES(?,?,?,?)').run(invoice.id,amount,method,req.session.user.id);
   const paid=invoice.amount_paid+amount;
   db.prepare('UPDATE invoices SET amount_paid=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(paid,paid===invoice.amount?'paid':'partial',invoice.id);
  })();
 }catch(e){return res.status(400).send(e.message);}
 audit(req,'payment_recorded','invoices',Number(req.params.id),{amount,method});
 res.redirect('/invoices');
});

// GenieACS (read-only)
app.get('/genieacs',auth,async(req,res)=>{
 try{
  const payload=await genieacs.listDevices(100);
  const devices=Array.isArray(payload)?payload:(payload.devices||[]);
  render(res,'genieacs','GenieACS',{devices,error:null});
 }catch(e){res.status(502).render('page',{page:'genieacs',title:'GenieACS',devices:[],error:e.message});}
});

app.use((err,req,res,next)=>{
 if(err.code==='EBADCSRFTOKEN') return res.status(403).send('CSRF token tidak valid. Muat ulang halaman.');
 console.error(err);
 res.status(500).render('page',{page:'error',title:'Error',message:'Terjadi kesalahan pada server.'});
});
app.listen(config.port,()=>console.log('FF Billing berjalan di http://127.0.0.1:'+config.port));
