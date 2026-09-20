import { getStore } from '@netlify/blobs';
import allowlist from '../lib/majority-allowlist.js';

const ALLOWED = new Map(allowlist.map(x => [x.id, new Set(x.options)]));
const STORE_NAME = 'between-majority-v1';
const MAX_RETRIES = 5;
const WINDOW_MS = 60_000;
const MAX_PER_IP = 30;
const hits = new Map();

function json(data, status=200){ return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json','cache-control':'no-store'}}); }
function okId(id){ return typeof id==='string' && ALLOWED.has(id); }
function ipAllowed(ip){ const now=Date.now(); const a=hits.get(ip)||[]; const fresh=a.filter(t=>now-t<WINDOW_MS); if(fresh.length>=MAX_PER_IP){hits.set(ip,fresh);return false;} fresh.push(now);hits.set(ip,fresh);return true; }

async function readCounts(store,id){ return (await store.get(`q:${id}`,{type:'json'})) || {counts:{},total:0}; }
async function vote(store,id,option){
  for(let attempt=0;attempt<MAX_RETRIES;attempt++){
    const key=`q:${id}`; const current=await store.getWithMetadata(key,{type:'json'});
    const data=current?.data || {counts:{},total:0}; const next={counts:{...data.counts},total:Number(data.total)||0};
    next.counts[option]=(Number(next.counts[option])||0)+1; next.total+=1;
    const result=current?.etag ? await store.set(key,next,{onlyIfMatch:current.etag}) : await store.set(key,next,{onlyIfNew:true});
    if(result.modified) return next;
  }
  throw new Error('concurrent write retry exhausted');
}

export default async (req, context) => {
  const url=new URL(req.url); const bodyId=req.method==='POST' ? null : url.searchParams.get('id'); const id=bodyId;
  if(!okId(id)) return json({error:'unknown question'},400);
  const store=getStore(STORE_NAME);
  if(req.method==='GET'){ const data=await readCounts(store,id); return json(data); }
  if(req.method==='POST'){
    const ip=context.ip || 'unknown'; if(!ipAllowed(ip)) return json({error:'rate limit'},429);
    let body; try{body=await req.json();}catch(e){return json({error:'invalid json'},400);}
    const postId=typeof body?.id==='string' ? body.id : '';
    if(!okId(postId)) return json({error:'unknown question'},400);
    const option=typeof body?.option==='string'?body.option.slice(0,160):''; const options=ALLOWED.get(postId);
    if(!options?.has(option)) return json({error:'invalid option'},400);
    try{ const data=await vote(store,postId,option); return json(data); }catch(e){ return json({error:'temporarily unavailable'},503); }
  }
  return json({error:'method not allowed'},405);
};
