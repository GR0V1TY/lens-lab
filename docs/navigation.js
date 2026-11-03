(() => {
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,t)=>a.map(v=>v*t),len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const defaults=s=>{if(s.scene===2)return LensHighland.camera(s);const z=s.scene===1?(s.keepSize?12*s.focal/100:12):(s.keepSize?5.6*s.focal/50:5.6);return {eye:s.scene===1?[-.12,1.65,z]:[0,1.7,z],target:s.scene===1?[-.12,1.65,0]:[0,1.36,0]};};
 window.LensNavigation=class {
  static view(s){return s.camera||defaults(s);}
  constructor(el,state,changed,allowed){this.el=el;this.state=state;this.changed=changed;this.allowed=allowed;this.camera=null;this.mode='orbit';this.track=false;this.points=new Map();this.keys=new Set();this.suppress=0;el.tabIndex=0;el.setAttribute('aria-label','取景画面：拖动旋转，右键拖动平移，滚轮移动机位。自由漫游时用 WASD 和 Q/E 移动。');
   el.addEventListener('contextmenu',e=>e.preventDefault());
   el.addEventListener('click',e=>{if(performance.now()<this.suppress){e.preventDefault();e.stopImmediatePropagation();}},true);
   el.addEventListener('pointerdown',e=>{if(!allowed()||e.target.closest('input,button'))return;el.focus({preventScroll:true});el.setPointerCapture(e.pointerId);this.points.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,button:e.button});if(this.points.size>1)this.suppress=performance.now()+700;});
   el.addEventListener('pointermove',e=>{const p=this.points.get(e.pointerId);if(!p||!allowed())return;const old=[...this.points.values()].map(p=>({...p}));p.x=e.clientX;p.y=e.clientY;if(this.points.size===1&&Math.hypot(p.x-p.sx,p.y-p.sy)<5)return;this.suppress=performance.now()+700;const now=[...this.points.values()];if(now.length===2){const center=a=>[(a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2],distance=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);const a=center(old),b=center(now);this.pan(b[0]-a[0],b[1]-a[1]);this.dolly((distance(old)-distance(now))*.015);}else{const q=old[0],dx=p.x-q.x,dy=p.y-q.y;if(p.button===2||e.shiftKey)this.pan(dx,dy);else this.rotate(dx,dy);}});
   const end=e=>{this.points.delete(e.pointerId);if(this.points.size)for(const p of this.points.values()){p.sx=p.x;p.sy=p.y;}if(e.type==='pointercancel')this.suppress=performance.now()+700;};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
   el.addEventListener('wheel',e=>{if(!allowed())return;e.preventDefault();this.dolly(clamp(e.deltaY,-150,150)*.002);},{passive:false});
   el.addEventListener('keydown',e=>{if(this.mode!=='free'||!allowed()||!['w','a','s','d','q','e'].includes(e.key.toLowerCase()))return;e.preventDefault();this.keys.add(e.key.toLowerCase());});el.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));el.addEventListener('blur',()=>this.keys.clear());window.addEventListener('blur',()=>this.keys.clear());document.addEventListener('visibilitychange',()=>{this.keys.clear();this.points.clear();});
  }
  get(){return this.camera?structuredClone(this.camera):null;}
  view(){return this.camera||defaults(this.state());}
  edit(){if(!this.camera)this.camera=structuredClone(defaults(this.state()));return this.camera;}
  commit(){const c=this.camera;c.eye=c.eye.map(v=>clamp(v,-95,95));c.eye[1]=clamp(c.eye[1],.15,30);if(len(sub(c.eye,c.target))<.25)c.target=add(c.eye,[0,0,-1]);this.changed();}
  reset(){this.camera=null;this.keys.clear();this.points.clear();this.changed();}
  restore(c){if(c&&['eye','target'].every(k=>Array.isArray(c[k])&&c[k].length===3&&c[k].every(v=>Number.isFinite(v)&&Math.abs(v)<=(this.state().scene===2?10000:100)))&&len(sub(c.eye,c.target))>.24){this.camera=structuredClone(c);return true;}return false;}
  rotate(dx,dy){const c=this.edit(),free=this.mode==='free',v=free?sub(c.target,c.eye):sub(c.eye,c.target),r=len(v),yaw=Math.atan2(v[0],v[2])-dx*.005,pitch=clamp(Math.asin(v[1]/r)+(free?-1:1)*dy*.005,-1.48,1.48),next=[r*Math.cos(pitch)*Math.sin(yaw),r*Math.sin(pitch),r*Math.cos(pitch)*Math.cos(yaw)];if(free)c.target=add(c.eye,next);else c.eye=add(c.target,next);this.commit();}
  pan(dx,dy){const c=this.edit(),f=unit(sub(c.target,c.eye)),right=unit(cross(f,[0,1,0])),up=cross(right,f),scale=len(sub(c.eye,c.target))*36/(this.state().focal*this.el.clientWidth),delta=add(mul(right,-dx*scale),mul(up,dy*scale));c.eye=add(c.eye,delta);c.target=add(c.target,delta);this.commit();}
  dolly(amount){const c=this.edit(),v=sub(c.eye,c.target),r=len(v),next=clamp(r*Math.exp(amount),.45,90);if(this.mode==='free'){const d=mul(unit(v),r-next);c.eye=sub(c.eye,d);c.target=sub(c.target,d);}else c.eye=add(c.target,mul(unit(v),next));this.commit();}
  move(key,dt=.2){const c=this.edit(),f=unit(sub(c.target,c.eye)),right=unit(cross(f,[0,1,0])),speed=clamp(len(sub(c.eye,c.target))*.3,.3,10)*dt,dirs={w:f,s:mul(f,-1),a:mul(right,-1),d:right,q:[0,-1,0],e:[0,1,0]},delta=mul(dirs[key],speed);c.eye=add(c.eye,delta);c.target=add(c.target,delta);this.commit();}
  tick(dt){if(this.mode==='free'&&this.allowed())for(const k of this.keys)this.move(k,Math.min(dt,.05));}
  preset(name){const s=this.state(),d=defaults(s);if(s.scene===2){const yaw={front:0,side:Math.PI/2,back:Math.PI}[name];this.camera={eye:d.eye,target:add(d.eye,[Math.sin(yaw)*40,4,-Math.cos(yaw)*40])};this.commit();return;}const r=len(sub(d.eye,d.target)),angles={front:0,side:Math.PI/2,back:Math.PI};this.camera={target:d.target,eye:add(d.target,[r*Math.sin(angles[name]),0,r*Math.cos(angles[name])])};this.commit();}
  distance(){const c=this.view(),p=this.state().scene===2?LensHighland.subject:this.state().scene===1?[-.12,1.65,0]:[0,1.36,0];return clamp(sub(p,c.eye).reduce((n,v,i)=>n+v*unit(sub(c.target,c.eye))[i],0),1,this.state().scene===2?10000:this.state().scene===1?100:20);}
 };
})();
