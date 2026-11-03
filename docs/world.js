/* Original procedural meshes. World coordinates and camera distances use metres. */
(() => {
  'use strict';
  const PI = Math.PI, TAU = 2 * PI;
  const add = (a,b) => a.map((v,i) => v+b[i]);
  const sub = (a,b) => a.map((v,i) => v-b[i]);
  const mul = (v,s) => v.map(x => x*s);
  const dot = (a,b) => a.reduce((s,v,i) => s+v*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm = v => mul(v,1/(Math.hypot(...v)||1));
  const mix = (a,b,t) => a.map((v,i) => v*(1-t)+b[i]*t);
  const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
  const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const colorCache = new Map();
  function color(hex){if(!colorCache.has(hex))colorCache.set(hex,[1,3,5].map(i=>Math.pow(parseInt(hex.slice(i,i+2),16)/255,2.2)));return colorCache.get(hex);}
  function rng(seed){return ()=>{seed|=0;seed=seed+0x6d2b79f5|0;let n=Math.imul(seed^seed>>>15,1|seed);n^=n+Math.imul(n^n>>>7,61|n);return ((n^n>>>14)>>>0)/4294967296;};}

  const M = {
    identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
    multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;},
    translation(x,y,z){const a=M.identity();a[12]=x;a[13]=y;a[14]=z;return a;},
    rotationY(t){const c=Math.cos(t),s=Math.sin(t);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);},
    rotationZ(t){const c=Math.cos(t),s=Math.sin(t);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);},
    rotationX(t){const c=Math.cos(t),s=Math.sin(t);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]);},
    scale(x,y,z){const a=M.identity();a[0]=x;a[5]=y;a[10]=z;return a;},
    point(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];},
    direction(m,p){return norm([m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]]);},
    lookAt(eye,at,up=[0,1,0]){const z=norm(sub(eye,at)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);},
    perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);},
    ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
  };
  const compose = (...matrices) => matrices.reduce((a,b)=>M.multiply(a,b),M.identity());

  class Mesh {
    constructor(){this.data=[];this.feathers=0;this.leaves=0;}
    vertex(p,n,c,uv,mat){this.data.push(...p,...n,...c,...uv,mat);}
    tri(a,b,c,n,col,uv=[[0,0],[1,0],[1,1]],mat=0){for(const [i,p] of [a,b,c].entries())this.vertex(p,n,typeof col==='function'?col(p):col,uv[i],mat);}
    quad(a,b,c,d,col,mat=0){const n=norm(cross(sub(b,a),sub(d,a)));this.tri(a,b,c,n,col,[[0,0],[1,0],[1,1]],mat);this.tri(a,c,d,n,col,[[0,0],[1,1],[0,1]],mat);}
    box(center,size,col,mat=0,angle=0){
      const [x,y,z]=size.map(v=>v/2),rot=M.rotationY(angle),point=p=>add(M.point(rot,p),center);
      const faces=[[[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]],[[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]],[[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]],[[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]],[[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],[[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]];
      for(const face of faces)this.quad(...face.map(point),col,mat);
    }
    ellipsoid(center,radii,col,mat=0,slices=24,rings=14,rotation=M.identity()){
      const at=(u,v)=>{const a=u*TAU,b=v*PI,local=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];const p=add(center,M.point(rotation,local.map((x,i)=>x*radii[i]))),n=M.direction(rotation,local.map((x,i)=>x/radii[i]));return {p,n,uv:[u,v]};};
      for(let i=0;i<slices;i++)for(let j=0;j<rings;j++){const a=at(i/slices,j/rings),b=at((i+1)/slices,j/rings),c=at((i+1)/slices,(j+1)/rings),d=at(i/slices,(j+1)/rings);for(const q of [a,b,c,a,c,d])this.vertex(q.p,q.n,typeof col==='function'?col(q.p,q.n):col,q.uv,mat);}
    }
    tube(a,b,r0,r1,col,mat=0,segments=10,capEnds=true){
      const direction=norm(sub(b,a)),length=Math.hypot(...sub(b,a)),u=norm(cross(direction,Math.abs(direction[1])>.9?[1,0,0]:[0,1,0])),v=cross(direction,u);
      const at=(s,t)=>{const radial=add(mul(u,Math.cos(t*TAU)),mul(v,Math.sin(t*TAU)));return {p:add(mix(a,b,s),mul(radial,r0+(r1-r0)*s)),n:norm(add(radial,mul(direction,(r0-r1)/length))),uv:[t,s]};};
      for(let i=0;i<segments;i++){const p=at(0,i/segments),q=at(1,i/segments),r=at(1,(i+1)/segments),s=at(0,(i+1)/segments);for(const item of [p,q,r,p,r,s])this.vertex(item.p,item.n,col,item.uv,mat);if(capEnds){this.tri(a,s.p,p.p,mul(direction,-1),col,undefined,mat);this.tri(b,q.p,r.p,direction,col,undefined,mat);}}
    }
    path(points,radii,col,mat=4,segments=12){for(let i=1;i<points.length;i++){this.tube(points[i-1],points[i],radii[i-1],radii[i],col,mat,segments,false);if(i<points.length-1)this.ellipsoid(points[i],[radii[i],radii[i],radii[i]],col,mat,12,8);}}
    lathe(center,profile,col,mat=2,segments=48){
      const source=profile,curve=[];
      for(let j=0;j<source.length-1;j++){
        const a=source[j],b=source[j+1],prev=source[Math.max(0,j-1)],next=source[Math.min(source.length-1,j+2)],dy=b[0]-a[0],slope=dy?(b[1]-a[1])/dy:0;
        const m0=(a[0]-prev[0])*dy>0?(b[1]-prev[1])/(b[0]-prev[0]):slope,m1=(next[0]-b[0])*dy>0?(next[1]-a[1])/(next[0]-a[0]):slope;
        const steps=Math.abs(dy)>.035?7:1;
        for(let k=0;k<steps;k++){const t=k/steps,t2=t*t,t3=t2*t,r=(2*t3-3*t2+1)*a[1]+(t3-2*t2+t)*m0*dy+(-2*t3+3*t2)*b[1]+(t3-t2)*m1*dy;curve.push([a[0]+dy*t,Math.max(0,r)]);}
      }
      curve.push(source.at(-1));profile=curve;
      for(let j=0;j<profile.length-1;j++){const [y0,r0]=profile[j],[y1,r1]=profile[j+1],dy=y1-y0,dr=r1-r0;
        const at=(y,r,u)=>({p:add(center,[r*Math.cos(u*TAU),y,r*Math.sin(u*TAU)]),n:norm([dy*Math.cos(u*TAU),-dr,dy*Math.sin(u*TAU)]),uv:[u,j/(profile.length-1)]});
        for(let i=0;i<segments;i++){const a=at(y0,r0,i/segments),b=at(y0,r0,(i+1)/segments),c=at(y1,r1,(i+1)/segments),d=at(y1,r1,i/segments);for(const q of [a,b,c,a,c,d])this.vertex(q.p,q.n,col,q.uv,mat);}
      }
    }
    blade(root,tip,width,normal,col,mat=3,segments=7){
      const direction=sub(tip,root),length=Math.hypot(...direction),side=norm(cross(direction,normal)),bend=mat===5?.0015:.006;
      const at=(u,v)=>{const w=Math.pow(Math.max(0,Math.sin(PI*u)),.7)*width*(1-.28*u),rib=(1-v*v)*Math.sin(PI*u)*bend;const p=add(add(mix(root,tip,u),mul(side,w*v)),mul(normal,rib+Math.sin(u*PI)*length*(mat===5?.006:.025)));return p;};
      for(let i=0;i<segments;i++)for(let j=0;j<4;j++){const u=i/segments,u1=(i+1)/segments,v=j/2-1,v1=(j+1)/2-1,a=at(u,v),b=at(u1,v),c=at(u1,v1),d=at(u,v1);const tuples=[[a,u,v],[b,u1,v],[c,u1,v1],[a,u,v],[c,u1,v1],[d,u,v1]];for(const [p,uu,vv] of tuples){const atU=clamp(uu,.0001,.9999),du=sub(at(Math.min(.99999,atU+.0001),vv),at(Math.max(.00001,atU-.0001),vv)),dv=sub(at(atU,vv+.001),at(atU,vv-.001)),n=norm(cross(du,dv));this.vertex(p,n,col,[(vv+1)/2,uu],mat);}}
      if(mat===5)this.feathers++;else this.leaves++;
    }
    finish(){return {vertices:new Float32Array(this.data),count:this.data.length/12,triangles:this.data.length/36,feathers:this.feathers,leaves:this.leaves};}
  }

  function twig(mesh,a,b,count,seed,leafColor=color('#66744d'),size=.21){
    const random=rng(seed),delta=sub(b,a);mesh.tube(a,b,.012,.003,color('#655239'),4,7);
    for(let i=0;i<count;i++){const u=.18+.80*(i/count),root=mix(a,b,u),side=i%2?1:-1,tip=add(root,[side*size*(.7+random()*.6),.04+random()*.08,(random()-.3)*size*.7]);mesh.blade(root,tip,size*.23,[.15,.5,1],mul(leafColor,.83+random()*.3),3,5);}
  }
  function tree(mesh,center,height,seed,leafCount=140){
    const random=rng(seed),[x,y,z]=center;
    mesh.path([[x,y,z],[x+.10,y+height*.43,z-.04],[x-.05,y+height*.74,z+.12],[x+.12,y+height,z]], [.16,.11,.065,.018],color('#6c6250'),4,12);
    for(let j=0;j<6;j++){const a=[x,y+height*(.5+random()*.35),z],b=[x+(random()-.5)*height*.6,y+height*(.8+random()*.2),z+(random()-.5)*height*.4];mesh.tube(a,b,.045,.008,color('#71624c'),4,8);}
    for(let j=0;j<leafCount;j++){const a=random()*TAU,r=Math.sqrt(random())*height*.36,root=[x+Math.cos(a)*r,y+height*.70+random()*height*.37,z+Math.sin(a)*r*.7],tip=add(root,[(random()-.5)*.43,.05+random()*.18,(random()-.5)*.3]);mesh.blade(root,tip,.035+random()*.035,[.2,1,.4],mix(color('#3e5435'),color('#91985c'),random()),3,3);}
  }
  function fern(mesh,root,scale,seed){
    const random=rng(seed);
    for(let j=0;j<8;j++){const angle=j*TAU/8,tip=add(root,[Math.cos(angle)*scale*.65,scale*(.55+random()*.45),Math.sin(angle)*scale*.5]);mesh.tube(root,tip,.012*scale,.002,color('#5e6940'),3,5);for(let i=1;i<11;i++){const u=i/12,a=mix(root,tip,u),w=Math.sin(PI*u)*scale*.26;for(const side of [-1,1]){const b=add(a,[Math.cos(angle+PI/2)*w*side,.04,Math.sin(angle+PI/2)*w*side]);mesh.blade(a,b,w*.19,[.15,.8,1],mix(color('#264c31'),color('#667840'),random()),3,3);}}}
  }
  function arch(mesh,cx,z,random){
    const cream=color('#c0af90'),width=1.16,height=1.75;
    for(const side of [-1,1])for(let j=0;j<6;j++)mesh.box([cx+side*1.40,(j+.5)*height/6,z],[.47,height/6-.012,.44],mul(cream,.94+random()*.1),0);
    for(let i=0;i<19;i++){
      const a=i*PI/19+.006,b=(i+1)*PI/19-.006;const at=(r,t,zz)=>[cx+r*Math.cos(t),height+r*Math.sin(t),z+zz];
      const inner=width,outer=1.65,c=mul(cream,.90+random()*.18);
      const af=at(inner,a,.22),bf=at(outer,a,.22),cf=at(outer,b,.22),df=at(inner,b,.22),ab=at(inner,a,-.22),bb=at(outer,a,-.22),cb=at(outer,b,-.22),db=at(inner,b,-.22);
      mesh.quad(af,bf,cf,df,c);mesh.quad(bb,ab,db,cb,c);mesh.quad(ab,af,df,db,c);mesh.quad(bf,bb,cb,cf,c);mesh.quad(ab,bb,bf,af,c);mesh.quad(df,cf,cb,db,c);
    }
    mesh.box([cx,3.6,z],[3.4,.5,.44],cream,0);
    for(const side of [-1,1])mesh.box([cx+side*1.4,1.78,z+.02],[.56,.11,.52],color('#d1bfa0'),0);
  }
  function garden(){
    const mesh=new Mesh(),random=rng(7193),wood=color('#8b6542'),stone=color('#b9aa8c');
    mesh.box([0,-.11,-2],[18,.2,24],color('#837d60'));
    for(let x=-7;x<7;x++)for(let z=-10;z<4;z++)mesh.box([x*.91,.005,z*.78],[.895,.05,.765],mul(stone,.90+random()*.15),0);
    for(const x of [-3.4,0,3.4])arch(mesh,x,-4.1,random);
    mesh.box([-5.75,1.9,-4.1],[1.35,3.8,.44],color('#b9a789'));mesh.box([5.75,1.9,-4.1],[1.35,3.8,.44],color('#b9a789'));
    mesh.box([0,1.8,-12.5],[19,3.6,.3],color('#b4b49a'));
    for(const [i,x] of [-5.0,-2.0,2.1,4.8].entries())tree(mesh,[x,.03,-7.0-(i%2)*1.7],4.5+i*.18,230+i,180);
    // Receding wooden pergola and hanging creepers create a second depth layer.
    for(const x of [-3.0,3.0])mesh.box([x,1.95,-2.4],[.14,3.9,.14],wood,1);
    for(let j=0;j<7;j++)mesh.box([0,3.78,-4+j*.56],[6.4,.1,.095],wood,1);
    for(let j=0;j<12;j++){const a=[-3+j*.52,3.72,-2.3-(j%3)*.43],b=add(a,[(random()-.5)*.4,-.5-random()*.65,.03]);twig(mesh,a,b,11,j+610,color('#667149'),.18);}
    for(const x of [-1.30,1.30])for(const z of [-.47,.47])mesh.box([x,.36,z],[.105,.72,.105],color('#725137'),1);
    for(let j=0;j<6;j++)mesh.box([0,.76,-.56+j*.225],[3.1,.1,.214],mul(wood,.90+j*.035),1);
    mesh.box([0,.61,.48],[2.8,.13,.06],color('#785337'),1);
    // Wheel-thrown terracotta, with a hollow neck and a detailed rim.
    mesh.lathe([-.61,.81,-.08],[[0,0],[.01,.23],[.06,.28],[.18,.36],[.36,.405],[.54,.38],[.70,.29],[.77,.17],[.82,.14],[1.00,.14],[1.025,.16],[1.05,.16],[1.05,.115],[1.00,.115],[.83,.115],[.78,.09]],color('#b46c42'),2,64);
    for(let j=0;j<6;j++){const a=[-.61,1.73,-.08],b=[-.95+j*.11,2.15+random()*.43,-.13+(random()-.5)*.28];twig(mesh,a,b,10,91+j,color('#748069'),.17);}
    // Linen weave, bent book pages, a small bottle and fruit bowl.
    for(let i=0;i<12;i++)for(let j=0;j<10;j++){
      const p=(u,v)=>[.2+u*.96,.840+.012*Math.sin(u*27+v*7)+.008*Math.sin(v*21),-.19+v*.94];
      mesh.quad(p(i/12,j/10),p((i+1)/12,j/10),p((i+1)/12,(j+1)/10),p(i/12,(j+1)/10),color('#b6ad94'),6);
    }
    mesh.box([.70,.852,-.24],[.66,.045,.44],color('#4d5c50'),1,-.12);
    for(let i=0;i<6;i++)mesh.box([.70,.88+i*.006,-.24],[.64,.004,.42],color('#d8cbb0'),0,-.12);
    mesh.box([.70,.925,-.24],[.67,.025,.445],color('#687362'),6,-.12);
    mesh.lathe([.96,.85,.39],[[0,0],[.02,.21],[.04,.30],[.12,.37],[.17,.39],[.18,.365],[.11,.33],[.05,.2],[.05,0]],color('#d4c7ab'),7,48);
    for(const [x,z,r] of [[.84,.34,.125],[1.09,.36,.13],[.94,.55,.12]]){mesh.ellipsoid([x,1.04,z],[r,r*.93,r],color('#dca247'),2,24,14);mesh.tube([x,1.15,z],[x+.005,1.19,z-.01],.014,.008,color('#68543b'),4,6);}
    mesh.lathe([.19,.82,-.35],[[0,0],[.015,.085],[.25,.085],[.30,.045],[.43,.035],[.44,.045],[.46,.04]],color('#648578'),7,32);
    for(const [x,z,seed] of [[-1.85,1.7,4],[1.85,1.6,9],[-2.05,-1.4,15],[2.4,-2.1,20]]){
      mesh.lathe([x,.03,z],[[0,0],[0,.20],[.35,.28],[.39,.30],[.43,.30],[.43,.255],[.38,.25],[.35,.22]],color('#986245'),2,32);
      fern(mesh,[x,.43,z],.73,seed);
    }
    for(let j=0;j<34;j++){const x=(random()-.5)*7,z=-1.4+random()*4;mesh.blade([x,.04,z],[x+.11,.05,z-.09],.03,[0,1,0],mix(color('#655d35'),color('#9a884e'),random()),3,3);}
    return mesh.finish();
  }
  function woodland(){
    const mobile=matchMedia('(max-width:760px)').matches;const mesh=new Mesh(),random=rng(8401),bark=color('#73634a');
    mesh.box([0,-.10,-3],[26,.2,30],color('#68704b'),0);
    mesh.path([[-2.05,0,-.36],[-2.12,1.3,-.37],[-1.87,2.6,-.55],[-2.07,4.5,-.68]],[.32,.27,.21,.1],bark,4,18);
    mesh.path([[-1.98,2.0,-.46],[-.91,2.85,-.66],[.95,3.2,-.80],[2.5,3.0,-1.1]],[.16,.095,.06,.02],bark,4,12);
    mesh.path([[-2.0,1.0,-.43],[-2.75,1.7,-.15],[-3.4,2.1,.3]],[.13,.07,.015],bark,4,12);
    for(let j=0;j<12;j++){const x=-10+j*1.8+(random()-.5)*1.2,z=-5-random()*9;tree(mesh,[x,.02,z],3.5+random()*2.7,700+j,mobile?55:110);}
    // Dense bushes at several real depths break up the open middle ground.
    for(let k=0;k<8;k++){
      const center=[-7+k*2.1+(random()-.5),.9+random()*.8,-4.8-random()*4];
      for(let j=0;j<(mobile?9:18);j++){const angle=random()*TAU,r=Math.sqrt(random())*1.25,root=add(center,[Math.cos(angle)*r,(random()-.5)*1.5,Math.sin(angle)*r*.7]),tip=add(root,[(random()-.5)*.7,.22+random()*.34,(random()-.5)*.45]);twig(mesh,root,tip,8,900+k*20+j,mix(color('#385232'),color('#819157'),random()),.24);}
    }
    // Backlit edge branches frame an open sight line to the bird.
    for(const [a,b,seed] of [ [[-3,3.1,2.2],[-1.4,2.4,2.5],211],[[3.1,.7,2.5],[1.55,1.5,2.2],212],[[-2.8,.4,1.8],[-1.7,.8,2],213]])twig(mesh,a,b,22,seed,color('#64794a'),.28);
    for(let j=0;j<24;j++){const y=.16+j*.14,x=-2.05+.10*Math.sin(y*2.1);mesh.path([[x-.20,y,-.12],[x-.19,y+.12,-.10],[x-.21,y+.20,-.13]],[.011,.016,.004],color('#514c39'),4,5);}
    // Individual leaves, not spherical canopy placeholders.
    for(let j=0;j<15;j++){const a=[-2.1+random()*5.2,2.75+random()*.7,-.7-random()*2.7],b=add(a,[(random()-.5)*.9,-.35-random()*.25,(random()-.5)*.3]);twig(mesh,a,b,14,120+j,mix(color('#456c40'),color('#a4aa58'),random()),.22);}
    for(const [x,z,scale,seed] of [[-1.7,1.4,1.25,12],[2.1,1.8,1.55,22],[-.7,2.8,.6,11],[2.6,-1.8,1.3,18],[-2.5,-1.8,.9,41]])fern(mesh,[x,.03,z],scale,seed);
    for(let j=0;j<125;j++){const x=(random()-.5)*14,z=(random()-.5)*15;mesh.blade([x,.03,z],[x+(random()-.5)*.2,.05,z+.15],.045,[0,1,.1],mix(color('#675030'),color('#a4944b'),random()),3,3);}
    // Moss patches and lichen on the main trunk are real small surfaces.
    for(let j=0;j<36;j++){const y=.3+random()*2.3,x=-1.85+random()*.12,z=-.16+random()*.1;mesh.ellipsoid([x,y,z],[.03+random()*.035,.025+random()*.04,.008],mix(color('#788251'),color('#9c9c6a'),random()),3,8,5);}
    return mesh.finish();
  }
  function birdParts(){
    const body=new Mesh(),head=new Mesh(),wing=new Mesh(),tail=new Mesh(),feet=new Mesh(),perch=new Mesh(),eye=new Mesh();
    const back=color('#766d51'),orange=color('#c47a43'),cream=color('#e0d7bd'),dark=color('#413e32'),feather=color('#635d48');
    const conform=(mesh,start,radii,rotation=M.identity())=>{const inverse=new Float32Array(rotation);inverse[1]=rotation[4];inverse[2]=rotation[8];inverse[4]=rotation[1];inverse[6]=rotation[9];inverse[8]=rotation[2];inverse[9]=rotation[6];for(let i=start;i<mesh.data.length;i+=12){let p=M.point(inverse,mesh.data.slice(i,i+3));const scale=1/Math.sqrt(p.reduce((s,v,k)=>s+(v/radii[k])**2,0));p=p.map(v=>v*scale);const n=norm(p.map((v,k)=>v/(radii[k]*radii[k]))),worldP=M.point(rotation,add(p,mul(n,.0003))),worldN=M.direction(rotation,n);for(let k=0;k<3;k++){mesh.data[i+k]=worldP[k];mesh.data[i+3+k]=worldN[k];}}};
    const bodyColor=(p,n)=>{const breast=smooth(-.1,.65,n[2])*smooth(-.45,.0,n[1]);return mix(mix(back,cream,smooth(.15,-.65,n[1])*.96),orange,breast*.97);};
    body.ellipsoid([0,0,0],[.225,.30,.245],bodyColor,5,64,40,M.rotationX(-.13));
    const bodyFeatherStart=body.data.length;
    // Overlapping breast feathers follow the curved chest surface.
    for(let row=0;row<7;row++)for(let j=0;j<11;j++){
      const theta=-1.10+j*.22+(row%2)*.055,y=.19-row*.057,x=Math.sin(theta)*.20,z=Math.cos(theta)*.235*Math.sqrt(Math.max(.1,1-y*y/.11));
      const c=mix(orange,cream,smooth(.02,-.24,y)*.72);body.blade([x,y,z],[x*.91,y-.105,z+.026],.030,[Math.sin(theta)*.4,.15,1],mul(c,.95+(j%3)*.025),5,5);
    }
    conform(body,bodyFeatherStart,[.225,.30,.245],M.rotationX(-.13));
    const backStart=body.data.length;
    for(let row=0;row<8;row++)for(let j=0;j<18;j++){const a=j/18*TAU,y=.23-row*.062,rr=Math.sqrt(Math.max(.05,1-y*y/.09));const x=Math.sin(a)*.225*rr,z=Math.cos(a)*.245*rr;if(z>.12)continue;body.blade([x,y,z],[x*.94,y-.075,z*1.02],.018,[Math.sin(a),.15,Math.cos(a)],mix(back,cream,.08+(j%3)*.025),5,4);}
    conform(body,backStart,[.225,.30,.245],M.rotationX(-.13));
    const headColor=(p,n)=>mix(back,orange,smooth(.04,.65,n[2])*smooth(.8,.1,n[1]));
    head.ellipsoid([0,0,0],[.168,.165,.169],headColor,5,64,40);
    // Cheek down and eyebrow stripes break up the silhouette around the eye.
    for(const side of [-1,1]){

      head.ellipsoid([side*.148,.034,.068],[.023,.024,.018],color('#9c8d71'),5,24,16);
      head.blade([side*.145,.062,.075],[side*.157,.052,.035],.005,[side*.5,.4,1],color('#aaa28a'),5,5);
    }
    eye.ellipsoid([0,0,0],[.020,.021,.017],color('#121513'),8,28,20);
    eye.ellipsoid([.010,.008,.012],[.0045,.005,.004],color('#fff7e5'),8,12,8);
    // A pointed upper and lower mandible, rather than an attached sphere.
    head.tube([0,-.025,.145],[.008,-.043,.274],.031,.003,color('#53533e'),8,18);
    head.tube([0,-.052,.151],[.008,-.047,.259],.021,.002,color('#696246'),8,16);
    const headFeatherStart=head.data.length;
    for(let row=0;row<3;row++)for(let i=0;i<9;i++){const a=(i/8-.5)*2.0;head.blade([Math.sin(a)*.14,.11-row*.025,Math.cos(a)*.13],[Math.sin(a)*.15,.07-row*.025,Math.cos(a)*.15],.016,[Math.sin(a)*.5,.7,Math.cos(a)],mix(back,color('#969375'),.35),5,3);}
    conform(head,headFeatherStart,[.168,.165,.169]);
    for(let i=headFeatherStart;i<head.data.length;i+=12){const c=headColor(head.data.slice(i,i+3),head.data.slice(i+3,i+6));for(let k=0;k<3;k++)head.data[i+6+k]=c[k]*1.025;}
    for(let i=bodyFeatherStart;i<body.data.length;i+=12){const c=bodyColor(body.data.slice(i,i+3),body.data.slice(i+3,i+6));for(let k=0;k<3;k++)body.data[i+6+k]=c[k]*1.025;}
    // One reusable articulated wing: primaries, secondaries and layered coverts.
    wing.ellipsoid([.14,-.015,-.04],[.19,.07,.15],feather,5,20,12);
    for(let j=0;j<11;j++){
      const u=j/10,root=[.20+u*.23,-.015,-.025-u*.075],tip=[.43+u*.30,-.018-u*.025,-.39+u*.24];
      wing.blade(root,tip,.038,[0,1,.5],mix(dark,color('#83907b'),u*.45),5,9);
    }
    for(let j=0;j<8;j++){const u=j/7;wing.blade([.07+u*.27,.002,-.03],[.13+u*.28,-.018,-.33],.040,[0,1,.6],mix(back,color('#87927a'),.22+u*.1),5,7);}
    for(let row=0;row<3;row++)for(let j=0;j<8;j++){const u=j/7;wing.blade([.03+u*.35,.048-row*.012,.055-row*.047],[.10+u*.35,.043-row*.012,-.065-row*.047],.027,[0,1,.6],mix(back,cream,row===1?.35:.12),5,5);}
    for(let j=0;j<7;j++){const u=(j-3)/3;tail.blade([u*.055,-.16,-.15],[u*.135,-.38-Math.abs(u)*.025,-.65+Math.abs(u)*.06],.037,[0,.7,1],mix(dark,color('#8a947e'),(j%2)*.18),5,10);}
    for(const side of [-1,1]){
      const x=side*.105,leg=color('#8d7456');feet.tube([x,-.22,.04],[x,-.36,.06],.015,.011,leg,4,8);feet.tube([x,-.36,.06],[x,-.426,.105],.011,.009,leg,4,8);
      for(let toe=0;toe<3;toe++){const dx=(toe-1)*.032;feet.path([[x,-.426,.105],[x+dx,-.423,.17],[x+dx*1.25,-.455,.19]],[.008,.006,.003],leg,4,6);feet.tube([x+dx*1.25,-.455,.19],[x+dx*1.25,-.47,.175],.004,.001,color('#343a2e'),8,5);}
      feet.path([[x,-.422,.08],[x,-.41,-.035],[x,-.44,-.065]],[.008,.006,.002],leg,4,6);
    }
    perch.path([[-2.18,.96,-.36],[-1.35,.96,-.12],[-.35,1.005,.08],[.68,1.06,.13],[1.92,1.18,.00],[2.65,1.40,-.12]],[.13,.105,.078,.063,.041,.012],color('#796647'),4,18);
    perch.path([[.70,1.06,.13],[1.1,1.55,.01],[1.72,1.88,-.08]],[.045,.025,.007],color('#806e4e'),4,10);
    twig(perch,[1.32,1.66,-.03],[1.85,2.07,-.03],8,45,color('#7d9453'),.18);
    twig(perch,[-1.4,.98,-.12],[-1.0,1.50,-.06],7,46,color('#738b49'),.17);
    for(let j=0;j<28;j++){const x=-1.5+j*.11,y=1.045+(x+.35)*.052;perch.blade([x,y,.095],[x+.07,y+.012,.10],.016,[0,1,.3],mix(color('#566b32'),color('#a2a16a'),(j%4)/4),3,3);}
    return {eye:eye.finish(),body:body.finish(),head:head.finish(),wing:wing.finish(),tail:tail.finish(),feet:feet.finish(),perch:perch.finish()};
  }

  function birdPose(time){
    if(window.LensAssets?.motion)return LensAssets.pose(time);
    const cycle=((time%20)+20)%20;let flutter=0,local=0;
    if(cycle>=3&&cycle<=5.6){local=cycle-3;flutter=smooth(0,.35,local)*(1-smooth(2.20,2.6,local));}
    else if(cycle>=13.1&&cycle<=15.35){local=cycle-13.1;flutter=smooth(0,.30,local)*(1-smooth(1.9,2.25,local));}
    const wave=Math.sin(local*TAU*1.32+.12*Math.sin(local*TAU*1.32)),wingAngle=-1.32*(1-flutter)+flutter*(.18+wave*.98);
    const headYaw=.18*Math.sin(time*.61)+.10*Math.sin(time*1.71)*Math.pow(Math.max(0,Math.sin(time*.24)),6);
    const blinkPhase=((time%6.7)+6.7)%6.7,blink=Math.max(0,1-Math.abs(blinkPhase-2.15)/.105);
    return {blink,flutter,wingAngle,headYaw,headTilt:.055*Math.sin(time*.73),breath:.004*Math.sin(time*2.1),perchDeflection:flutter*.004*Math.sin(local*TAU*1.32),resting:flutter<.02,cycle};
  }
  let cached=null;
  function build(){if(!cached){const g=garden(),forest=woodland(),bird=window.LensAssets?.bird||birdParts();cached={garden:g,forest,bird,counts:{gardenTriangles:g.triangles,forestTriangles:forest.triangles,leaves:g.leaves+forest.leaves+bird.perch.leaves,feathers:LensAssets.bird?129:bird.body.feathers+bird.head.feathers+bird.wing.feathers*2+bird.tail.feathers}};}return cached;}
  window.LensWorld={build,birdPose,M,compose};
})();
