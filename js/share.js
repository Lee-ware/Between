// Shareable result cards. Canvas is used so no image service or paid API is required.
const ShareCards = (() => {
  function wrap(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/); let line=''; const lines=[];
    for(const word of words){ const test=line?line+' '+word:word; if(ctx.measureText(test).width>maxWidth && line){lines.push(line);line=word;}else line=test; }
    if(line) lines.push(line); return lines;
  }
  function makeCard(title, lines, footer='BETWEEN') {
    const c=document.createElement('canvas'); c.width=1080; c.height=1350; const x=c.getContext('2d');
    x.fillStyle='#0b0b0d'; x.fillRect(0,0,c.width,c.height);
    const g=x.createLinearGradient(0,0,1080,1350); g.addColorStop(0,'rgba(62,219,255,.18)'); g.addColorStop(.55,'rgba(151,90,255,.08)'); g.addColorStop(1,'rgba(255,93,143,.13)'); x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
    x.strokeStyle='rgba(255,255,255,.09)';x.lineWidth=2;x.strokeRect(44,44,992,1262);
    x.fillStyle='#ffffff';x.font='900 42px system-ui';x.fillText('BETWEEN',76,112);
    x.fillStyle='#8d93a6';x.font='700 22px system-ui';x.fillText('TEST YOUR INSTINCTS.',78,148);
    x.fillStyle='#fff';x.font='900 68px system-ui'; let y=285; for(const l of wrap(x,title,880)){x.fillText(l,78,y);y+=82;}
    y+=45; x.fillStyle='#d9dbe4';x.font='700 38px system-ui'; for(const l of lines){ for(const w of wrap(x,l,880)){x.fillText(w,78,y);y+=52;} y+=24; }
    x.fillStyle='#71778b';x.font='600 20px system-ui';x.fillText(footer,78,1248);
    return new Promise(res=>c.toBlob(b=>res(b),'image/png',.94));
  }
  async function share(title, lines, text) {
    const blob=await makeCard(title,lines); const file=new File([blob],'between-result.png',{type:'image/png'});
    if(Capabilities.canShareFiles){ try { if(navigator.canShare({files:[file]})){ await navigator.share({title:'BETWEEN',text:text||title,files:[file]}); return 'shared'; } }catch(e){ if(e?.name==='AbortError') return 'cancelled'; } }
    if(Capabilities.canShare){ try { await navigator.share({title:'BETWEEN',text:text||title}); return 'shared'; }catch(e){ if(e?.name==='AbortError') return 'cancelled'; } }
    const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='between-result.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); return 'downloaded';
  }
  return { makeCard, share };
})();
