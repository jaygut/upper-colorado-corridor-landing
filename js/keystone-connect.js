/* Graph of Life brand v1.0.0. Two kinds of landscape connection around the parcel, computed in the browser.
   Water: downhill traces on the public elevation model (keystone-flow.js). Water can only fall, so it gathers
   into channels and leaves the parcel by one route.
   Organisms: least-cost movement between habitat patches over a resistance surface built from USGS Annual NLCD
   2023 land cover and tree canopy (MRLC web coverage service, 30 m). Resistance values and the movement ranges
   of the three groups are assumptions, set out below; no animal has been tracked here. Importance of the parcel
   is the drop in equivalent connected habitat area (Saura and others 2011) when its cover is cleared.
   Generative elements are seeded: SEED 20261115. */
(function(){'use strict';
const KS=window.KS,S=KS.S,C=KS.C,SEED=20261115,RADIUS=2000,MARGIN=320,MIN_PATCH=3,MAX_PATCHES=40;
const WCS='https://dmsdata.cr.usgs.gov/geoserver/',YEAR='2023-01-01T00:00:00.000Z';
const COV={lc:['mrlc_Land-Cover-Native_conus_year_data','Land-Cover-Native_conus_year_data'],can:['mrlc_NLCD-Tree-Canopy-Native_conus_year_data','NLCD-Tree-Canopy-Native_conus_year_data']};
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const forest=lc=>lc===41||lc===42||lc===43,devd=lc=>lc>=22&&lc<=24,wet=lc=>lc===90||lc===95;
/* Resistance per 30 m step, relative to the group's preferred cover (1). Ordinal values in the range used by
   expert-based resistance surfaces (Zeller and others 2012). "cleared" is the parcel's cost in the removal test. */
const GROUPS=[
 {id:'forest',label:'Forest-dwelling animals',col:'green',shape:'dot',range:1000,speed:110,wobble:6,n:44,cleared:30,step:.22,beta:1.1,kappa:1.2,
  habitat:(lc,cv)=>forest(lc)&&cv>=30,
  cost:(lc,cv,rip)=>forest(lc)?(cv>=30?1:2):lc===90?2:lc===52?6:lc===95?8:lc===71?10:lc===21?25:lc===31?30:devd(lc)?100:lc===11?100:10},
 {id:'pollinator',label:'Pollinating insects',col:'sand',shape:'dash',range:1500,speed:240,wobble:22,n:48,cleared:4,step:.07,beta:.6,kappa:.6,
  habitat:(lc,cv)=>lc===52||lc===71||wet(lc)||(forest(lc)&&cv<40),
  cost:(lc,cv,rip)=>lc===52||lc===71||wet(lc)?1:forest(lc)?(cv>=60?3:2):lc===31||lc===21?3:devd(lc)?8:lc===11?5:3},
 {id:'wetland',label:'Wetland and stream-side species',col:'paper',shape:'ring',range:1000,speed:80,wobble:3,n:26,cleared:40,step:.3,beta:1.4,kappa:1.,
  habitat:(lc,cv,rip)=>wet(lc)||rip,
  cost:(lc,cv,rip)=>wet(lc)||rip?1:lc===11?1:forest(lc)?5:lc===52?7:lc===71?8:lc===21?30:lc===31?40:devd(lc)?100:10}];
let G=null,loading=null,raf=0,mode=S.webMode||'all',failed=false;

function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* Minimal reader for the uncompressed 8-bit GeoTIFF the coverage service returns. Anything else is refused. */
function tiff(buf){const v=new DataView(buf),le=v.getUint16(0)===0x4949,u16=o=>v.getUint16(o,le),u32=o=>v.getUint32(o,le);
 if(u16(2)!==42)throw Error('not a GeoTIFF');const ifd=u32(4),n=u16(ifd),t={};
 for(let k=0;k<n;k++){const e=ifd+2+k*12,tag=u16(e),type=u16(e+2),cnt=u32(e+4),size={1:1,2:1,3:2,4:4,11:4,12:8,16:8}[type]||4,off=cnt*size>4?u32(e+8):e+8,vals=[];
  for(let i=0;i<Math.min(cnt,8192);i++){const o=off+i*size;vals.push(type===3?u16(o):type===4?u32(o):type===12?v.getFloat64(o,le):type===1?v.getUint8(o):u32(o));}t[tag]=vals;}
 const W=t[256][0],H=t[257][0];if((t[259]||[1])[0]!==1||(t[258]||[8])[0]!==8)throw Error('unsupported encoding');
 const out=new Uint8Array(W*H);
 if(t[322]){const tw=t[322][0],th=t[323][0],across=Math.ceil(W/tw);t[324].forEach((o,k)=>{const x0=(k%across)*tw,y0=Math.floor(k/across)*th;for(let y=0;y<th&&y0+y<H;y++)for(let x=0;x<tw;x++)if(x0+x<W)out[(y0+y)*W+x0+x]=v.getUint8(o+y*tw+x);});}
 else{const rps=(t[278]||[H])[0];t[273].forEach((o,s)=>{for(let y=0;y<rps&&s*rps+y<H;y++)for(let x=0;x<W;x++)out[(s*rps+y)*W+x]=v.getUint8(o+y*W+x);});}
 /* Georeferencing: the coverage service writes a ModelTransformation (34264); other writers use PixelScale and
    Tiepoint (33550, 33922). Without either, the reader refuses the file rather than guess its position. */
 const mt=t[34264],sc=t[33550],tp=t[33922];
 if(mt&&mt.length>=8)return{W,H,data:out,x0:mt[3],y0:mt[7],dx:mt[0],dy:-mt[5]};
 if(sc&&tp)return{W,H,data:out,x0:tp[3]-tp[0]*sc[0],y0:tp[4]+tp[1]*sc[1],dx:sc[0],dy:sc[1]};
 throw Error('GeoTIFF without georeferencing');}

function bbox(){const [lon,lat]=KS.EAGLE,r=RADIUS+MARGIN,dy=r/110950,dx=r/(111320*Math.cos(lat*Math.PI/180));return[lon-dx,lat-dy,lon+dx,lat+dy];}
function coverage(key,b,w,h){const [ws,c]=COV[key];const q=new URLSearchParams({service:'WCS',version:'1.0.0',request:'GetCoverage',coverage:ws+':'+c,bbox:b.join(','),crs:'EPSG:4326',response_crs:'EPSG:4326',width:String(w),height:String(h),format:'GeoTIFF',time:YEAR});
 return fetch(WCS+ws+'/wcs?'+q.toString()).then(r=>{if(!r.ok)throw Error('coverage '+r.status);return r.arrayBuffer();}).then(tiff);}

function load(){if(loading)return loading;const b=bbox(),lat=KS.EAGLE[1],PAD=1.22,w=Math.round(PAD*(b[2]-b[0])*111320*Math.cos(lat*Math.PI/180)/30),h=Math.round(PAD*(b[3]-b[1])*110950/30);
 loading=Promise.all([coverage('lc',b,w,h),coverage('can',b,w,h)]).then(([lc,cv])=>{if(lc.W!==cv.W||lc.H!==cv.H)throw Error('grids differ');
  if(Math.abs(lc.x0-cv.x0)>1e-9||Math.abs(lc.y0-cv.y0)>1e-9||Math.abs(lc.dx-cv.dx)>1e-12)throw Error('grids differ');const {x0,y0,dx,dy}=lc;
  G={W:lc.W,H:lc.H,lc:lc.data,cv:cv.data,x0,y0,dx,dy,ex:dx*111320*Math.cos(lat*Math.PI/180),ey:dy*110950};return G;}).catch(e=>{failed=true;loading=null;throw e;});return loading;}

const ll=i=>[G.x0+(i%G.W+.5)*G.dx,G.y0-(((i/G.W)|0)+.5)*G.dy];
const cellOf=(lon,lat)=>{const x=Math.floor((lon-G.x0)/G.dx),y=Math.floor((G.y0-lat)/G.dy);return x<0||y<0||x>=G.W||y>=G.H?-1:y*G.W+x;};

/* Binary-heap Dijkstra over 8-neighbour steps, stopped at the movement range. */
/* Distances are kept in 64-bit floats: with 32-bit storage a cost that rounds down makes the popped entry look stale,
   so the cell is never expanded (found by an independent re-implementation during fact-checking). */
function dijkstra(src,cost,inWin,limit){const W=G.W,H=G.H,N=W*H,d=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1);
 /* binary heap on typed arrays: no allocation per step */
 let cap=Math.max(1024,src.length*4),hk=new Int32Array(cap),hv=new Float64Array(cap),n=0;
 const push=(k,v)=>{if(n===cap){cap*=2;const k2=new Int32Array(cap);k2.set(hk);hk=k2;const v2=new Float64Array(cap);v2.set(hv);hv=v2;}let i=n++;while(i>0){const p=(i-1)>>1;if(hv[p]<=v)break;hk[i]=hk[p];hv[i]=hv[p];i=p;}hk[i]=k;hv[i]=v;};
 const ex=G.ex,ey=G.ey,dg=Math.hypot(ex,ey),AX=[1,-1,0,0,1,1,-1,-1],AY=[0,0,1,-1,1,-1,1,-1],AL=[ex,ex,ey,ey,dg,dg,dg,dg];
 for(const s0 of src){d[s0]=0;push(s0,0);}
 while(n>0){const u=hk[0],du=hv[0];n--;if(n>0){const lk=hk[n],lv=hv[n];let i=0;for(;;){let c=2*i+1;if(c>=n)break;if(c+1<n&&hv[c+1]<hv[c])c++;if(hv[c]>=lv)break;hk[i]=hk[c];hv[i]=hv[c];i=c;}hk[i]=lk;hv[i]=lv;}
  if(du>d[u])continue;const ux=u%W,uy=(u/W)|0,cu=cost[u];
  for(let k=0;k<8;k++){const x=ux+AX[k],y=uy+AY[k];if(x<0||y<0||x>=W||y>=H)continue;const v=y*W+x;if(!inWin[v])continue;const nd=du+AL[k]*(cu+cost[v])/2;if(nd<d[v]&&nd<=limit){d[v]=nd;prev[v]=u;push(v,nd);}}}
 return{d,prev};}

function patches(hab,inWin){const N=G.W*G.H,lab=new Int32Array(N).fill(-1),out=[];
 for(let i=0;i<N;i++){if(!hab[i]||!inWin[i]||lab[i]>=0)continue;const id=out.length,cells=[i];lab[i]=id;for(let k=0;k<cells.length;k++){const u=cells[k],ux=u%G.W,uy=(u/G.W)|0;for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){const x=ux+ax,y=uy+ay;if(x<0||y<0||x>=G.W||y>=G.H)continue;const v=y*G.W+x;if(hab[v]&&inWin[v]&&lab[v]<0){lab[v]=id;cells.push(v);}}}out.push(cells);}
 return out.filter(c=>c.length>=MIN_PATCH).sort((a,b)=>b.length-a.length).slice(0,MAX_PATCHES);}

