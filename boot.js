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
  function reload(){if(!pending)return;const url=new URL(location.href);url.searchParams.set('v',pending.version);url.searchParams.set('t',Date.now());location.replace(url.href)}
  apply.onclick=reload;
  async function poll(){if(!current||busy)return;busy=true;try{const m=await fresh();if(m.version!==current.version){pending=m;apply.hidden=false;status.textContent='Nueva versión '+m.version+' disponible · se reiniciará el combate al actualizar.'}else{pending=null;apply.hidden=true;status.textContent='Versión '+current.version+' · al día';}}catch{status.textContent='Sin conexión con el servidor · puedes seguir jugando.'}finally{busy=false}}
  check.onclick=poll;
  async function start(){try{current=await fresh();status.textContent='Cargando '+current.version+'…';window.labSpriteData=Object.fromEntries(await Promise.all(Object.entries(current.animations).map(async ([name,path])=>[name,await getJSON(path)])));const script=document.createElement('script');script.src=current.engine;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.body.appendChild(script)});status.textContent='Versión '+current.version+' · al día';setInterval(poll,15000);window.addEventListener('focus',poll);setInterval(()=>{if(!pending||!auto.checked||document.hidden||!window.labCanReload?.()||Date.now()-lastInput<2500){idleSince=0;return}if(!idleSince)idleSince=Date.now();if(Date.now()-idleSince>=1500)reload()},300)}catch(e){status.textContent='No se pudo cargar el laboratorio. Abre el sitio publicado (HTTP/HTTPS), no el HTML local.';document.getElementById('state').textContent='Error de carga';console.error(e)}}
  start();
})();
