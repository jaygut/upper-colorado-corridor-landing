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
KS.flow={load,trace,along,inside,ready:()=>!!M&&!!loading,cell_m:MPP};
})();
