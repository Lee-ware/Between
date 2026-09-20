// Private Question Lab. Packs are local by default and portable as JSON.
const Packs = (() => {
  const ALLOWED = new Set(['pick_one','scenario','knowledge','prediction','random']);
  function cleanItem(raw, i=0){
    if(!raw || typeof raw!=='object') return null; const mode=String(raw.mode||'pick_one'); if(!ALLOWED.has(mode)) return null;
    const prompt=String(raw.prompt||'').trim().slice(0,500); if(!prompt) return null;
    const options=Array.isArray(raw.options)?raw.options.map(x=>String(x).trim().slice(0,160)).filter(Boolean).slice(0,5):[];
    if((mode==='pick_one'||mode==='knowledge'||mode==='scenario') && options.length<2) return null;
    const item={id:String(raw.id||`custom_${Date.now()}_${i}`),mode,category:String(raw.category||'Custom').slice(0,60),prompt,options,difficulty:['easy','medium','hard'].includes(raw.difficulty)?raw.difficulty:'medium',mood:String(raw.mood||'playful').slice(0,30),evergreen:true,similarity_group:`custom:${mode}`};
    if(mode==='knowledge'){ if(!Number.isInteger(raw.answer_index)||raw.answer_index<0||raw.answer_index>=options.length) return null; item.answer_index=raw.answer_index; item.answer=options[item.answer_index]; }
    return item;
  }
  function cleanPack(raw){
    if(!raw||typeof raw!=='object') return null; const items=(Array.isArray(raw.items)?raw.items:[]).map(cleanItem).filter(Boolean).slice(0,50);
    if(!items.length) return null; return {id:String(raw.id||`pack_${Date.now().toString(36)}`),title:String(raw.title||'My Pack').trim().slice(0,80)||'My Pack',description:String(raw.description||'').trim().slice(0,240),items,createdAt:Number(raw.createdAt)||Date.now(),updatedAt:Date.now()};
  }
  function getAll(){return Storage.getPacks().slice().sort((a,b)=>b.updatedAt-a.updatedAt);}
  function save(pack){const p=cleanPack(pack);if(!p)throw new Error('Invalid pack');Storage.updatePacks(a=>{const i=a.findIndex(x=>x.id===p.id);if(i>=0)a[i]=p;else a.push(p);});return p;}
  function remove(id){Storage.updatePacks(a=>{const i=a.findIndex(x=>x.id===id);if(i>=0)a.splice(i,1);});}
  function encode(pack){const p=cleanPack(pack);if(!p)throw new Error('Invalid pack');const json=JSON.stringify(p);return btoa(unescape(encodeURIComponent(json))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decode(token){try{let s=token.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return cleanPack(JSON.parse(decodeURIComponent(escape(atob(s)))));}catch(e){return null;}}
  function link(pack){return `${location.origin}${location.pathname}?pack=${encodeURIComponent(encode(pack))}`;}
  function exportPack(pack){const blob=new Blob([JSON.stringify(pack,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(pack.title||'between-pack').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function importText(text){let p;try{p=JSON.parse(text);}catch(e){throw new Error('That pack is not valid JSON.');}return save(p);}
  return {ALLOWED,getAll,save,remove,encode,decode,link,exportPack,importText,cleanPack};
})();
