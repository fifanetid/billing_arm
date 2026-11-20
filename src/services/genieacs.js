const config=require('../config');
async function request(pathname){
 if(!config.genieacsUrl) throw new Error('GENIEACS_URL belum dikonfigurasi');
 const headers={Accept:'application/json'};
 if(config.genieacsUsername||config.genieacsPassword){
  headers.Authorization='Basic '+Buffer.from(config.genieacsUsername+':'+config.genieacsPassword).toString('base64');
 }
 const response=await fetch(config.genieacsUrl+pathname,{headers,signal:AbortSignal.timeout(10000)});
 if(!response.ok) throw new Error('GenieACS HTTP '+response.status);
 return response.json();
}
async function listDevices(limit=100){
 const projection=JSON.stringify({_id:1,_deviceId:1,_lastInform:1});
 const query=encodeURIComponent('{}');
 return request('/devices/?query='+query+'&projection='+encodeURIComponent(projection)+'&limit='+Math.max(1,Math.min(Number(limit)||100,200)));
}
async function getDevice(id){
 if(!/^[a-zA-Z0-9._:-]{1,200}$/.test(id)) throw new Error('Device ID tidak valid');
 return request('/devices/'+encodeURIComponent(id));
}
module.exports={listDevices,getDevice};
