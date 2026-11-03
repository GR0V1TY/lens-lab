/* Blender exports; meshes are authored in the accompanying .blend project. */
window.LensAssets={async load(){
 const base=new URL('assets/',document.currentScript?.src||location.href);
 const get=async name=>{const r=await fetch(new URL(name,base));if(!r.ok)throw Error(`模型资源加载失败：${name} (${r.status})`);return r;};
 const [manifest,bytes,motion]=await Promise.all([(await get('robin.json')).json(),(await get(matchMedia('(max-width:760px)').matches?'robin-mobile.bin':'robin.bin')).arrayBuffer(),(await get('robin-motion.json')).json()]);
 const mobile=matchMedia('(max-width:760px)').matches,meta=mobile?manifest.mobile:manifest.meshes,data=new Float32Array(bytes),bird={};
 for(const [name,m] of Object.entries(meta)){if(m.offset+m.count*12>data.length)throw Error('鸟模型数据不完整，请刷新重试。');bird[name]={vertices:data.subarray(m.offset,m.offset+m.count*12),count:m.count,triangles:m.triangles,leaves:0,feathers:0};}
 this.bird=bird;this.motion=motion;this.source=manifest.source;this.mobile=mobile;this.bytes=bytes.byteLength;
},pose(time){const motion=this.motion;if(!motion)return null;const t=((time%motion.duration)+motion.duration)%motion.duration,i=Math.floor(t*motion.fps),f=t*motion.fps-i,a=motion.frames[i],b=motion.frames[i+1],p={};for(const key of Object.keys(a))p[key]=a[key]*(1-f)+b[key]*f;p.resting=p.flutter<.02;p.cycle=t;return p;}};
