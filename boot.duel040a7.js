(() => {
  'use strict';
  const status=document.getElementById('updateStatus'), auto=document.getElementById('autoUpdate'), apply=document.getElementById('applyUpdate'), check=document.getElementById('checkUpdate');
  let current=null, pending=null, busy=false, idleSince=0, lastInput=Date.now();
  const storage={get(k){try{return sessionStorage.getItem(k)}catch{return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch{}}};
  auto.checked=storage.get('labAutoUpdate')!=='off';
  auto.onchange=()=>storage.set('labAutoUpdate',auto.checked?'on':'off');
  for(const event of ['keydown','pointerdown','input']) window.addEventListener(event,()=>{lastInput=Date.now();idleSince=0},true);
  const fresh=async()=>({"version":"0.4.0-alpha.7","engine":"engine.duel040a7.js","animations":{"idle":"sprites/idle.34db3624e479.json","forward":"sprites/forward.967502464975.json","back":"sprites/back.c3d2c303b606.json","block":"sprites/block.449f472b0332.json","run":"sprites/run.4ed521426bd4.json","dash":"sprites/dash.a260933b7190.json","crouch":"sprites/crouch.444aa5912e2c.json","jump":"sprites/jump.a3b4c0a2fc04.json","jab":"sprites/jab.e36456d0f525.json","kick":"sprites/kick.8ebb10731ae8.json","punch":"sprites/punch.dcb07b4b2e48.json","heavykick":"sprites/heavykick.61fae3baf841.json","punchOriginal":"sprites/punchOriginal.faad3a0b82c9.json","jabOriginal":"sprites/jabOriginal.5e2b37493e1b.json","kickOriginal":"sprites/kickOriginal.424c5aa41ab9.json","heavykickOriginal":"sprites/heavykickOriginal.f8610d684e09.json","runOriginal":"sprites/runOriginal.05a07a69905b.json","dashOriginal":"sprites/dashOriginal.5c0cf64964d9.json","crouchOriginal":"sprites/crouchOriginal.56c363d37b4d.json","lowjab":"sprites/lowjab.b441a80e4ae8.json","uppercut":"sprites/uppercut.85aac24be6a7.json","lowkick":"sprites/lowkick.bafc10effc47.json","sweep":"sprites/sweep.0de944e04dd9.json","backOriginal":"sprites/backOriginal.4e8ace8fb0cc.json","jabBeforeAnchor":"sprites/jabBeforeAnchor.0c949c15674c.json","uppercutOriginal":"sprites/uppercutOriginal.4fc6b6866293.json","sweepOriginal":"sprites/sweepOriginal.c2d1e1e736af.json","airjab":"sprites/airjab.4695a06fb990.json","airpunch":"sprites/airpunch.bdeb8d77ddc7.json","airkick":"sprites/airkick.73d523d43bfd.json","airheavykick":"sprites/airheavykick.45e056ff2b8c.json","lowblock":"sprites/lowblock.b3c4cfd9eb8d.json","grab":"sprites/grab.1170a25a9b5a.json","hitLight":"sprites/hitLight.HIT01.json"},"description":"VIC01 y LOS01: cierre automático al K.O., solo original, pose final sostenida, pruebas independientes","spriteSheets":{"grab2":"sprites/Sprite de El Maestro_ ¡Silencio en la sala!.png","hitStrong":"sprites/Secuencia de retroceso de El Maestro.png","hitLow":"sprites/Sprite de reacción en guardia.png","hitGrab":"sprites/Secuencia pixel art de reacción a agarre.png","dizzy":"sprites/Animación de mareo en seis poses.png","fallFront":"sprites/Secuencia pixel art de una caída_gracias.png","fallBack":"sprites/Secuencia pixel art de caída hacia atrás.png","recoverFront":"sprites/REC01.png","recoverBack":"sprites/REC02.png","riff":"Secuencia pixel art de ataque con guitarra.png","muscle":"Sprite Sheet de Sobrecarga Muscular.png","smartGlasses":"sprites/SPC03.png","smoke":"sprites/Hombre musculoso fumando en guardia.png","smokeFX":"sprites/Secuencia pixel art de humo verde grisáceo.png","ultA":"sprites/Activación.png","ultB":"sprites/ULT01B.png","ultC":"sprites/ULT01C.png","ultD":"sprites/ULT01D.png","entranceA":"sprites/ENT01A.png","entranceB":"sprites/ENT01B.png","entranceC":"sprites/ENT01C.png","entranceD":"sprites/ENT01D.png","victory":"sprites/VIC01.png","defeat":"sprites/LOS01.png"}});
  const getJSON=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status+' '+path);return r.json()};
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
  // HIT01 only: decontaminate the pale one-pixel matte without changing alpha or interior details.
  async function cleanHitFrame(url){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('HIT01: fotograma inválido'));im.src=url});
    const c=document.createElement('canvas'),w=c.width=im.naturalWidth,h=c.height=im.naturalHeight;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
    const pixels=g.getImageData(0,0,w,h),p=pixels.data,src=new Uint8ClampedArray(p),inner=new Uint8Array(w*h);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      let solid=true;for(let dy=-1;dy<=1&&solid;dy++)for(let dx=-1;dx<=1;dx++)if(!src[((y+dy)*w+x+dx)*4+3]){solid=false;break;}
      if(solid)inner[y*w+x]=1;
    }
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const n=y*w+x,j=n*4;if(!src[j+3]||inner[n])continue;
      const lo=Math.min(src[j],src[j+1],src[j+2]),hi=Math.max(src[j],src[j+1],src[j+2]);if(lo<80||(hi-lo>65&&lo<170))continue;
      let best=-1,dist=Infinity,dark=Infinity;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        const yy=y+dy,xx=x+dx;if(yy<0||yy>=h||xx<0||xx>=w||!inner[yy*w+xx])continue;
        const k=(yy*w+xx)*4,m=Math.min(src[k],src[k+1],src[k+2]),d=dx*dx+dy*dy;
        if(lo-m>=30&&m<125&&(d<dist||(d===dist&&m<dark))){best=k;dist=d;dark=m;}
      }
      if(best>=0){p[j]=src[best];p[j+1]=src[best+1];p[j+2]=src[best+2];}
    }
    g.putImageData(pixels,0,0);return c.toDataURL('image/png');
  }
  // HIT02: six horizontal cells, same scale for all poses and common floor anchor.
  async function loadStrongSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const result=[],scale=224/(im.naturalHeight*558/724);
    for(let i=0;i<6;i++){
      const x0=Math.round(i*im.naturalWidth/6),w=Math.round((i+1)*im.naturalWidth/6)-x0,h=im.naturalHeight;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
      function add(n){if(seen[n])return;seen[n]=1;const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);if(!p[j+3]||(lo>=205&&hi-lo<=40)){q[tail++]=n;p[j+3]=0;}}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w)}
      let bottom=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4;if(p[j+3]&&Math.min(p[j],p[j+1],p[j+2])<160)bottom=y+1;}
      if(!bottom)throw Error('HIT02: fotograma vacío '+i);g.putImageData(pix,0,0);
      const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(cell,Math.round(160-w*scale/2),Math.round(258-bottom*scale),Math.round(w*scale),Math.round(h*scale));result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }
  async function loadLowSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const result=[];let scale=0,anchor=0;
    for(let i=0;i<4;i++){
      const x0=Math.round(i*im.naturalWidth/4),w=Math.round((i+1)*im.naturalWidth/4)-x0,h=im.naturalHeight;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
      function add(n){if(seen[n])return;seen[n]=1;const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);if(!p[j+3]||(lo>=205&&hi-lo<=40)){q[tail++]=n;p[j+3]=0;}}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w)}
      let bottom=0,top=h,left=w,right=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4;if(p[j+3]&&Math.min(p[j],p[j+1],p[j+2])<160){bottom=y+1;top=Math.min(top,y);left=Math.min(left,x);right=Math.max(right,x+1);}}
      if(!bottom)throw Error('HIT03: fotograma vacío '+i);if(i===0){scale=224/(bottom-top);anchor=(left+right)/2;}g.putImageData(pix,0,0);
      const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(cell,Math.round(160-anchor*scale),Math.round(258-bottom*scale),Math.round(w*scale),Math.round(h*scale));result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }
  async function loadGrabReactionSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const result=[],rects=[[14,104,338,675],[356,104,692,675],[715,107,1027,675],[1049,37,1375,578],[1375,94,1762,615],[1780,107,2162,536]],scale=224/571;if(im.naturalWidth!==2172||im.naturalHeight!==724)throw Error('HIT05: dimensiones inesperadas');
    for(let i=0;i<6;i++){
      const [x0,y0,x1,y1]=rects[i],w=x1-x0,h=y1-y0;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
      function add(n){if(seen[n])return;seen[n]=1;const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);if(!p[j+3]||(lo>=205&&hi-lo<=40)){q[tail++]=n;p[j+3]=0;}}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w)}
      const visited=new Uint8Array(w*h),labels=new Int32Array(w*h);let largest=0,best=0,id=0;
      for(let n=0;n<w*h;n++){if(visited[n]||!p[n*4+3])continue;id++;head=0;tail=0;visited[n]=1;q[tail++]=n;while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);labels[k]=id;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!visited[z]&&p[z*4+3]){visited[z]=1;q[tail++]=z;}}}if(tail>largest){largest=tail;best=id;}}
      for(let n=0;n<w*h;n++)if(labels[n]!==best)p[n*4+3]=0;
      let bottom=0,top=h,left=w,right=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4;if(p[j+3]&&Math.min(p[j],p[j+1],p[j+2])<160){bottom=y+1;top=Math.min(top,y);left=Math.min(left,x);right=Math.max(right,x+1);}}
      if(!bottom)throw Error('HIT05: fotograma vacío '+i);const anchor=(left+right)/2;g.putImageData(pix,0,0);
      const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(cell,Math.round(160-anchor*scale),Math.round(258-bottom*scale),Math.round(w*scale),Math.round(h*scale));result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }
  async function loadDizzySheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const result=[],cuts=[0,343,690,1062,1448,1804,2172],holes=[[[227,357]],[[214,352],[274,482]],[[101,336]],[[123,332]],[[258,227]],[[229,367]]];let scale=0;if(im.naturalWidth!==2172||im.naturalHeight!==724)throw Error('STN01: dimensiones inesperadas');
    for(let i=0;i<6;i++){
      const x0=cuts[i],w=cuts[i+1]-x0,h=im.naturalHeight;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
      function add(n){if(seen[n])return;seen[n]=1;const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);if(!p[j+3]||(lo>=205&&hi-lo<=40)){q[tail++]=n;p[j+3]=0;}}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
      for(const [xx,yy] of holes[i])add(yy*w+xx);
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w)}
      let bottom=0,top=h,left=w,right=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4;if(p[j+3]&&Math.min(p[j],p[j+1],p[j+2])<160){bottom=y+1;top=Math.min(top,y);left=Math.min(left,x);right=Math.max(right,x+1);}}
      if(!bottom)throw Error('STN01: fotograma vacío '+i);if(i===0)scale=224/(bottom-top);let fl=w,fr=0;for(let y=Math.max(0,bottom-40);y<bottom;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4;if(p[j+3]&&Math.min(p[j],p[j+1],p[j+2])<160){fl=Math.min(fl,x);fr=Math.max(fr,x+1);}}const anchor=(fl+fr)/2;g.putImageData(pix,0,0);
      const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(cell,Math.round(160-anchor*scale),Math.round(258-bottom*scale),Math.round(w*scale),Math.round(h*scale));result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }
  // DWN01: isolate whole connected silhouettes, even when their x ranges overlap.
  async function loadFrontFallSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const w=im.naturalWidth,h=im.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);const p=g.getImageData(0,0,w,h).data;
    const labels=new Int32Array(w*h),q=new Int32Array(w*h),parts=[];let id=0;
    const foreground=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<205||hi-lo>40);};
    for(let n=0;n<w*h;n++){if(labels[n]||!foreground(n))continue;id++;let head=0,tail=0,l=w,r=0,t=h,bot=0;labels[n]=id;q[tail++]=n;
      while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);bot=Math.max(bot,y+1);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&foreground(z)){labels[z]=id;q[tail++]=z;}}}
      if(tail>1000)parts.push({id,l,r,t,bot,area:tail});
    }
    const poses=parts.sort((a,b)=>b.area-a.area).slice(0,6).sort((a,b)=>a.l-b.l);
    if(poses.length!==6)throw Error('DWN01: se esperaban seis figuras separadas');
    const scale=224/(poses[0].bot-poses[0].t),result=[];
    for(const part of poses){const cw=part.r-part.l,ch=part.bot-part.t,cell=document.createElement('canvas');cell.width=cw;cell.height=ch;const cg=cell.getContext('2d');const pix=cg.createImageData(cw,ch),dst=pix.data,ext=new Uint8Array(cw*ch),queue=new Int32Array(cw*ch);let head=0,tail=0;
      const global=n=>(part.t+Math.floor(n/cw))*w+part.l+n%cw;
      function add(n){if(ext[n]||labels[global(n)]===part.id)return;ext[n]=1;queue[tail++]=n;}
      for(let x=0;x<cw;x++){add(x);add((ch-1)*cw+x);}for(let y=0;y<ch;y++){add(y*cw);add(y*cw+cw-1);}
      while(head<tail){const n=queue[head++],x=n%cw,y=Math.floor(n/cw);if(x>0)add(n-1);if(x<cw-1)add(n+1);if(y>0)add(n-cw);if(y<ch-1)add(n+cw);}
      for(let n=0;n<cw*ch;n++){const k=global(n),j=k*4;if(labels[k]===part.id||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){dst.set(p.subarray(j,j+4),n*4);}}
      cg.putImageData(pix,0,0);const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;const rw=Math.round(cw*scale),rh=Math.round(ch*scale);ctx.drawImage(cell,Math.round(160-rw/2),258-rh,rw,rh);result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }
  // REC01/REC02: 4x2 sheets. Isolate largest silhouette per cell, excluding grid lines.
  async function loadRecoverySheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const poses=[],result=[];
    for(let i=0;i<8;i++){
      const col=i%4,row=Math.floor(i/4),x0=Math.round(col*im.naturalWidth/4),y0=Math.round(row*im.naturalHeight/2),w=Math.round((col+1)*im.naturalWidth/4)-x0,h=Math.round((row+1)*im.naturalHeight/2)-y0;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,labels=new Int32Array(w*h),q=new Int32Array(w*h);let id=0,best=0,largest=0;
      const fg=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<205||hi-lo>40);};
      for(let n=0;n<w*h;n++){if(labels[n]||!fg(n))continue;id++;let head=0,tail=0;labels[n]=id;q[tail++]=n;while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&fg(z)){labels[z]=id;q[tail++]=z;}}}if(tail>largest){largest=tail;best=id;}}
      if(largest<1000)throw Error('REC: fotograma vacío '+i);
      const ext=new Uint8Array(w*h);let head=0,tail=0;
      function add(n){if(ext[n]||labels[n]===best)return;ext[n]=1;q[tail++]=n;}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w);}
      let left=w,right=0,top=h,bottom=0;
      for(let n=0;n<w*h;n++){const j=n*4;if(labels[n]===best||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){const x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}else p[j+3]=0;}
      g.putImageData(pix,0,0);poses.push({cell,left,top,w:right-left,h:bottom-top});
    }
    const scale=224/poses[7].h;
    for(const pose of poses){const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;const rw=Math.round(pose.w*scale),rh=Math.round(pose.h*scale);ctx.drawImage(pose.cell,pose.left,pose.top,pose.w,pose.h,Math.round(160-rw/2),258-rh,rw,rh);result.push(await cleanHitFrame(frame.toDataURL('image/png')));}
    return result;
  }
  async function loadRiffSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const w=im.naturalWidth,h=Math.round(im.naturalHeight*600/724),c=document.createElement('canvas');c.width=w;c.height=h;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);const p=g.getImageData(0,0,w,h).data;
    const labels=new Int32Array(w*h),q=new Int32Array(w*h),parts=[];let id=0;
    const foreground=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<150||hi-lo>40);};
    for(let n=0;n<w*h;n++){if(labels[n]||!foreground(n))continue;id++;let head=0,tail=0,l=w,r=0,t=h,bot=0;labels[n]=id;q[tail++]=n;
      while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);bot=Math.max(bot,y+1);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&foreground(z)){labels[z]=id;q[tail++]=z;}}}
      if(tail>10000)parts.push({id,l,r,t,bot,area:tail});
    }
    const poses=parts.sort((a,b)=>b.area-a.area).slice(0,10).sort((a,b)=>a.l-b.l);
    if(poses.length!==10)throw Error('SPC01: se esperaban diez figuras separadas');
    const scale=224/(poses[0].bot-poses[0].t),result=[];
    for(const part of poses){const cw=part.r-part.l,ch=part.bot-part.t,cell=document.createElement('canvas');cell.width=cw;cell.height=ch;const cg=cell.getContext('2d');const pix=cg.createImageData(cw,ch),dst=pix.data,ext=new Uint8Array(cw*ch),queue=new Int32Array(cw*ch);let head=0,tail=0;
      const global=n=>(part.t+Math.floor(n/cw))*w+part.l+n%cw;
      function add(n){if(ext[n]||labels[global(n)]===part.id)return;ext[n]=1;queue[tail++]=n;}
      for(let x=0;x<cw;x++){add(x);add((ch-1)*cw+x);}for(let y=0;y<ch;y++){add(y*cw);add(y*cw+cw-1);}
      while(head<tail){const n=queue[head++],x=n%cw,y=Math.floor(n/cw);if(x>0)add(n-1);if(x<cw-1)add(n+1);if(y>0)add(n-cw);if(y<ch-1)add(n+cw);}
      for(let n=0;n<cw*ch;n++){const k=global(n),j=k*4;if(labels[k]===part.id||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){dst.set(p.subarray(j,j+4),n*4);}}
      cg.putImageData(pix,0,0);const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;const rw=Math.round(cw*scale),rh=Math.round(ch*scale);ctx.drawImage(cell,Math.round(160-rw/2),258-rh,rw,rh);result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }
  async function loadMuscleSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const poses=[],result=[];
    for(let i=0;i<10;i++){
      const col=i%5,row=Math.floor(i/5),x0=Math.round(col*im.naturalWidth/5),y0=Math.round(row*im.naturalHeight/2),w=Math.round((col+1)*im.naturalWidth/5)-x0,h=Math.round((row+1)*im.naturalHeight/2)-y0;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,labels=new Int32Array(w*h),q=new Int32Array(w*h);let id=0,best=0,largest=0;
      const fg=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<205||hi-lo>40);};
      for(let n=0;n<w*h;n++){if(labels[n]||!fg(n))continue;id++;let head=0,tail=0;labels[n]=id;q[tail++]=n;while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&fg(z)){labels[z]=id;q[tail++]=z;}}}if(tail>largest){largest=tail;best=id;}}
      if(largest<1000)throw Error('SPC02: fotograma vacío '+i);
      const ext=new Uint8Array(w*h);let head=0,tail=0;
      function add(n){if(ext[n]||labels[n]===best)return;ext[n]=1;q[tail++]=n;}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w);}
      let left=w,right=0,top=h,bottom=0;
      for(let n=0;n<w*h;n++){const j=n*4;if(labels[n]===best||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){const x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}else p[j+3]=0;}
      g.putImageData(pix,0,0);poses.push({cell,left,top,w:right-left,h:bottom-top});
    }
    const scale=224/poses[9].h;
    for(const pose of poses){const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;const rw=Math.round(pose.w*scale),rh=Math.round(pose.h*scale);ctx.drawImage(pose.cell,pose.left,pose.top,pose.w,pose.h,Math.round(160-rw/2),258-rh,rw,rh);result.push(await cleanHitFrame(frame.toDataURL('image/png')));}
    return result;
  }
  // FX01: preserve the relative size of each smoke pose, including detached wisps.
  async function loadSmokeFX(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')});
    const cuts=[0,230,510,843,1204,1608,1978,2288,2508],result=[];
    if(im.naturalWidth!==2508||im.naturalHeight!==627)throw Error('FX01: dimensiones inesperadas');
    for(let i=0;i<8;i++){
      const w=cuts[i+1]-cuts[i],h=im.naturalHeight,cell=document.createElement('canvas');cell.width=w;cell.height=h;
      const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,cuts[i],0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data;let l=w,r=0,top=h,bot=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);if(!p[j+3]||lo>=225||(hi-lo<9&&lo>198)){p[j+3]=0;continue;}l=Math.min(l,x);r=Math.max(r,x+1);top=Math.min(top,y);bot=Math.max(bot,y+1);}
      if(r<=l||bot<=top)throw Error('FX01: fotograma vacío '+i);g.putImageData(pix,0,0);
      const out=document.createElement('canvas');out.width=200;out.height=200;const c=out.getContext('2d');c.imageSmoothingEnabled=false;
      const rw=Math.round((r-l)*.46),rh=Math.round((bot-top)*.46);c.drawImage(cell,l,top,r-l,bot-top,Math.round(100-rw/2),Math.round(100-rh/2),rw,rh);result.push(out.toDataURL('image/png'));
    }return result;
  }
  async function loadUltimateSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')+'?ult='+Date.now()});
    const poses=[],result=[];
    for(let i=0;i<6;i++){
      const col=i%3,row=Math.floor(i/3),x0=Math.round(col*im.naturalWidth/3),y0=Math.round(row*im.naturalHeight/2),w=Math.round((col+1)*im.naturalWidth/3)-x0,h=Math.round((row+1)*im.naturalHeight/2)-y0;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,labels=new Int32Array(w*h),q=new Int32Array(w*h);let id=0,best=0,largest=0;
      const fg=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<205||hi-lo>40);};
      for(let n=0;n<w*h;n++){if(labels[n]||!fg(n))continue;id++;let head=0,tail=0;labels[n]=id;q[tail++]=n;while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&fg(z)){labels[z]=id;q[tail++]=z;}}}if(tail>largest){largest=tail;best=id;}}
      if(largest<1000)throw Error('ULT01: fotograma vacío '+i);
      const ext=new Uint8Array(w*h);let head=0,tail=0;
      function add(n){if(ext[n]||labels[n]===best)return;ext[n]=1;q[tail++]=n;}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w);}
      let left=w,right=0,top=h,bottom=0;
      for(let n=0;n<w*h;n++){const j=n*4;if(labels[n]===best||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){const x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}else p[j+3]=0;}
      g.putImageData(pix,0,0);poses.push({cell,left,top,w:right-left,h:bottom-top});
    }
    const scale=224/472;
    for(const pose of poses){const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;const rw=Math.round(pose.w*scale),rh=Math.round(pose.h*scale);ctx.drawImage(pose.cell,pose.left,pose.top,pose.w,pose.h,Math.round(160+(pose.left+pose.w/2-256)*scale-rw/2),258-rh,rw,rh);result.push(await cleanHitFrame(frame.toDataURL('image/png')));}
    return result;
  }

  async function loadEntranceSheet(path){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')+'?ult='+Date.now()});
    const poses=[],result=[];
    for(let i=0;i<8;i++){
      const col=i%4,row=Math.floor(i/4),x0=Math.round(col*im.naturalWidth/4),y0=Math.round(row*im.naturalHeight/2),w=Math.round((col+1)*im.naturalWidth/4)-x0,h=Math.round((row+1)*im.naturalHeight/2)-y0;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,labels=new Int32Array(w*h),q=new Int32Array(w*h);let id=0,best=0,largest=0;
      const fg=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<205||hi-lo>40);};
      for(let n=0;n<w*h;n++){if(labels[n]||!fg(n))continue;id++;let head=0,tail=0;labels[n]=id;q[tail++]=n;while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&fg(z)){labels[z]=id;q[tail++]=z;}}}if(tail>largest){largest=tail;best=id;}}
      const keep=n=>labels[n]===best||(i===3&&labels[n]!==0&&n%w>=290&&n%w<330&&Math.floor(n/w)>=437&&Math.floor(n/w)<462);if(largest<1000)throw Error('ENT01: fotograma vacío '+i);
      const ext=new Uint8Array(w*h);let head=0,tail=0;
      function add(n){if(ext[n]||keep(n))return;ext[n]=1;q[tail++]=n;}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w);}
      let left=w,right=0,top=h,bottom=0;
      for(let n=0;n<w*h;n++){const j=n*4;if(keep(n)||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){const x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}else p[j+3]=0;}
      g.putImageData(pix,0,0);poses.push({cell,left,top,w:right-left,h:bottom-top});
    }
    const scale=224/413;
    for(const pose of poses){const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;const rw=Math.round(pose.w*scale),rh=Math.round(pose.h*scale);ctx.drawImage(pose.cell,pose.left,pose.top,pose.w,pose.h,Math.round(160+(pose.left+pose.w/2-200)*scale-rw/2),258-rh,rw,rh);result.push(await cleanHitFrame(frame.toDataURL('image/png')));}
    return result;
  }


  // ENT01 2.0: six poses per block, common scale, stable head/hip axis and floor.
  async function loadEntranceBlock(path,name){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')+'?v='+encodeURIComponent(current.version)});
    if(im.naturalWidth!==1536||im.naturalHeight!==1024)throw Error('ENT01: dimensiones inesperadas '+name);
    const result=[],horizontal=name==='entranceD',cuts=[0,235,456,684,938,1220,1536],scale=224/480;
    for(let i=0;i<6;i++){
      const col=i%3,row=Math.floor(i/3),x0=horizontal?cuts[i]:col*512,y0=horizontal?0:row*512,w=horizontal?cuts[i+1]-cuts[i]:512,h=horizontal?1024:512;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,labels=new Int32Array(w*h),q=new Int32Array(w*h),sizes=[0];let id=0,best=0,largest=0;
      const fg=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<205||hi-lo>40);};
      for(let n=0;n<w*h;n++){if(labels[n]||!fg(n))continue;id++;let head=0,tail=0;labels[n]=id;q[tail++]=n;while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&fg(z)){labels[z]=id;q[tail++]=z;}}}sizes[id]=tail;if(tail>largest){largest=tail;best=id;}}
      if(largest<1000)throw Error('ENT01: fotograma vacío '+name+' '+i);
      let top=h,bot=0;for(let n=0;n<w*h;n++)if(labels[n]===best){const y=Math.floor(n/w);top=Math.min(top,y);bot=Math.max(bot,y+1);}
      const headXs=[];for(let y=top+45;y<Math.min(h,top+95);y++)for(let x=0;x<w;x++)if(labels[y*w+x]===best)headXs.push(x);
      headXs.sort((a,b)=>a-b);const anchor=(headXs[Math.floor(headXs.length/2)]??w/2)-12;
      const keep=n=>labels[n]===best||(name==='entranceB'&&(i===3||i===4)&&labels[n]>0&&sizes[labels[n]]>=100&&sizes[labels[n]]<1200);
      const ext=new Uint8Array(w*h);let head=0,tail=0;function add(n){if(ext[n]||keep(n))return;ext[n]=1;q[tail++]=n;}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w);}
      let l=w,r=0,u=h,d=0;for(let n=0;n<w*h;n++){const j=n*4;if(keep(n)||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){const x=n%w,y=Math.floor(n/w);l=Math.min(l,x);r=Math.max(r,x+1);u=Math.min(u,y);d=Math.max(d,y+1);}else p[j+3]=0;}
      g.putImageData(pix,0,0);const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(cell,l,u,r-l,d-u,Math.round(160+(l-anchor)*scale),Math.round(258+(u-bot)*scale),Math.round((r-l)*scale),Math.round((d-u)*scale));result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }
  async function loadResultSheet(path,name){
    const im=new Image();await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('No se pudo cargar '+path));im.src=path.split('/').map(encodeURIComponent).join('/')+'?v='+encodeURIComponent(current.version)});
    if(im.naturalWidth!==1536||im.naturalHeight!==1024)throw Error('VIC/LOS: dimensiones inesperadas '+name);
    const result=[],horizontal=false,cuts=[0,235,456,684,938,1220,1536],scale=224/480;
    for(let i=0;i<6;i++){
      const col=i%3,row=Math.floor(i/3),x0=horizontal?cuts[i]:col*512,y0=horizontal?0:row*512,w=horizontal?cuts[i+1]-cuts[i]:512,h=horizontal?1024:512;
      const cell=document.createElement('canvas');cell.width=w;cell.height=h;const g=cell.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
      const pix=g.getImageData(0,0,w,h),p=pix.data,labels=new Int32Array(w*h),q=new Int32Array(w*h),sizes=[0];let id=0,best=0,largest=0;
      const fg=n=>{const j=n*4,lo=Math.min(p[j],p[j+1],p[j+2]),hi=Math.max(p[j],p[j+1],p[j+2]);return p[j+3]>0&&(lo<205||hi-lo>40);};
      for(let n=0;n<w*h;n++){if(labels[n]||!fg(n))continue;id++;let head=0,tail=0;labels[n]=id;q[tail++]=n;while(head<tail){const k=q[head++],x=k%w,y=Math.floor(k/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const z=yy*w+xx;if(!labels[z]&&fg(z)){labels[z]=id;q[tail++]=z;}}}sizes[id]=tail;if(tail>largest){largest=tail;best=id;}}
      if(largest<1000)throw Error('VIC/LOS: fotograma vacío '+name+' '+i);
      let top=h,bot=0;for(let n=0;n<w*h;n++)if(labels[n]===best){const y=Math.floor(n/w);top=Math.min(top,y);bot=Math.max(bot,y+1);}
      const headXs=[];for(let y=top+45;y<Math.min(h,top+95);y++)for(let x=0;x<w;x++)if(labels[y*w+x]===best)headXs.push(x);
      headXs.sort((a,b)=>a-b);const anchor=w/2;
      const keep=n=>labels[n]===best||(name==='entranceB'&&(i===3||i===4)&&labels[n]>0&&sizes[labels[n]]>=100&&sizes[labels[n]]<1200);
      const ext=new Uint8Array(w*h);let head=0,tail=0;function add(n){if(ext[n]||keep(n))return;ext[n]=1;q[tail++]=n;}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);if(x>0)add(n-1);if(x<w-1)add(n+1);if(y>0)add(n-w);if(y<h-1)add(n+w);}
      let l=w,r=0,u=h,d=0;for(let n=0;n<w*h;n++){const j=n*4;if(keep(n)||(!ext[n]&&Math.min(p[j],p[j+1],p[j+2])<245)){const x=n%w,y=Math.floor(n/w);l=Math.min(l,x);r=Math.max(r,x+1);u=Math.min(u,y);d=Math.max(d,y+1);}else p[j+3]=0;}
      g.putImageData(pix,0,0);const frame=document.createElement('canvas');frame.width=320;frame.height=280;const ctx=frame.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(cell,l,u,r-l,d-u,Math.round(160+(l-anchor)*scale),Math.round(258+(u-bot)*scale),Math.round((r-l)*scale),Math.round((d-u)*scale));result.push(await cleanHitFrame(frame.toDataURL('image/png')));
    }return result;
  }

  function reload(){if(!pending)return;const url=new URL(location.href);url.searchParams.set('v',pending.version);url.searchParams.set('t',Date.now());location.replace(url.href)}
  apply.onclick=reload;
  async function poll(){if(!current||busy)return;busy=true;try{const m=await fresh();if(m.version!==current.version){pending=m;apply.hidden=false;status.textContent='Nueva versión '+m.version+' disponible · se reiniciará el combate al actualizar.'}else{pending=null;apply.hidden=true;status.textContent='Versión '+current.version+' · al día';}}catch{status.textContent='Sin conexión con el servidor · puedes seguir jugando.'}finally{busy=false}}
  check.onclick=poll;
  async function start(){try{current=await fresh();status.textContent='Cargando '+current.version+'…';window.labSpriteData=Object.fromEntries(await Promise.all(Object.entries(current.animations).map(async ([name,path])=>[name,await getJSON(path+'?v='+encodeURIComponent(current.version))])));for(const [name,path] of Object.entries(current.spriteSheets||{}))window.labSpriteData[name]=await ((name==='victory'||name==='defeat')?loadResultSheet(path,name):name.startsWith('entrance')?loadEntranceBlock(path,name):name.startsWith('ult')?loadUltimateSheet(path):name==='smokeFX'?loadSmokeFX(path):(name==='muscle'||name==='smartGlasses'||name==='smoke')?loadMuscleSheet(path):name==='riff'?loadRiffSheet(path):(name==='recoverFront'||name==='recoverBack')?loadRecoverySheet(path):(name==='fallFront'||name==='fallBack')?loadFrontFallSheet(path):name==='dizzy'?loadDizzySheet(path):name==='hitGrab'?loadGrabReactionSheet(path):name==='hitLow'?loadLowSheet(path):name==='hitStrong'?loadStrongSheet(path):loadSheet(path));for(const [name,path] of Object.entries(current.optionalAnimations||{})){try{const arr=await getJSON(path+'?v='+encodeURIComponent(current.version));if(!Array.isArray(arr)||arr.length!==4||!arr.every(x=>typeof x==='string'&&x.startsWith('data:image/png;base64,')))throw Error('Formato de fotogramas inválido');window.labSpriteData[name]=arr;}catch(e){const option=document.querySelector('#motion option[value="'+name+'"]');if(option)option.remove();document.getElementById('hit01Status').textContent='HIT01 pendiente: falta subir '+path+'; el resto del laboratorio sigue funcionando.';console.warn(e);}}if(window.labSpriteData.hitLight)window.labSpriteData.hitLight=await Promise.all(window.labSpriteData.hitLight.map(cleanHitFrame));if(window.labSpriteData.hitLight)document.getElementById('hit01Status').textContent='HIT01 disponible: pulsa Probar HIT01 para recibir un golpe débil, o elige HIT01 en el inspector.';if(window.labSpriteData.hitStrong)document.getElementById('hit02Status').textContent='HIT02 disponible: pulsa Probar HIT02 o Y cerca del rival.';if(window.labSpriteData.hitLow)document.getElementById('hit03Status').textContent='HIT03 disponible: pulsa Probar HIT03 o G cerca del rival.';if(window.labSpriteData.hitGrab)document.getElementById('hit05Status').textContent='HIT05 disponible: pulsa Probar HIT05 o H cerca del rival. Enlaza con DWN02 y REC02.';if(window.labSpriteData.dizzy)document.getElementById('stn01Status').textContent='STN01: Probar STN01 (B) · tres golpes sin bloquear en cuatro segundos (umbral provisional).';if(window.labSpriteData.fallFront)document.getElementById('dwn01Status').textContent='DWN01: Probar DWN01 · barrida rival (N). Enlaza con REC01.';if(window.labSpriteData.fallBack)document.getElementById('dwn02Status').textContent='DWN02: Probar DWN02 · también enlazada al agarre rival (H) y REC02.';if(window.labSpriteData.recoverFront&&window.labSpriteData.recoverBack)document.getElementById('recStatus').textContent='REC01 y REC02 disponibles: prueba individual o caída completa. Recuperación automática de 700 ms.';if(window.labSpriteData.riff)document.getElementById('spc01Status').textContent='SPC01 · Atrás, atrás + J · Sin requisito ni consumo de energía. Pulsa dos veces en sentido contrario al rival y luego J.';if(window.labSpriteData.muscle)document.getElementById('spc02Status').textContent='SPC02 · ↓ ↓ + U · Sin coste de energía. Ataque cercano con derribo de espaldas.';if(window.labSpriteData.smartGlasses)document.getElementById('spc03Status').textContent='SPC03 · Adelante, adelante + J · Sin coste de energía. Rayo alto instantáneo; bloqueo alto o agacharse.';if(window.labSpriteData.smoke&&window.labSpriteData.smokeFX)document.getElementById('spc04Status').textContent='SPC04 · ↓ ↓ + K · Sin energía. Nube independiente FX01, 90 HP y aturdimiento de 1.800 ms.';const ud=window.labSpriteData;if(ud.ultA&&ud.ultB&&ud.ultC&&ud.ultD){window.ultFallback=ud.ultB.every((x,i)=>x===ud.ultC[i]);if(window.ultFallback)ud.ultC=[ud.smartGlasses[0],ud.smartGlasses[2],ud.smartGlasses[3],ud.smartGlasses[4],ud.ultA[5],ud.ultA[5]];document.getElementById('ultStatus').textContent='ULT01 · L o J + K + U + I · 100% de energía · 400 HP. '+(window.ultFallback?'ULT01C provisional: sustituir PNG duplicado.':'Cuatro hojas cargadas.');}if(['entranceA','entranceB','entranceC','entranceD'].every(k=>ud[k]?.length===6)){ud.entranceD[5]=ud.idle[0];ud.entrance=[...ud.entranceA,...ud.entranceB,...ud.entranceC,...ud.entranceD];document.getElementById('entStatus').textContent='ENT01 2.0 · 24 poses · caminata cíclica + acorde + lentes + guardia. Pulsa Iniciar combate; Esc para omitir.';}if(ud.victory?.length===6&&ud.defeat?.length===6){ud.victory[0]=ud.idle[0];document.getElementById('resultStatus').textContent='VIC01 y LOS01 · 6 poses cada una · activación automática al K.O. o botones de prueba. Reiniciar combate para volver a la guardia.';}const script=document.createElement('script');script.src=current.engine;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.body.appendChild(script)});status.textContent='Versión '+current.version+' · al día';setInterval(poll,15000);window.addEventListener('focus',poll);setInterval(()=>{if(!pending||!auto.checked||document.hidden||!window.labCanReload?.()||Date.now()-lastInput<2500){idleSince=0;return}if(!idleSince)idleSince=Date.now();if(Date.now()-idleSince>=1500)reload()},300)}catch(e){status.textContent='No se pudo cargar el laboratorio: '+e.message;document.getElementById('state').textContent='Error de carga';console.error(e)}}
  start();
})();
