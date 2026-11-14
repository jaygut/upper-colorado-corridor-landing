/* Graph of Life brand v1.0.0. Downhill trace on the public elevation model, computed in the browser.
   This is terrain geometry: steepest descent across 30 m cells, bridging closed pits to the nearest lower cell.
   It says where the surface slopes. It carries no volume, timing or measured flow. */
(function(){'use strict';
const KS=window.KS,Z=12,NX=4,NY=4,T=256,URL='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
const n=Math.pow(2,Z);
const tx=lon=>(lon+180)/360*n,ty=lat=>{const r=lat*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n;};
const X0=Math.floor(tx(KS.EAGLE[0]))-3,Y0=Math.floor(ty(KS.EAGLE[1]))-3,W=NX*T,H=NY*T;
const toLL=(x,y)=>[(X0+x/T)/n*360-180,Math.atan(Math.sinh(Math.PI*(1-2*(Y0+y/T)/n)))*180/Math.PI];
const MPP=156543.03*Math.cos(KS.EAGLE[1]*Math.PI/180)/n;
let M=null,loading=null;
function tile(i,j){return new Promise((ok,no)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=T;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);const d=g.getImageData(0,0,T,T).data;for(let y=0;y<T;y++)for(let x=0;x<T;x++){const k=(y*T+x)*4;M[(j*T+y)*W+i*T+x]=d[k]*256+d[k+1]+d[k+2]/256-32768;}ok();}catch(e){no(e);}};img.onerror=()=>no(Error('tile'));img.src=URL+Z+'/'+(X0+i)+'/'+(Y0+j)+'.png';});}
function load(){if(loading)return loading;M=new Float32Array(W*H);const jobs=[];for(let i=0;i<NX;i++)for(let j=0;j<NY;j++)jobs.push(tile(i,j));loading=Promise.all(jobs).then(()=>true).catch(e=>{M=null;loading=null;throw e;});return loading;}
function inside(lon,lat){const x=(tx(lon)-X0)*T,y=(ty(lat)-Y0)*T;return x>=2&&y>=2&&x<W-2&&y<H-2;}
function trace(lon,lat){if(!M||!inside(lon,lat))return null;let x=Math.floor((tx(lon)-X0)*T),y=Math.floor((ty(lat)-Y0)*T),bridges=0,len=0,end='limit',floorAt=null;const start=M[y*W+x],pts=[[x,y]],dist=[0];
  for(let s=0;s<9000;s++){const h=M[y*W+x];let best=0,bx=0,by=0,edge=false;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const u=x+dx,v=y+dy;if(u<0||v<0||u>=W||v>=H){edge=true;continue;}const g=(h-M[v*W+u])/(dx&&dy?1.4142:1);if(g>best){best=g;bx=u;by=v;}}
    if(edge){end='edge';break;}
    if(best<=0){let found=false;for(let r=2;r<60&&!found;r++){let bd=1e9;const test=(u,v)=>{if(u<0||v<0||u>=W||v>=H)return;if(M[v*W+u]<h-.01){const d=(u-x)*(u-x)+(v-y)*(v-y);if(d<bd){bd=d;bx=u;by=v;found=true;}}};for(let k=-r;k<=r;k++){test(x+k,y-r);test(x+k,y+r);if(k>-r&&k<r){test(x-r,y+k);test(x+r,y+k);}}}
      if(!found){end='pit';break;}bridges++;}
    len+=Math.hypot(bx-x,by-y)*MPP;x=bx;y=by;pts.push([x,y]);dist.push(len);
    if(floorAt===null&&pts.length>12){const back=pts[pts.length-12],slope=(M[back[1]*W+back[0]]-M[y*W+x])/(dist[dist.length-1]-dist[dist.length-12]);if(slope<.06)floorAt=dist[dist.length-12];}}
  return{coords:pts.map(p=>toLL(p[0]+.5,p[1]+.5)),dist,length_m:len,drop_m:start-M[y*W+x],start_m:start,bridges,end,valley_m:floorAt,cell_m:MPP};}
