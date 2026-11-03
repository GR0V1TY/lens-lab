/* Original metre-scale highland terrain, generated locally without downloaded assets. */
(() => {
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);},mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t),hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
 function noise(x,z){const i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;}
 function fbm(x,z){let s=0,a=.5;for(let i=0;i<5;i++){s+=noise(x,z)*a;x=x*2.09+17;z=z*2.03-11;a*=.5;}return s;}
 const peaks=[[-680,-760,430,430,270],[-180,-1130,620,380,360],[420,-900,490,350,300],[970,-1500,700,550,490],[-1100,-1850,830,610,580],[40,-2300,1020,700,620],[1350,-2800,1150,800,750],[-1900,-3100,1120,850,680]];
 function height(x,z){const far=smooth(-60,-300,z);let mountain=0;for(const [px,pz,h,wx,wz] of peaks){const d=Math.hypot((x-px)/wx,(z-pz)/wz);mountain=Math.max(mountain,h*Math.max(0,1-d*.62)**1.9);}
 const fracture=(.42+.58*fbm(x*.004,z*.004))*.7+.3*(1-Math.abs(noise(x*.009,z*.009)*2-1));mountain*=fracture;
 const valley=-65*Math.exp(-(((x-70)/180)**2))*smooth(-40,-350,z)*(1-smooth(-1300,-2400,z));
 const near=-.5+.65*noise(x*.10,z*.10)+1.7*(fbm(x*.035,z*.035)-.5);return near*(1-far)+(mountain+valley-18)*far;
 }
 let cached;
 function build(){if(cached)return cached;const mobile=matchMedia('(max-width:760px)').matches,values=[];let triangles=0;
 const at=(x,z)=>{const y=height(x,z),e=Math.max(.35,Math.abs(z)*.001),nx=height(x-e,z)-height(x+e,z),nz=height(x,z-e)-height(x,z+e),l=Math.hypot(nx,e*2,nz),n=[nx/l,e*2/l,nz/l],grain=fbm(x*.07,z*.07),rock=mix([.15,.13,.14],[.28,.27,.31],grain),snow=smooth(145+noise(x*.015,z*.015)*60,250+noise(x*.01,z*.01)*70,y)*smooth(.10,.55,n[1]);let color=mix(rock,[.69,.77,.86],snow);if(z>-130)color=mix([.095,.12,.085],[.23,.19,.15],noise(x*.5,z*.5));return {p:[x,y,z],n,c:color};};
 const vertex=q=>values.push(...q.p,...q.n,...q.c,q.p[0]*.05,q.p[2]*.05,9);
 const grid=(xs,zs)=>{const rows=zs.map(z=>xs.map(x=>at(x,z)));for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){const a=rows[j][i],b=rows[j][i+1],c=rows[j+1][i+1],d=rows[j+1][i];for(const v of ((i+j)%2?[a,b,d,b,c,d]:[a,b,c,a,c,d]))vertex(v);triangles+=2;}};
 const n=mobile?100:170,xs=Array.from({length:n+1},(_,i)=>{const u=i/n*2-1;return Math.sign(u)*u*u*3400;}),zs=Array.from({length:n+1},(_,i)=>35-(i/n)**2*4500);grid(xs,zs);
 // Low rocks and sparse tussocks on the plateau are real geometry.
 for(let j=0;j<(mobile?90:210);j++){const x=(hash(j,8)-.5)*65,z=20-hash(j,19)*100,y=height(x,z),r=.1+hash(j,5)*.5;const color=[.22,.20,.23],top={p:[x+.13*r,y+r*.65,z],n:[0,1,0],c:color};for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;vertex({p:[x+Math.cos(a)*r,y,z+Math.sin(a)*r],n:[Math.cos(a)*.6,.8,Math.sin(a)*.6],c:color});vertex(top);vertex({p:[x+Math.cos(b)*r,y,z+Math.sin(b)*r],n:[Math.cos(b)*.6,.8,Math.sin(b)*.6],c:color});triangles++;}if(j%3===0)for(let b=0;b<4;b++){const dx=(b-1.5)*.06;vertex({p:[x+dx,y,z],n:[0,1,0],c:[.15,.18,.10]});vertex({p:[x+dx+.03,y+.25+hash(j,b)*.2,z-.07],n:[0,1,0],c:[.19,.21,.13]});vertex({p:[x+dx+.045,y,z],n:[0,1,0],c:[.15,.18,.10]});triangles++;}}
 cached={vertices:new Float32Array(values),count:values.length/12,triangles,leaves:0,feathers:0};return cached;
 }
 window.LensHighland={build,height,subject:[-180,290,-1130],camera:s=>({eye:[0,2.2,14+(s.keepSize?(s.focal/35-1)*40:0)],target:[-4.46,6.6,-26]})};
})();
