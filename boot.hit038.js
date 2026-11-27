(() => {
  'use strict';
  const status=document.getElementById('updateStatus'), auto=document.getElementById('autoUpdate'), apply=document.getElementById('applyUpdate'), check=document.getElementById('checkUpdate');
  let current=null, pending=null, busy=false, idleSince=0, lastInput=Date.now();
  const storage={get(k){try{return sessionStorage.getItem(k)}catch{return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch{}}};
  auto.checked=storage.get('labAutoUpdate')!=='off';
  auto.onchange=()=>storage.set('labAutoUpdate',auto.checked?'on':'off');
  for(const event of ['keydown','pointerdown','input']) window.addEventListener(event,()=>{lastInput=Date.now();idleSince=0},true);
  const fresh=async()=>{const response=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return response.json()};
  const getJSON=async path=>{const r=await fetch(path);if(!r.ok)throw Error('HTTP '+r.status+' '+path);return r.json()};
  // Split an uploaded 4x2 sheet. Remove only near-white pixels connected to cell edges.
  async function loadSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const result=[],scale=224/(im.naturalHeight/2*461/543);
    for(let i=0;i<8;i++){
      const c=i%4,r=Math.floor(i/4),x0=Math.round(c*im.naturalWidth/4),y0=Math.round(r*im.naturalHeight/2),w=Math.round((c+1)*im.naturalWidth/4)-x0,h=Math.round((r+1)*im.naturalHeight/2)-y0;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);const pix=g.getImageData(0,0,w,h),p=pix.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
      function add(n){if(seen[n])return;seen[n]=1;const j=n*4;if(p[j+3]===0||Math.min(p[j],p[j+1],p[j+2])>=225&&Math.max(p[j],p[j+1],p[j+2])-Math.min(p[j],p[j+1],p[j+2])<=25){queue[tail++]=n;p[j+3]=0;}}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
      while(head<tail){const n=queue[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w)}
      let bottom=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4;if(p[j+3]&&Math.min(p[j],p[j+1],p[j+2])<180)bottom=y+1;}
      if(!bottom)throw Error('Fotograma vacío: '+i);g.putImageData(pix,0,0);
      const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;
      ctx.drawImage(cell,Math.round(160-w*scale*0.49),Math.round(258-bottom*scale),Math.round(w*scale),Math.round(h*scale));result.push(frame.toDataURL('image/png'));
    }return result;
  }
  function reload(){if(!pending)return;const url=new URL(location.href);url.searchParams.set('v',pending.version);url.searchParams.set('t',Date.now());location.replace(url.href)}
  apply.onclick=reload;
  async function poll(){if(!current||busy)return;busy=true;try{const m=await fresh();if(m.version!==current.version){pending=m;apply.hidden=false;status.textContent='Nueva versión '+m.version+' disponible · se reiniciará el combate al actualizar.'}else{pending=null;apply.hidden=true;status.textContent='Versión '+current.version+' · al día';}}catch{status.textContent='Sin conexión con el servidor · puedes seguir jugando.'}finally{busy=false}}
  check.onclick=poll;
  async function start(){try{current=await fresh();status.textContent='Cargando '+current.version+'…';window.labSpriteData=Object.fromEntries(await Promise.all(Object.entries(current.animations).map(async ([name,path])=>[name,await getJSON(path)])));for(const [name,path] of Object.entries(current.spriteSheets||{}))window.labSpriteData[name]=await loadSheet(path);for(const [name,path] of Object.entries(current.optionalAnimations||{})){try{const arr=await getJSON(path+'?v='+encodeURIComponent(current.version));if(!Array.isArray(arr)||arr.length!==4||!arr.every(x=>typeof x==='string'&&x.startsWith('data:image/png;base64,')))throw Error('Formato de fotogramas inválido');window.labSpriteData[name]=arr;}catch(e){const option=document.querySelector('#motion option[value="'+name+'"]');if(option)option.remove();document.getElementById('hit01Status').textContent='HIT01 pendiente: falta subir '+path+'; el resto del laboratorio sigue funcionando.';console.warn(e);}}if(window.labSpriteData.hitLight)document.getElementById('hit01Status').textContent='HIT01 disponible: acércate al rival y pulsa T sin bloquear, o elige HIT01 en el inspector.';const script=document.createElement('script');script.src=current.engine;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.body.appendChild(script)});status.textContent='Versión '+current.version+' · al día';setInterval(poll,15000);window.addEventListener('focus',poll);setInterval(()=>{if(!pending||!auto.checked||document.hidden||!window.labCanReload?.()||Date.now()-lastInput<2500){idleSince=0;return}if(!idleSince)idleSince=Date.now();if(Date.now()-idleSince>=1500)reload()},300)}catch(e){status.textContent='No se pudo cargar el laboratorio: '+e.message;document.getElementById('state').textContent='Error de carga';console.error(e)}}
  start();
})();