function along(tr,d){const a=tr.dist;let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m]<=d)lo=m;else hi=m;}const f=(d-a[lo])/Math.max(1e-6,a[hi]-a[lo]),p=tr.coords[lo],q=tr.coords[hi];return[p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f];}
/* The landscape network around the parcel. Every 30 m cell within the window is a node and its steepest-descent step is its edge,
   so the figure shows which ground sends its water into the parcel, and how far down the parcel's own route the rest of the ground joins it.
   Same terrain, same rule and same limits as the single trace above. */
let DN=null,CLS=null,JD=null;const MID=5000; // CLS: 1 parcel, 2 parcel route, 3 drains into the parcel, 4 joins the route, 5 unlinked
function nextCell(i){if(DN[i]!==-3)return DN[i];const x=i%W,y=(i/W)|0,h=M[i];let best=0,bi=-1,edge=false;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const u=x+dx,v=y+dy;if(u<0||v<0||u>=W||v>=H){edge=true;continue;}const g=(h-M[v*W+u])/(dx&&dy?1.4142:1);if(g>best){best=g;bi=v*W+u;}}
  if(edge)return DN[i]=-1;
  if(best<=0){let found=false;for(let r=2;r<60&&!found;r++){let bd=1e9;const test=(u,v)=>{if(u<0||v<0||u>=W||v>=H)return;if(M[v*W+u]<h-.01){const d=(u-x)*(u-x)+(v-y)*(v-y);if(d<bd){bd=d;bi=v*W+u;found=true;}}};for(let k=-r;k<=r;k++){test(x+k,y-r);test(x+k,y+r);if(k>-r&&k<r){test(x-r,y+k);test(x+r,y+k);}}}if(!found)return DN[i]=-2;}
  return DN[i]=bi;}