/* Links between patches within the movement range, and the equivalent connected area (binary links, ECA). */
function network(g,cost,hab,inWin,parcel){const P=patches(hab,inWin),ha=G.ex*G.ey/10000,links=[];
 const owner=new Int32Array(G.W*G.H).fill(-1);P.forEach((c,k)=>c.forEach(i=>owner[i]=k));
 for(let a=0;a<P.length;a++){const {d,prev}=dijkstra(P[a],cost,inWin,g.range),best=new Map();
  for(let i=0;i<d.length;i++){if(d[i]===Infinity)continue;const b=owner[i];if(b>a&&(!best.has(b)||d[i]<d[best.get(b)]))best.set(b,i);}
  for(const [b,end] of best){const path=[];let u=end,thru=false;for(let k=0;k<4000&&u>=0;k++){path.push(u);if(parcel[u])thru=true;u=prev[u];}links.push({a,b,cost:d[end],thru,path:path.reverse()});}}
 /* components over links; ECA = sqrt(sum over connected pairs of area products), in hectares */
 const root=P.map((_,k)=>k),find=k=>root[k]===k?k:(root[k]=find(root[k]));for(const l of links){root[find(l.a)]=find(l.b);}
 const area=new Map();P.forEach((c,k)=>{const r=find(k);area.set(r,(area.get(r)||0)+c.length*ha);});let s=0;for(const v of area.values())s+=v*v;
 return{P,links,eca:Math.sqrt(s),habitat_ha:P.reduce((t,c)=>t+c.length*ha,0)};}

