require('dotenv').config();
const path=require('node:path');
const config={
  env:process.env.NODE_ENV||'development',
  port:Number(process.env.PORT||3000),
  sessionSecret:process.env.SESSION_SECRET||'',
  databasePath:path.resolve(process.env.DATABASE_PATH||'./data/billing.sqlite'),
  adminUsername:process.env.ADMIN_USERNAME||'admin',
  adminPassword:process.env.ADMIN_PASSWORD||'',
  genieacsUrl:(process.env.GENIEACS_URL||'').replace(/\/$/,''),
  genieacsUsername:process.env.GENIEACS_USERNAME||'',
  genieacsPassword:process.env.GENIEACS_PASSWORD||''
};
if(config.env==='production'){
  if(config.sessionSecret.length<32) throw new Error('SESSION_SECRET must be at least 32 characters');
  if(!config.adminPassword) throw new Error('Set ADMIN_PASSWORD before production startup');
}
module.exports=config;
