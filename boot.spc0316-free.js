(() => {
  'use strict';
  const status=document.getElementById('updateStatus'), auto=document.getElementById('autoUpdate'), apply=document.getElementById('applyUpdate'), check=document.getElementById('checkUpdate');
  let current=null, pending=null, busy=false, idleSince=0, lastInput=Date.now();
  const storage={get(k){try{return sessionStorage.getItem(k)}catch{return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch{}}};
  auto.checked=storage.get('labAutoUpdate')!=='off';
  auto.onchange=()=>storage.set('labAutoUpdate',auto.checked?'on':'off');
  for(const event of ['keydown','pointerdown','input']) window.addEventListener(event,()=>{lastInput=Date.now();idleSince=0},true);
  const fresh=async()=>{const response=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return response.json()};
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
  function reload(){if(!pending)return;const url=new URL(location.href);url.searchParams.set('v',pending.version);url.searchParams.set('t',Date.now());location.replace(url.href)}
  apply.onclick=reload;
  async function poll(){if(!current||busy)return;busy=true;try{const m=await fresh();if(m.version!==current.version){pending=m;apply.hidden=false;status.textContent='Nueva versión '+m.version+' disponible · se reiniciará el combate al actualizar.'}else{pending=null;apply.hidden=true;status.textContent='Versión '+current.version+' · al día';}}catch{status.textContent='Sin conexión con el servidor · puedes seguir jugando.'}finally{busy=false}}
  check.onclick=poll;
  async function start(){try{current=await fresh();status.textContent='Cargando '+current.version+'…';window.labSpriteData=Object.fromEntries(await Promise.all(Object.entries(current.animations).map(async ([name,path])=>[name,await getJSON(path+'?v='+encodeURIComponent(current.version))])));for(const [name,path] of Object.entries(current.spriteSheets||{}))window.labSpriteData[name]=await (name==='riff'?loadRiffSheet(path):(name==='recoverFront'||name==='recoverBack')?loadRecoverySheet(path):(name==='fallFront'||name==='fallBack')?loadFrontFallSheet(path):name==='dizzy'?loadDizzySheet(path):name==='hitGrab'?loadGrabReactionSheet(path):name==='hitLow'?loadLowSheet(path):name==='hitStrong'?loadStrongSheet(path):loadSheet(path));for(const [name,path] of Object.entries(current.optionalAnimations||{})){try{const arr=await getJSON(path+'?v='+encodeURIComponent(current.version));if(!Array.isArray(arr)||arr.length!==4||!arr.every(x=>typeof x==='string'&&x.startsWith('data:image/png;base64,')))throw Error('Formato de fotogramas inválido');window.labSpriteData[name]=arr;}catch(e){const option=document.querySelector('#motion option[value="'+name+'"]');if(option)option.remove();document.getElementById('hit01Status').textContent='HIT01 pendiente: falta subir '+path+'; el resto del laboratorio sigue funcionando.';console.warn(e);}}if(window.labSpriteData.hitLight)window.labSpriteData.hitLight=await Promise.all(window.labSpriteData.hitLight.map(cleanHitFrame));if(window.labSpriteData.hitLight)document.getElementById('hit01Status').textContent='HIT01 disponible: pulsa Probar HIT01 para recibir un golpe débil, o elige HIT01 en el inspector.';if(window.labSpriteData.hitStrong)document.getElementById('hit02Status').textContent='HIT02 disponible: pulsa Probar HIT02 o Y cerca del rival.';if(window.labSpriteData.hitLow)document.getElementById('hit03Status').textContent='HIT03 disponible: pulsa Probar HIT03 o G cerca del rival.';if(window.labSpriteData.hitGrab)document.getElementById('hit05Status').textContent='HIT05 disponible: pulsa Probar HIT05 o H cerca del rival. Enlaza con DWN02 y REC02.';if(window.labSpriteData.dizzy)document.getElementById('stn01Status').textContent='STN01: Probar STN01 (B) · tres golpes sin bloquear en cuatro segundos (umbral provisional).';if(window.labSpriteData.fallFront)document.getElementById('dwn01Status').textContent='DWN01: Probar DWN01 · barrida rival (N). Enlaza con REC01.';if(window.labSpriteData.fallBack)document.getElementById('dwn02Status').textContent='DWN02: Probar DWN02 · también enlazada al agarre rival (H) y REC02.';if(window.labSpriteData.recoverFront&&window.labSpriteData.recoverBack)document.getElementById('recStatus').textContent='REC01 y REC02 disponibles: prueba individual o caída completa. Recuperación automática de 700 ms.';if(window.labSpriteData.riff)document.getElementById('spc01Status').textContent='SPC01 · Atrás, atrás + J · Sin requisito ni consumo de energía. Pulsa dos veces en sentido contrario al rival y luego J.';const script=document.createElement('script');script.src=current.engine;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.body.appendChild(script)});status.textContent='Versión '+current.version+' · al día';setInterval(poll,15000);window.addEventListener('focus',poll);setInterval(()=>{if(!pending||!auto.checked||document.hidden||!window.labCanReload?.()||Date.now()-lastInput<2500){idleSince=0;return}if(!idleSince)idleSince=Date.now();if(Date.now()-idleSince>=1500)reload()},300)}catch(e){status.textContent='No se pudo cargar el laboratorio: '+e.message;document.getElementById('state').textContent='Error de carga';console.error(e)}}
  start();
})();