const pause=()=>new Promise(ok=>setTimeout(ok,0));
async function compute(web){const N=G.W*G.H,inWin=new Uint8Array(N),parcel=new Uint8Array(N),rip=new Uint8Array(N),ring=KS.parcel();
 const [clon,clat]=KS.EAGLE,kx=111320*Math.cos(clat*Math.PI/180),ky=110950;
 const inPoly=(lon,lat)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
 for(let i=0;i<N;i++){const [lon,lat]=ll(i),dx=(lon-clon)*kx,dy=(lat-clat)*ky;if(dx*dx+dy*dy<=RADIUS*RADIUS&&G.lc[i]!==250&&G.lc[i]!==0)inWin[i]=1;if(inPoly(lon,lat))parcel[i]=1;}
 let pc=0;for(let i=0;i<N;i++)if(parcel[i])pc++;if(!pc){const c=cellOf(clon,clat);if(c>=0){parcel[c]=1;pc=1;}}
 /* stream-side cells: within about 60 m of a terrain channel that gathers at least 640 cells (about 56 ha), a stated
    proxy for streams that hold water, or of the parcel's route once it reaches the valley floor (about 0.9 km down) */
 const rt=KS.flow&&KS.flow.ready()?KS.flow.trace(KS.EAGLE[0],KS.EAGLE[1]):null,valley=web&&web.near_m!=null?web.near_m:900,route=rt?rt.coords.filter((_,k)=>rt.dist[k]>=valley):[],chan=(web&&web.lines?web.lines.filter(l=>l.b>=4).map(l=>l.p):[]).concat([route]);
 for(const pts of chan){for(const p of pts){const c=cellOf(p[0],p[1]);if(c<0)continue;const cx=c%G.W,cy=(c/G.W)|0;for(let ay=-2;ay<=2;ay++)for(let ax=-2;ax<=2;ax++){const x=cx+ax,y=cy+ay;if(x>=0&&y>=0&&x<G.W&&y<G.H)rip[y*G.W+x]=1;}}}
 const out={groups:{},inWin,parcel};
 for(const g of GROUPS){await pause();const cost=new Float32Array(N),hab=new Uint8Array(N),cost2=new Float32Array(N),hab2=new Uint8Array(N);
  for(let i=0;i<N;i++){const lc=G.lc[i],cv=G.cv[i]===255?0:G.cv[i];cost[i]=g.cost(lc,cv,!!rip[i]);hab[i]=g.habitat(lc,cv,!!rip[i])?1:0;cost2[i]=parcel[i]?g.cleared:cost[i];hab2[i]=parcel[i]?0:hab[i];}
  const base=network(g,cost,hab,inWin,parcel);await pause();const cut=network(g,cost2,hab2,inWin,parcel);
  let ph=0;for(let i=0;i<N;i++)if(parcel[i]&&hab[i])ph++;
  /* display backbone: each patch's three cheapest links; every statistic uses all links */
  const keep=new Set(),byPatch=new Map();base.links.forEach((l,k)=>[l.a,l.b].forEach(x=>{if(!byPatch.has(x))byPatch.set(x,[]);byPatch.get(x).push(k);}));
  for(const ks of byPatch.values())ks.sort((a,b)=>base.links[a].cost-base.links[b].cost).slice(0,3).forEach(k=>keep.add(k));
  const shown=[...keep].sort((a,b)=>a-b).map(k=>base.links[k]);
  const habCells=[];for(let i=0;i<N;i++)if(hab[i]&&inWin[i])habCells.push(i);
  out.groups[g.id]={g,cost,habCells,net:base,shown,eca:base.eca,eca_cleared:cut.eca,habitat_ha:base.habitat_ha,links:base.links.length,thru:base.links.filter(l=>l.thru).length,parcel_habitat_share:pc?ph/pc:0,
   paths:shown.map(l=>({a:l.a,b:l.b,thru:l.thru,p:l.path.filter((_,k,a)=>k%2===0||k===a.length-1).map(ll)}))};}
 return out;}