function fate(i){const path=[];let f=5,d=-1;for(;;){const c=CLS[i];if(c){f=c===1?3:c===2?4:c;d=c===1?0:JD[i];break;}path.push(i);const n=nextCell(i);if(n<0||path.length>6000)break;i=n;}for(const q of path){CLS[q]=f;JD[q]=d;}return f;}
function web(ring,tr,radiusM,stepCells){if(!M||!ring||!tr)return null;DN=new Int32Array(W*H).fill(-3);CLS=new Int8Array(W*H);JD=new Float32Array(W*H);
  const kx=111320*Math.cos(KS.EAGLE[1]*Math.PI/180),ky=110950,loc=p=>[(p[0]-KS.EAGLE[0])*kx,(p[1]-KS.EAGLE[1])*ky],poly=ring.map(loc);
  const inPoly=q=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
  const edgeDist=q=>{if(inPoly(q))return 0;let best=1e12;for(let i=0;i<poly.length-1;i++){const a=poly[i],b=poly[i+1],vx=b[0]-a[0],vy=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*vx+(q[1]-a[1])*vy)/(vx*vx+vy*vy||1))),dx=q[0]-a[0]-t*vx,dy=q[1]-a[1]-t*vy,d=dx*dx+dy*dy;if(d<best)best=d;}return Math.sqrt(best);};
  const cx=Math.floor((tx(KS.EAGLE[0])-X0)*T),cy=Math.floor((ty(KS.EAGLE[1])-Y0)*T),Rc=Math.round(radiusM/MPP),start=cy*W+cx,cells=[],ll=i=>toLL(i%W+.5,((i/W)|0)+.5),inWin=i=>{const ax=i%W-cx,ay=((i/W)|0)-cy;return ax*ax+ay*ay<=Rc*Rc;};
  for(let y=cy-40;y<=cy+40;y++)for(let x=cx-40;x<=cx+40;x++){if(x<1||y<1||x>=W-1||y>=H-1)continue;if(inPoly(loc(toLL(x+.5,y+.5)))){CLS[y*W+x]=1;cells.push(y*W+x);}}
  if(!CLS[start]){CLS[start]=1;cells.push(start);}
  /* the parcel's own route, with the distance travelled stored on every cell */
  let i=start,d=0;for(let k=0;k<9000;k++){const n=nextCell(i);if(n<0)break;d+=Math.hypot(n%W-i%W,((n/W)|0)-((i/W)|0))*MPP;i=n;if(CLS[i]!==1){CLS[i]=2;JD[i]=d;}}
  for(const c of cells){let j=c;for(let k=0;k<9000;k++){const n=nextCell(j);if(n<0)break;j=n;if(CLS[j]===2)break;if(CLS[j]!==1){CLS[j]=2;JD[j]=0;}}}
  /* every cell in the window: its fate, and the number of window cells that pass through it */
  const near=tr.valley_m==null?900:tr.valley_m,win=[],counts={into:0,near:0,mid:0,far:0,other:0,within600:0,within1500:0},joins=[],acc=new Int32Array(W*H);
  for(let gy=-Rc;gy<=Rc;gy++)for(let gx=-Rc;gx<=Rc;gx++){if(gx*gx+gy*gy>Rc*Rc)continue;const x=cx+gx,y=cy+gy;if(x<1||y<1||x>=W-1||y>=H-1)continue;const c=y*W+x;if(CLS[c]===1)continue;win.push(c);}
  const klass=c=>CLS[c]===3?4:CLS[c]===5?8:JD[c]<near?5:JD[c]<MID?6:7;
  for(const c of win){const pre=CLS[c],f=pre===2?4:fate(c);if(f===3)counts.into++;else if(f===5)counts.other++;else{const j=JD[c];joins.push(j);if(j<near)counts.near++;else if(j<MID)counts.mid++;else counts.far++;}
    let j=c;for(let k=0;k<700;k++){acc[j]++;const n=nextCell(j);if(n<0||!inWin(n))break;j=n;}}
  joins.sort((a,b)=>a-b);
  /* channels: cells that collect at least A0 window cells, drawn once each and widened as they gather more ground */
  const A0=10,bin=a=>a<40?1:a<160?2:a<640?3:4,drawn=new Uint8Array(W*H),chan=win.filter(c=>acc[c]>=A0&&CLS[c]!==2).sort((a,b)=>acc[a]-acc[b]),lines=[];
  for(const c of chan){if(drawn[c])continue;const b=bin(acc[c]),k=klass(c),pts=[ll(c)];let j=c;drawn[c]=1;for(let q=0;q<400;q++){const n=nextCell(j);if(n<0||!inWin(n))break;pts.push(ll(n));if(drawn[n]||CLS[n]===2||CLS[n]===1||acc[n]<A0||bin(acc[n])!==b||klass(n)!==k)break;drawn[n]=1;j=n;}if(pts.length>1)lines.push({c:k,b,p:pts});}
  const nodes=[];for(let gy=-Rc;gy<=Rc;gy+=stepCells)for(let gx=-Rc;gx<=Rc;gx+=stepCells){if(gx*gx+gy*gy>Rc*Rc)continue;const c=(cy+gy)*W+cx+gx;if(!CLS[c]||CLS[c]===1||CLS[c]===2)continue;const q=ll(c);nodes.push([q[0],q[1],klass(c),Math.round(edgeDist(loc(q)))]);}
  for(const c of win){const dist=edgeDist(loc(ll(c)));if(dist<=600)counts.within600++;if(dist<=1500)counts.within1500++;}
  return{lines,nodes,counts,cells:win.length,parcel_cells:cells.length,radius_m:radiusM,near_m:near,mid_m:MID,median_join_m:joins.length?joins[joins.length>>1]:null,cell_m:MPP,channel_cells:chan.length};}
function classAt(lon,lat){if(!CLS||!inside(lon,lat))return null;const x=Math.floor((tx(lon)-X0)*T),y=Math.floor((ty(lat)-Y0)*T),c=y*W+x;if(!CLS[c])fate(c);return{kind:['','parcel','route','into','joins','other'][CLS[c]],join_m:JD[c]};}
KS.flow={load,trace,web,classAt,along,inside,ready:()=>!!M&&!!loading,cell_m:MPP};
})();
