import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual, randomUUID, scryptSync } from 'node:crypto';
const json = (data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const secret=()=>process.env.CRM_SESSION_SECRET;
const sign=v=>createHmac('sha256',secret()).update(v).digest('base64url');
const cookies=req=>Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const secureCookie=(value,maxAge=604800)=>`crm_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
function session(req){if(!secret()) return null; const token=cookies(req).crm_session||''; const [payload,signature]=token.split('.'); if(!payload||!signature)return null; const expected=sign(payload); if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null; try{const val=JSON.parse(Buffer.from(payload,'base64url').toString()); return val.exp>Date.now()&&['erin','mike'].includes(val.u)?val.u:null;}catch{return null;}}
const matches=(a,b)=>{const x=scryptSync(a,'erin-myers-crm-v1',64),y=scryptSync(b,'erin-myers-crm-v1',64);return timingSafeEqual(x,y)};
const template=(type)=>type==='Seller'?['Contract executed','Attorney review completed','Initial deposit confirmed','Inspections and negotiations complete','Appraisal / financing milestones confirmed','Municipal certificates / required documents','Final walkthrough coordinated','Closing completed']:['Contract executed','Attorney review completed','Initial deposit confirmed','Home inspection scheduled','Inspection contingency resolved','Mortgage commitment received','Title / insurance confirmed','Final walkthrough','Closing completed'];
const trim=(v,max=1000)=>String(v??'').trim().slice(0,max);
const validDate=(v)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';
function cleanContact(body,prev={}){
 const type=['Buyer','Seller','Buyer + Seller'].includes(body.type)?body.type:'Buyer';
 const stage=['New Lead','Active','Under Contract','Closed','Archived'].includes(body.stage)?body.stage:'New Lead';
 const prior=Array.isArray(prev.checklist)?prev.checklist:[];
 let checklist=stage==='Under Contract'||stage==='Closed'?(Array.isArray(body.checklist)?body.checklist.map(x=>({id:trim(x.id,100)||randomUUID(),text:trim(x.text,180),done:!!x.done})).filter(x=>x.text).slice(0,80):prior):prior;
 if(['Under Contract','Closed'].includes(stage)&&!checklist.length)checklist=template(type==='Seller'?'Seller':'Buyer').map(text=>({id:randomUUID(),text,done:false}));
 const notes=Array.isArray(body.notes)?body.notes.map(x=>({id:trim(x.id,100)||randomUUID(),text:trim(x.text,4000),author:trim(x.author,30),createdAt:trim(x.createdAt,40)})).filter(x=>x.text).slice(-150):prev.notes||[];
 const history=Array.isArray(body.history)?body.history.map(x=>({id:trim(x.id,100)||randomUUID(),text:trim(x.text,1000),author:trim(x.author,30),createdAt:trim(x.createdAt,40)})).filter(x=>x.text).slice(-100):prev.history||[];
 return {id:prev.id||randomUUID(),name:trim(body.name,150),phone:trim(body.phone,50),email:trim(body.email,180),type,stage,property:trim(body.property,250),source:trim(body.source,100),followUp:validDate(body.followUp),followUpNote:trim(body.followUpNote,700),contractDate:validDate(body.contractDate),closingDate:validDate(body.closingDate),notes,history,checklist,createdAt:prev.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export default async function handler(req){
 try{
 const url=new URL(req.url);const path=url.pathname.replace(/^\/(?:\.netlify\/functions\/api|api)/,'').replace(/^\//,'');
 if(!secret())return json({error:'CRM_SESSION_SECRET is not configured in Netlify environment variables.'},503);
 if(path==='login'&&req.method==='POST'){
  const b=await req.json();const u=trim(b.username,30).toLowerCase();const pass=String(b.password||'');const expected=u==='erin'?(process.env.CRM_ERIN_PASSWORD||'myers'):u==='mike'?(process.env.CRM_MIKE_PASSWORD||'bedko'):randomUUID();
  if(!['erin','mike'].includes(u)||!matches(pass,expected))return json({error:'Incorrect username or password.'},401);
  const val=Buffer.from(JSON.stringify({u,exp:Date.now()+7*864e5})).toString('base64url');return json({user:u},200,{'set-cookie':secureCookie(`${val}.${sign(val)}`)});
 }
 if(path==='logout'&&req.method==='POST')return json({ok:true},200,{'set-cookie':secureCookie('',0)});
 const user=session(req);if(!user)return json({error:'Not signed in.'},401);
 if(path==='me'&&req.method==='GET')return json({user});
 const store=getStore('erin-myers-crm-contacts');
 if(path==='contacts'&&req.method==='GET'){
  const contacts=[];let cursor;
  do{const result=await store.list({prefix:'contact/',...(cursor?{cursor}:{})});const values=await Promise.all(result.blobs.map(b=>store.get(b.key,{type:'json',consistency:'strong'})));contacts.push(...values.filter(Boolean));cursor=result.cursor;}while(cursor);
  return json({contacts:contacts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))});
 }
 if(path==='contacts'&&req.method==='POST'){
  const body=await req.json();const entry=cleanContact(body);if(!entry.name)return json({error:'Name is required.'},400);await store.setJSON(`contact/${entry.id}`,entry);return json({contact:entry},201);
 }
 const found=path.match(/^contacts\/([a-zA-Z0-9-]{1,80})$/);
 if(found){const key=`contact/${found[1]}`;const existing=await store.get(key,{type:'json',consistency:'strong'});if(!existing)return json({error:'Contact not found.'},404);
  if(req.method==='DELETE'){await store.delete(key);return json({ok:true});}
  if(req.method==='PUT'){const body=await req.json();const entry=cleanContact(body,existing);if(!entry.name)return json({error:'Name is required.'},400);await store.setJSON(key,entry);return json({contact:entry});}
 }
 return json({error:'Not found.'},404);
 }catch(e){console.error('CRM API error',e);return json({error:'Server error. Please try again.'},500);}
}