/* Movers: water along seeded downhill traces; organisms walk the displayed link graph of their group. */
function movers(res){const r=rng(SEED),water=[],orgs=[],N=G.W*G.H,[clon,clat]=KS.EAGLE,kx=111320*Math.cos(clat*Math.PI/180),ky=110950,lim=(RADIUS+400)*(RADIUS+400);
 if(KS.flow&&KS.flow.ready()){const cand=[];for(let i=0;i<N;i+=2)if(res.inWin[i])cand.push(i);
  for(let k=0;k<90&&cand.length;k++){const [lon,lat]=ll(cand[Math.floor(r()*cand.length)]),tr=KS.flow.trace(lon,lat);if(!tr||tr.coords.length<3)continue;const keep=[];
   for(const q of tr.coords){const dx=(q[0]-clon)*kx,dy=(q[1]-clat)*ky;if(dx*dx+dy*dy>lim)break;keep.push(q);}if(keep.length>2)water.push({p:keep,len:keep.length,ph:r()});}}
 for(const id in res.groups){const gr=res.groups[id],g=gr.g;if(!gr.habCells.length)continue;
  for(let k=0;k<g.n;k++){const home=gr.habCells[Math.floor(r()*gr.habCells.length)];orgs.push({g,gr,home,at:home,to:home,f:1,hx:r()*2-1,hy:r()*2-1,trail:[]});}}
 return{water,orgs,r};}

