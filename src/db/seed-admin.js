const bcrypt=require('bcryptjs');
const db=require('./index');
const config=require('../config');
if(!config.adminPassword||config.adminPassword.length<10){
 console.error('Set ADMIN_PASSWORD in .env to at least 10 characters.');
 process.exit(1);
}
const hash=bcrypt.hashSync(config.adminPassword,12);
db.prepare(`INSERT INTO users(username,password_hash,role) VALUES(?,?,'admin')
 ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash,updated_at=CURRENT_TIMESTAMP`)
 .run(config.adminUsername,hash);
console.log('Admin account is ready:',config.adminUsername);
db.close();
