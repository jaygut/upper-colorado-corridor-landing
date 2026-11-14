/* Graph of Life brand v1.0.0. Keystone stage: one geographic canvas whose camera and layers are a pure function of scroll position.
   Vector geometry is always drawn. Imagery appears only inside the geometry that currently has evidence support. */
(function(){'use strict';
const css=getComputedStyle(document.documentElement),tok=n=>css.getPropertyValue('--gol-'+n).trim();
const C={abyss:tok('abyss'),navy:tok('navy'),teal:tok('teal'),green:tok('green'),coral:tok('coral'),amber:tok('amber'),sand:tok('sand'),paper:tok('paper'),muted:tok('muted'),hairline:tok('hairline')};
const A={edge:parseFloat(tok('ambient-edge-opacity'))||.14,node:parseFloat(tok('ambient-node-opacity'))||.22,div:parseFloat(tok('divider-opacity'))||.55};
const MONO=tok('mono'),SANS=tok('sans');
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const RAMP=[rgb(C.navy),rgb(C.teal),rgb(C.green)];
function ramp(t){t=Math.max(0,Math.min(1,t));const s=t*2,i=Math.min(1,Math.floor(s)),f=s-i,a=RAMP[i],b=RAMP[i+1];return'rgb('+a.map((v,k)=>Math.round(v+(b[k]-v)*f)).join(',')+')';}
const merc=p=>{const a=p[1]*Math.PI/180;return[(p[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+a/2))/Math.PI)/2];};
const inv=p=>[p[0]*360-180,Math.atan(Math.sinh(Math.PI*(1-2*p[1])))*180/Math.PI];
const EAGLE=[-106.37816031844216,39.47973419683995],GRAND=[-105.735,40.262];
const STATIONS=[{id:'401530105475401',name:'North Inlet',p:[-105.799722,40.2575]},{id:'09013500',name:'East Inlet',p:[-105.797778,40.236389]},{id:'09071750',name:'Colorado River above Glenwood Springs',short:'Glenwood',p:[-107.2908874,39.5588711]}];
function km(a,b){const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r,h=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2;return 12742*Math.asin(Math.sqrt(h));}

const stage=document.getElementById('stage'),canvas=document.getElementById('geo'),ctx=canvas.getContext('2d'),mapHost=document.getElementById('imagery');
const S={forageM:600,sampling:{birds:true,soil:true,poll:true},flowPaths:null,samplingPts:null,W:0,H:0,dpr:1,cam:null,L:{},imagery:'pending',imageryWanted:new URLSearchParams(location.search).get('svg')!=='1',lens:'canopy',hoverCell:-1,pinCell:-1,fire:true,data:{},errors:[]};
const off=document.createElement('canvas');let frame=0,parcelRing=null,parcelM=null;
const embedded=document.getElementById('embedded-parcel');
if(embedded){try{parcelRing=JSON.parse(embedded.textContent).features[0].geometry.coordinates[0];parcelM=parcelRing.map(merc);}catch(e){S.errors.push('embedded parcel unreadable');}}

/* ---------- camera ---------- */
const mpp=(z,lat)=>78271.517*Math.cos(lat*Math.PI/180)/Math.pow(2,z); // metres per CSS pixel, 512 px world
function fitZoom(extentM,px,lat){return Math.log2(78271.517*Math.cos(lat*Math.PI/180)*px/extentM);}
function specs(){const W=S.W,H=S.H,m=W<760,ax=m?.5:.68,ay=m?.5:.5,box=Math.min(H*(m?.8:.62),W*(m?.86:.5));
  const eagle=(ext,pitch,bearing,extra)=>Object.assign({focus:EAGLE,z:fitZoom(ext,box,EAGLE[1]),anchor:[ax,ay],pitch,bearing},extra);
  const none={rivers:0,cells:0,ring500:0,ring1k:0,nwi:0,padus:0,stations:0,basins:0,fire:0,transit:0,reveal:0,revealBasins:0,dim:0,parcelLabel:0,frame:0,flow:0,sampling:0,forage:0};
  const L=o=>Object.assign({},none,o);
  return{
    object:eagle(560,0,0,{L:L({reveal:0})}),
    cells:eagle(470,0,0,{L:L({cells:1,reveal:0})}),
    context500:eagle(1750,52,-24,{L:L({ring500:1,nwi:1,padus:1,reveal:500,parcelLabel:1})}),
    ring1k:eagle(3000,58,18,{L:L({ring500:A.node,ring1k:1,nwi:A.div,reveal:1000,parcelLabel:1})}),
    frame:eagle(4300,62,52,{L:L({ring1k:A.div,reveal:1000,frame:1,parcelLabel:1})}),
    sampling:eagle(760,36,-42,{L:L({reveal:60,sampling:1})}),
    soilcam:eagle(520,66,150,{anchor:[m?.5:.8,m?.45:.42],L:L({reveal:20,dim:1})}),
    forage:eagle(m?5200:6600,48,12,{L:L({reveal:1500,forage:1,parcelLabel:1})}),
    flow:{focus:[-106.43,39.545],z:fitZoom(m?17000:24000,m?W*.95:Math.min(W*.6,H),39.55),anchor:[m?.5:.66,m?.55:.56],pitch:62,bearing:-24,L:L({rivers:A.div,flow:1,reveal:1000,ring1k:A.node,parcelLabel:1})},
    river:{focus:[-106.43,39.52],z:m?10.2:11.3,anchor:[m?.5:.64,.46],pitch:56,bearing:-28,L:L({rivers:1,flow:A.div,ring1k:A.div,reveal:1000,parcelLabel:1})},
    transit:{focus:[-106.52,39.86],z:fitZoom(m?190000:230000,m?W*.94:W*.62,39.8),anchor:[m?.5:.64,.5],pitch:0,bearing:0,L:L({rivers:A.div,stations:1,transit:1,basins:A.div,parcelLabel:1})},
    grandlake:{focus:GRAND,z:fitZoom(21000,m?W*.98:Math.min(W*.58,H*1.05),40.26),anchor:[m?.5:.68,m?.52:.5],pitch:48,bearing:24,L:L({stations:1,basins:1,fire:1,revealBasins:1})},
    grandlakeDim:{focus:GRAND,z:fitZoom(21000,m?W*.98:Math.min(W*.58,H*1.05),40.26),anchor:[m?.5:.68,m?.52:.5],pitch:48,bearing:40,L:L({stations:A.div,basins:A.div,fire:A.div,revealBasins:1,dim:1})},
    glenwoodDim:{focus:STATIONS[2].p,z:m?9.6:10.4,anchor:[m?.5:.68,.5],pitch:48,bearing:-20,L:L({stations:A.div,rivers:A.div,dim:1})},
    back:eagle(1300,60,-140,{L:L({reveal:250})}),
    backDim:eagle(1700,56,-70,{anchor:[m?.5:.78,.5],L:L({reveal:500,ring500:A.div})})};}
function resolve(spec){const s=512*Math.pow(2,spec.z),f=merc(spec.focus);return{c:[f[0]-(spec.anchor[0]-.5)*S.W/s,f[1]-(spec.anchor[1]-.5)*S.H/s],z:spec.z,L:spec.L,f,pitch:spec.pitch||0,bearing:spec.bearing||0,anchor:spec.anchor};}
function blend(a,b,t){if(t<=0)return a;if(t>=1)return b;const z=a.z+(b.z-a.z)*t,w0=Math.pow(2,-a.z),w1=Math.pow(2,-b.z),w=Math.pow(2,-z),u=Math.abs(w1-w0)<1e-12?t:(w-w0)/(w1-w0),L={};
  for(const k in a.L){let va=a.L[k],vb=b.L[k];if(k==='reveal'){// buffer radius in metres: interpolate in screen pixels so the ring grows steadily
      L[k]=va+(vb-va)*t;}else L[k]=va+(vb-va)*t;}
  const mix=(x,y,k)=>x+(y-x)*k;let db=b.bearing-a.bearing;if(db>180)db-=360;if(db<-180)db+=360;
  return{c:[mix(a.c[0],b.c[0],u),mix(a.c[1],b.c[1],u)],z,L,f:[mix(a.f[0],b.f[0],u),mix(a.f[1],b.f[1],u)],pitch:mix(a.pitch,b.pitch,t),bearing:a.bearing+db*t,anchor:[mix(a.anchor[0],b.anchor[0],t),mix(a.anchor[1],b.anchor[1],t)]};}
function setCamera(nameA,nameB,t){const sp=specs(),a=resolve(sp[nameA]||sp.object),b=resolve(sp[nameB]||sp[nameA]||sp.object);S.cam=blend(a,b,t);S.L=S.cam.L;S.camNames=[nameA,nameB,t];
  const ax=S.cam.anchor[0],ay=S.cam.anchor[1],pad=v=>Math.max(0,Math.round(v));S.view={center:inv(S.cam.f),zoom:S.cam.z,pitch:S.cam.pitch,bearing:S.cam.bearing,padding:{left:pad((2*ax-1)*S.W),right:pad((1-2*ax)*S.W),top:pad((2*ay-1)*S.H),bottom:pad((1-2*ay)*S.H)}};
  invalidate();}
const scale=()=>512*Math.pow(2,S.cam.z);
function P(p){const v=merc(p),s=scale();return[(v[0]-S.cam.c[0])*s+S.W/2,(v[1]-S.cam.c[1])*s+S.H/2];}
function PM(v){const s=scale();return[(v[0]-S.cam.c[0])*s+S.W/2,(v[1]-S.cam.c[1])*s+S.H/2];}

/* ---------- geometry preparation: project to mercator once ---------- */
function prepRing(r){return r.map(merc);}
function prepGeom(g){if(!g)return[];if(g.type==='Polygon')return g.coordinates.map(prepRing);if(g.type==='MultiPolygon')return g.coordinates.flat().map(prepRing);if(g.type==='LineString')return[prepRing(g.coordinates)];if(g.type==='MultiLineString')return g.coordinates.map(prepRing);return[];}
function trace(ringM,close){let first=true;for(const v of ringM){const q=PM(v);if(first){ctx.moveTo(q[0],q[1]);first=false;}else ctx.lineTo(q[0],q[1]);}if(close)ctx.closePath();}
function bboxVisible(ringM){let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;for(const v of ringM){const q=PM(v);if(q[0]<minx)minx=q[0];if(q[0]>maxx)maxx=q[0];if(q[1]<miny)miny=q[1];if(q[1]>maxy)maxy=q[1];}return maxx>-40&&minx<S.W+40&&maxy>-40&&miny<S.H+40;}

/* ---------- data ---------- */
function provide(key,value){S.data[key]=value;
  if(key==='eagle'){value.cellsM=value.cells.map(c=>({v:c.v,m:prepRing(c.r)}));value.landM=value.landcover.map(c=>({code:c.code,m:prepRing(c.r)}));value.nwiM=value.inventory.nwi.rings.map(prepRing);value.padM=value.inventory.padus.rings.map(prepRing);const vs=value.cells.map(c=>c.v);value.vmin=Math.min(...vs);value.vmax=Math.max(...vs);if(!parcelM){parcelRing=value.candidate.ring;parcelM=parcelRing.map(merc);}}
  if(key==='rivers'){value.m=value.streams.map(s=>({n:s.n,o:s.o,m:prepRing(s.p)}));}
  if(key==='basins'){value.m=value.features.map(f=>({id:f.properties,m:prepGeom(f.geometry)}));}
  if(key==='burn'){value.m=value.features.flatMap(f=>prepGeom(f.geometry));}
  if(key==='networks'){value.m=value.flatMap(n=>n.features.flatMap(f=>prepGeom(f.geometry)));}
  if(window.KS&&KS.gl)KS.gl.addData(key);invalidate();}

/* ---------- drawing ---------- */
function text(str,x,y,o={}){ctx.font=(o.weight||500)+' '+(o.size||12)+'px '+(o.sans?SANS:MONO);ctx.textAlign=o.align||'left';ctx.textBaseline=o.base||'alphabetic';const w=ctx.measureText(str).width;if(o.align!=='center'&&o.align!=='right')x=Math.max(8,Math.min(S.W-w-8,x));ctx.lineWidth=4;ctx.strokeStyle=C.abyss;ctx.lineJoin='round';ctx.strokeText(str,x,y);ctx.fillStyle=o.color||C.paper;ctx.fillText(str,x,y);return w;}
function leader(a,b,color){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=color||C.paper;ctx.lineWidth=1;ctx.stroke();}
function draw(){frame=0;if(!S.cam||!S.W)return;const L=S.L,W=S.W,H=S.H;ctx.setTransform(S.dpr,0,0,S.dpr,0,0);ctx.clearRect(0,0,W,H);ctx.globalAlpha=1;if(S.imagery==='ready'){S.drawn=(S.drawn||0)+1;return;}
  const E=S.data.eagle,px=1/mpp(S.cam.z,EAGLE[1]);
  /* 1. Ground and imagery mask. Imagery shows only inside current evidence support. */
  ctx.fillStyle=C.abyss;ctx.fillRect(0,0,W,H);
  const img=false;
  if(img&&parcelM&&L.revealBasins<1){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=1-L.revealBasins;ctx.beginPath();trace(parcelM,true);ctx.fill();if(L.reveal>0){ctx.lineJoin='round';ctx.lineWidth=2*L.reveal*px;ctx.strokeStyle=C.abyss;ctx.stroke();}ctx.restore();}
  if(img&&L.revealBasins>0&&S.data.basins){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=L.revealBasins;ctx.beginPath();S.data.basins.m.forEach(b=>b.m.forEach(r=>trace(r,true)));ctx.fill();ctx.restore();}
  if(L.dim>0){ctx.save();ctx.globalAlpha=L.dim;ctx.fillStyle=C.abyss;ctx.fillRect(0,0,W,H);ctx.restore();}
  const fade=L.dim>0?1-L.dim*(1-A.node):1;
  /* 2. Rivers: cartographic context */
  if(L.rivers>0&&S.data.rivers){ctx.save();ctx.globalAlpha=L.rivers*fade;ctx.strokeStyle=C.teal;ctx.lineJoin='round';for(const r of S.data.rivers.m){if(!bboxVisible(r.m))continue;ctx.lineWidth=r.o>=6?1.6:1;ctx.beginPath();trace(r.m,false);ctx.stroke();}ctx.restore();}
  /* 3. Grand Lake: basins, reaches, fire overlap */
  if(L.fire>0&&S.fire&&S.data.burn){ctx.save();ctx.globalAlpha=L.fire*A.node;ctx.fillStyle=C.coral;ctx.beginPath();S.data.burn.m.forEach(r=>trace(r,true));ctx.fill();ctx.globalAlpha=L.fire;ctx.strokeStyle=C.coral;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
  if(L.basins>0&&S.data.networks){ctx.save();ctx.globalAlpha=L.basins*fade;ctx.strokeStyle=C.teal;ctx.lineWidth=1;ctx.beginPath();S.data.networks.m.forEach(r=>trace(r,false));ctx.stroke();ctx.restore();}
  if(L.basins>0&&S.data.basins){ctx.save();ctx.globalAlpha=L.basins*fade;ctx.strokeStyle=C.sand;ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();S.data.basins.m.forEach(b=>b.m.forEach(r=>trace(r,true)));ctx.stroke();ctx.restore();}
  /* 4. Eagle inventories and rings */
  if(E&&L.padus>0){ctx.save();ctx.globalAlpha=L.padus*A.edge;ctx.fillStyle=C.sand;ctx.beginPath();E.padM.forEach(r=>trace(r,true));ctx.fill();ctx.restore();}
  if(E&&L.nwi>0){ctx.save();ctx.globalAlpha=L.nwi*A.div;ctx.fillStyle=C.teal;ctx.beginPath();E.nwiM.forEach(r=>trace(r,true));ctx.fill();ctx.globalAlpha=L.nwi;ctx.strokeStyle=C.teal;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
  function ring(m,alpha,label){if(!parcelM||alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';
    /* buffered outline: stroke a wide transparent line and draw its edge with two offset passes */
    const r=m*px;if(off.width!==canvas.width||off.height!==canvas.height){off.width=canvas.width;off.height=canvas.height;}const o=off.getContext('2d');o.setTransform(1,0,0,1,0,0);o.globalCompositeOperation='source-over';o.clearRect(0,0,off.width,off.height);o.setTransform(S.dpr,0,0,S.dpr,0,0);o.lineJoin='round';o.beginPath();
    let first=true;for(const v of parcelM){const q=PM(v);if(first){o.moveTo(q[0],q[1]);first=false;}else o.lineTo(q[0],q[1]);}o.closePath();o.strokeStyle=C.sand;o.lineWidth=2*r+1.5;o.stroke();o.fillStyle=C.sand;o.fill();o.globalCompositeOperation='destination-out';o.lineWidth=2*r-1.5;o.stroke();o.fill();
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(off,0,0);ctx.setTransform(S.dpr,0,0,S.dpr,0,0);
    if(label){const top=parcelM.reduce((a,v)=>{const q=PM(v);return q[1]<a[1]?q:a;},[0,1e9]);text(label,top[0],top[1]-r-10,{align:'center',color:C.sand,size:11});}
    ctx.restore();}
  if(L.forage>0){ring(600,L.forage*A.div,'');ring(1500,L.forage*A.div,'');if(S.forageM)ring(S.forageM,L.forage,(S.forageM/1000).toFixed(2)+' km');}
  if(L.ring500>0)ring(500,L.ring500,L.ring500>.6?'500 m context':'');
  if(L.ring1k>0)ring(1000,L.ring1k,L.ring1k>.6&&L.rivers<.5?'1 km neighbourhood':'');
  /* 5. Structure lens: clipped 30 m cells */
  if(E&&L.cells>0){ctx.save();ctx.globalAlpha=L.cells;const list=S.lens==='landcover'?E.landM:S.lens==='canopy'?E.cellsM:[];
    list.forEach((c,i)=>{ctx.beginPath();trace(c.m,true);ctx.fillStyle=S.lens==='landcover'?(c.code===42?ramp(.5):c.code===41?ramp(1):C.sand):ramp((c.v-E.vmin)/(E.vmax-E.vmin));ctx.fill();ctx.strokeStyle=C.abyss;ctx.lineWidth=1;ctx.stroke();});
    const k=S.pinCell>=0?S.pinCell:S.hoverCell;if(S.lens==='canopy'&&k>=0&&E.cellsM[k]){ctx.beginPath();trace(E.cellsM[k].m,true);ctx.strokeStyle=C.paper;ctx.lineWidth=2;ctx.stroke();}
    ctx.restore();}
  /* 6. The parcel: always present, always coral */
  if(parcelM){ctx.save();const tiny=px*470<26;ctx.beginPath();trace(parcelM,true);ctx.strokeStyle=C.coral;ctx.lineWidth=2;ctx.lineJoin='miter';ctx.stroke();
    if(tiny){const c=P(EAGLE);ctx.beginPath();ctx.arc(c[0],c[1],4,0,7);ctx.fillStyle=C.coral;ctx.fill();}
    if(L.parcelLabel>.5&&(L.rivers>.5||L.transit>.5)){const c=P(EAGLE);leader(c,[c[0]+18,c[1]-18],C.paper);text('Eagle candidate',c[0]+22,c[1]-22,{size:12});}
    ctx.restore();}
  /* 7. Named river labels at river scale */
  if(L.rivers>.8&&L.transit<.2&&S.data.rivers){const want=['Eagle River','Homestake Creek','Gore Creek'];for(const n of want){const r=S.data.rivers.m.filter(x=>x.n===n);let best=null;for(const x of r)for(const v of x.m){const q=PM(v);if(q[0]>W*.3&&q[0]<W*.94&&q[1]>70&&q[1]<H-90){const d=Math.abs(q[0]-W*.6)+Math.abs(q[1]-H*.4);if(!best||d<best.d)best={q,d};}}if(best)text(n,best.q[0]+8,best.q[1]-8,{size:11,color:C.teal});}}
  /* 8. Stations and the separate-case signal */
  if(L.stations>0){ctx.save();ctx.globalAlpha=Math.min(1,L.stations)*fade;const c0=P(EAGLE);
    for(const s of STATIONS){const q=P(s.p);if(q[0]<-20||q[0]>W+20||q[1]<-20||q[1]>H+20)continue;
      if(L.transit>0){ctx.save();ctx.globalAlpha=L.transit*A.div;ctx.setLineDash([2,6]);leader(c0,q,C.sand);ctx.restore();}
      ctx.beginPath();ctx.arc(q[0],q[1],5,0,7);ctx.fillStyle=C.green;ctx.fill();ctx.strokeStyle=C.abyss;ctx.lineWidth=2;ctx.stroke();
      if(L.transit>.5){const d=Math.round(km(EAGLE,s.p));if(s.id==='09013500')continue;const lab=s.id==='401530105475401'?'North and East Inlet':'Glenwood';const right=q[0]>c0[0];text(lab,q[0]+(right?-10:10),q[1]-14,{align:right?'right':'left',size:12});text(d+' km in a straight line',q[0]+(right?-10:10),q[1]+22,{align:right?'right':'left',size:11,color:C.sand});}
      else if(L.dim<.5){const north=s.id==='401530105475401';if(s.id!=='09071750')text(s.name,q[0]+10,q[1]+(north?-10:18),{size:12});}}
    if(L.transit>.5){const mid=P([(EAGLE[0]+STATIONS[0].p[0])/2,(EAGLE[1]+STATIONS[0].p[1])/2]);text('no delivery link',mid[0]+10,mid[1]+4,{size:11,color:C.sand});}
    ctx.restore();}
  if(L.flow>0&&S.flowPaths){ctx.save();ctx.globalAlpha=L.flow;ctx.lineJoin='round';S.flowPaths.forEach((c,k)=>{if(!c)return;ctx.beginPath();trace(c.map(merc),false);ctx.strokeStyle=k?C.paper:C.green;ctx.lineWidth=k?2:3;ctx.stroke();});ctx.restore();}
  if(L.sampling>0&&S.samplingPts){ctx.save();ctx.globalAlpha=L.sampling;for(const f of S.samplingPts){if(S.sampling[f.kind]===false)continue;const q=P(f.p);ctx.beginPath();ctx.arc(q[0],q[1],f.kind==='soil'?5:8,0,7);ctx.fillStyle=C.abyss;ctx.fill();ctx.strokeStyle=f.kind==='birds'?C.teal:f.kind==='soil'?C.sand:C.paper;ctx.lineWidth=2;ctx.stroke();}ctx.restore();}
  if(L.frame>.6){text('no measurement in the reviewed record',P(EAGLE)[0],S.H-(S.W<760?16:96),{align:'center',size:11,color:C.sand});}
  S.drawn=(S.drawn||0)+1;}
function invalidate(){if(window.KS&&KS.gl&&KS.gl.active())KS.gl.apply();if(!frame)frame=requestAnimationFrame(draw);}

/* ---------- interaction: read a canopy cell ---------- */
function inside(pt,ringM){let c=false;for(let i=0,j=ringM.length-1;i<ringM.length;j=i++){const a=PM(ringM[i]),b=PM(ringM[j]);if((a[1]>pt[1])!==(b[1]>pt[1])&&pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function cellAt(x,y){if(KS.gl&&KS.gl.active()&&S.imagery==='ready')return KS.gl.cellAt(x,y);const E=S.data.eagle;if(!E||S.L.cells<.6||S.lens!=='canopy')return-1;for(let i=0;i<E.cellsM.length;i++)if(inside([x,y],E.cellsM[i].m))return i;return-1;}
function pointer(e,pin){const r=stage.getBoundingClientRect(),k=cellAt(e.clientX-r.left,e.clientY-r.top);if(pin){S.pinCell=k;}else if(k===S.hoverCell)return;S.hoverCell=k;invalidate();document.dispatchEvent(new CustomEvent('ks:cell',{detail:{index:S.pinCell>=0?S.pinCell:k}}));}
stage.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')pointer(e,false);});stage.addEventListener('click',e=>pointer(e,true));stage.addEventListener('pointerleave',()=>{S.hoverCell=-1;invalidate();document.dispatchEvent(new CustomEvent('ks:cell',{detail:{index:S.pinCell}}));});

/* ---------- imagery: progressive, optional, never required ---------- */
function setImagery(state,why){S.imagery=state;if(why)S.errors.push(why);document.body.dataset.imagery=state;document.dispatchEvent(new CustomEvent('ks:imagery',{detail:{state,why}}));invalidate();}
function startMap(){if(S.imageryWanted&&window.maplibregl&&KS.gl){S.parcelRing=parcelRing;KS.gl.start();}}
function toggleImagery(on){S.imageryWanted=on;if(!on){if(KS.gl)KS.gl.stop('Imagery switched off');else setImagery('off','Imagery switched off');}else{S.imagery='pending';document.body.dataset.imagery='pending';if(window.maplibregl)startMap();else{libraryRequested=false;loadLibrary();}}}
let libraryRequested=false;
function loadLibrary(){if(libraryRequested||!S.imageryWanted)return;libraryRequested=true;const l=document.createElement('link');l.rel='stylesheet';l.href='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';document.head.append(l);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';s.async=true;s.onload=()=>startMap();s.crossOrigin='anonymous';s.onerror=()=>setImagery('off','Map library unavailable');document.head.append(s);setTimeout(()=>{if(!window.maplibregl&&S.imagery==='pending')setImagery('off','Map library timed out');},12000);}

function resize(){const r=stage.getBoundingClientRect();S.W=Math.round(r.width);S.H=Math.round(r.height);S.dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(S.W*S.dpr);canvas.height=Math.round(S.H*S.dpr);if(window.KS&&KS.gl)KS.gl.resize();if(S.camNames)setCamera(...S.camNames);}
document.body.dataset.imagery=S.imageryWanted?'pending':'off';if(!S.imageryWanted)S.imagery='off';
function unproject(x,y){const s=scale();return inv([(x-S.W/2)/s+S.cam.c[0],(y-S.H/2)/s+S.cam.c[1]]);}
window.KS={unproject,parcel:()=>parcelRing,S,C,A,ramp,setCamera,provide,invalidate,resize,loadLibrary,toggleImagery,setImagery,STATIONS,EAGLE,km,P,specs};
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(invalidate);
})();