/* Step selection: each move picks a neighbouring 30 m cell with weight exp(-beta (cost - 1)) for the cover it enters,
   exp(kappa cos(turn)) for keeping its heading, and a pull home once it is past half its movement range. */
function nextCell(o){const g=o.g,cost=o.gr.cost,u=o.at,ux=u%G.W,uy=(u/G.W)|0,hx=o.home%G.W,hy=(o.home/G.W)|0,far=Math.hypot((ux-hx)*G.ex,(uy-hy)*G.ey)>g.range/2;
 let tot=0;const cand=[];for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){if(!ax&&!ay)continue;const x=ux+ax,y=uy+ay;if(x<0||y<0||x>=G.W||y>=G.H)continue;const v=y*G.W+x;if(!res.inWin[v])continue;
  const len=Math.hypot(ax,ay),turn=(ax*o.hx+ay*o.hy)/len/(Math.hypot(o.hx,o.hy)||1),home=far?Math.exp(1.5*((hx-ux)*ax+(hy-uy)*ay)/len/(Math.hypot(hx-ux,hy-uy)||1)):1;
  const w=Math.exp(-g.beta*(cost[v]-1))*Math.exp(g.kappa*turn)*home;cand.push([v,w,ax,ay]);tot+=w;}
 if(!cand.length)return u;let t=M.r()*tot;for(const c of cand){t-=c[1];if(t<=0){o.hx=c[2];o.hy=c[3];return c[0];}}const c=cand[cand.length-1];o.hx=c[2];o.hy=c[3];return c[0];}
function stepOrg(o,dt){o.f+=dt/o.g.step;while(o.f>=1){o.f-=1;o.at=o.to;o.trail.push(o.at);if(o.trail.length>4)o.trail.shift();o.to=nextCell(o);}}
function posOrg(o){const a=ll(o.at),b=ll(o.to),f=Math.min(1,o.f);return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];}

let M=null,last=0,res=null;
function active(){const T=window.__STORY;return !!(T&&T.step==='node'&&S.L&&S.L.web>.6&&!document.hidden);}
let camSig='',corrCache=[];
function frame(now){if(!active()||!M){raf=0;S.overlay.parts=null;S.overlay.corr=null;KS.overlayDraw();return;}
 if(last&&now-last<32){raf=requestAnimationFrame(frame);return;}
 const dt=Math.min(.05,(now-(last||now))/1000);last=now;const parts=[],corr=[],showW=mode!=='flight',showO=mode!=='water'&&res;
 if(showW)for(const w of M.water){const f=((now/1000)*9/w.len+w.ph)%1,pos=f*(w.len-1),i=Math.floor(pos),u=pos-i,a=w.p[i],b=w.p[Math.min(w.len-1,i+1)],x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u,qa=KS.screen([x,y]),back=w.p[Math.max(0,i-2)],qb=KS.screen(back);if(qa&&qb)parts.push({k:'w',q:qa,t:qb});}
 if(showO){const c0=KS.screen(KS.EAGLE),c1=KS.screen([KS.EAGLE[0]+.01,KS.EAGLE[1]+.01]),sig=c0&&c1?[c0[0],c0[1],c1[0],c1[1]].map(v=>Math.round(v)).join(','):'';
  if(sig!==camSig){camSig=sig;corrCache=[];for(const id in res.groups){const gr=res.groups[id];for(const p of gr.paths){const q=p.p.map(KS.screen).filter(Boolean);if(q.length>1)corrCache.push({col:gr.g.col,thru:p.thru,q});}}}
  for(const c of corrCache)corr.push(c);
  for(const o of M.orgs){if(mode==='flight'||mode==='all'){if(!reduce)stepOrg(o,dt);const q=KS.screen(posOrg(o));if(!q)continue;const tr=o.trail.map(c=>KS.screen(ll(c))).filter(Boolean);tr.push(q);if(tr.length>1)corr.push({col:o.g.col,thru:false,trail:true,q:tr});parts.push({k:o.g.shape,col:o.g.col,q});}}}
 S.overlay.parts=parts;S.overlay.corr=corr;KS.overlayDraw();raf=reduce?0:requestAnimationFrame(frame);}
