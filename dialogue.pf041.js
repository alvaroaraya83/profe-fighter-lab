(()=>{"use strict";
function create({bank,enabled,width=800,height=400}){
 const slots=[null,null],fired=[new Set(),new Set()];let layout=[];
 function clear(){slots.fill(null);fired.forEach(s=>s.clear());layout=[];}
 function begin(id,key){fired[id].delete(key);}
 function show(id,key){const d=bank[key];if(!d||fired[id].has(key))return false;fired[id].add(key);if(enabled())slots[id]={key,text:d.text,left:d.duration};return true;}
 function trigger(id,key,t){const d=bank[key];if(d&&t>=d.at)return show(id,key);return false;}
 function tick(dt){for(let i=0;i<2;i++){const s=slots[i];if(s){s.left-=dt;if(s.left<=0||!enabled())slots[i]=null;}}}
 function wrap(ctx,text,max){const lines=[];let line="";for(const word of text.split(/\s+/)){const trial=line?line+" "+word:word;if(line&&ctx.measureText(trial).width>max){lines.push(line);line=word;}else line=trial;}if(line)lines.push(line);return lines;}
 function draw(ctx,fighters){layout=[];if(!enabled())return;ctx.save();ctx.font="bold 16px Arial, sans-serif";ctx.textBaseline="middle";ctx.textAlign="center";
 const gap=10,margin=8,top=76;const collide=(a,b)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
 for(const p of fighters){const slot=slots[p.id];if(!slot)continue;const lines=wrap(ctx,slot.text,216),w=Math.max(90,Math.min(240,Math.max(...lines.map(t=>ctx.measureText(t).width))+24)),h=lines.length*21+18;const headX=Math.max(8,Math.min(width-8,p.x)),headY=Math.max(92,Math.min(height-62,118-p.lift+(p.state==="defeat"||p.state==="fallBack"?75:0)));let x=Math.max(margin,Math.min(width-margin-w,headX-w/2)),y=Math.max(top,headY-h-15);let b={id:p.id,key:slot.key,x,y,w,h,headX,headY,lines};
 if(layout.some(q=>collide(b,q))){const other=layout[0],left=other.x-gap-w,right=other.x+other.w+gap;const choices=[left,right].filter(v=>v>=margin&&v+w<=width-margin).sort((a,b)=>Math.abs(a-x)-Math.abs(b-x));if(choices.length)b.x=choices[0];else b.y=Math.min(height-70-h,other.y+other.h+gap);}
 layout.push(b);
 }
 for(const b of layout){const {x,y,w,h,headX,headY,lines}=b,r=10,tx=Math.max(x+18,Math.min(x+w-18,headX)),ty=y+h;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,ty-r);ctx.quadraticCurveTo(x+w,ty,x+w-r,ty);ctx.lineTo(tx+9,ty);ctx.lineTo(headX,Math.max(ty+9,headY));ctx.lineTo(tx-9,ty);ctx.lineTo(x+r,ty);ctx.quadraticCurveTo(x,ty,x,ty-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fillStyle="#fffdf3";ctx.strokeStyle="#101010";ctx.lineWidth=3;ctx.fill();ctx.stroke();ctx.fillStyle="#171717";lines.forEach((line,i)=>ctx.fillText(line,x+w/2,y+9+10.5+i*21));}
 ctx.restore();}
 return {clear,begin,show,trigger,tick,draw,state:()=>slots.map(s=>s?{...s}:null),layout:()=>layout.map(b=>({...b}))};
}
window.PFDialogue={create};
})();