function run(){if(!raf&&active())raf=requestAnimationFrame(frame);}

const ha=v=>v>=100?Math.round(v).toLocaleString('en-US'):v.toFixed(1),drop=(a,b)=>b>0?100*(1-a/b):0,pct=(a,b)=>{const d=drop(a,b);return d<=0?'0%':d<1?'less than 1%':Math.round(d)+'%';};
function text(){if(failed)return'Land cover could not be loaded from the USGS coverage service, so no movement is drawn and no substitute is shown.';if(!res)return'Loading 2023 land cover and tree canopy for the movement layer.';
 return GROUPS.map(g=>{const r=res.groups[g.id];return`${g.label} · ${ha(r.habitat_ha)} ha of habitat in ${r.net.P.length} patches · ${r.links} links within a cost distance of ${(g.range/1000).toFixed(1)} km, ${r.thru} through the parcel · equivalent connected habitat ${ha(r.eca)} ha, ${ha(r.eca_cleared)} ha with the parcel cleared (${pct(r.eca_cleared,r.eca)} lower)`;}).join(' || ');}
function summary(){if(!res)return'';const f=res.groups.forest,p=res.groups.pollinator,w=res.groups.wetland;
 const big=f.net.P[0],bigHa=big?big.length*G.ex*G.ey/10000:0,inBig=big&&big.some(i=>res.parcel[i]);
 const first=inBig?`Forest-dwelling animals find about ${ha(f.habitat_ha)} ha of forest within 2 km, ${Math.round(100*bigHa/f.habitat_ha)}% of it in one continuous block that contains the parcel`:`Forest-dwelling animals find about ${ha(f.habitat_ha)} ha of forest within 2 km`;
 const links=`The parcel carries ${f.thru} of their ${f.links} cheapest links between patches, ${p.thru} of ${p.links} for pollinating insects and ${w.thru} of ${w.links} for wetland and stream-side species`;
 const cut=`Clearing its cover would lower equivalent connected habitat by ${pct(f.eca_cleared,f.eca)} for forest-dwelling animals, ${pct(p.eca_cleared,p.eca)} for pollinating insects and ${pct(w.eca_cleared,w.eca)} for wetland and stream-side species`;
 const small=[f,p,w].every(r=>drop(r.eca_cleared,r.eca)<1)&&f.thru===0;
 return`${first}. ${links}. ${cut}.`+(small?' On these assumptions the parcel adds habitat to a well-connected landscape without being a link that other ground does not also provide.':'');}

function start(web){if(res||loading){run();return;}load().then(()=>compute(web)).then(r=>{res=r;M=movers(res);window.__STORY&&(window.__STORY.figures=window.__STORY.figures||{});
  if(window.__STORY)window.__STORY.figures.connect=Object.fromEntries(Object.entries(res.groups).map(([k,r])=>[k,{habitat_ha:+r.habitat_ha.toFixed(2),patches:r.net.P.length,links:r.links,thru:r.thru,eca_ha:+r.eca.toFixed(2),eca_cleared_ha:+r.eca_cleared.toFixed(2),parcel_habitat_share:+r.parcel_habitat_share.toFixed(3)}]));
  document.dispatchEvent(new CustomEvent('ks:connect'));run();}).catch(()=>{document.dispatchEvent(new CustomEvent('ks:connect'));});}
function setMode(m){mode=m;run();KS.overlayDraw();}
document.addEventListener('visibilitychange',run);addEventListener('scroll',run,{passive:true});
function edge(){if(!res)return'';const t=GROUPS.reduce((a,g)=>a+res.groups[g.id].links,0),th=GROUPS.reduce((a,g)=>a+res.groups[g.id].thru,0);return`${t.toLocaleString('en-US')} least-cost links between habitat patches for three movement groups, ${th.toLocaleString('en-US')} of them through the parcel, on assumed resistances with no animal tracked here`;}
KS.connect={start,setMode,run,text,summary,edge,_res:()=>res,ready:()=>!!res,failed:()=>failed,groups:GROUPS,seed:SEED};
})();
