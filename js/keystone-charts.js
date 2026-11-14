/* Graph of Life brand v1.0.0. Figures for the Keystone story. Every mark is a retained public value; nothing is modelled or interpolated here. */
(function(){'use strict';
const NS='http://www.w3.org/2000/svg',KS=window.KS,C=KS.C;
function el(tag,attrs,text){const n=document.createElementNS(NS,tag);for(const k in attrs||{})n.setAttribute(k,attrs[k]);if(text!==undefined)n.textContent=text;return n;}
function svg(host,w,h,label){const s=el('svg',{viewBox:`0 0 ${w} ${h}`,width:'100%',role:'img','aria-label':label});s.style.maxWidth=w+'px';host.replaceChildren(s);return s;}
const width=(host,max)=>Math.max(280,Math.min(max||1180,Math.floor(host.getBoundingClientRect().width)||host.clientWidth||320));
const fmt=(v,d)=>v===null||v===undefined?'gap':Number(v).toFixed(d);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const stamp=ms=>{const d=new Date(ms);return String(d.getUTCDate()).padStart(2,'0')+' '+MON[d.getUTCMonth()]+' '+String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')+' UTC';};
const pct=(x,d=1)=>(x*100).toFixed(d)+'%';
function unavailable(host,what){host.replaceChildren(Object.assign(document.createElement('p'),{className:'k-note',textContent:what+' unavailable. No substitute figure is drawn.'}));}

/* ---------- composition: provider species-name groups by year range ---------- */
function species(host,eagle,readout,sort){const groups=[...eagle.birds.groups].sort(sort==='count'?(a,b)=>b.n-a.n||a.name.localeCompare(b.name):(a,b)=>a.y0-b.y0||a.y1-b.y1||a.name.localeCompare(b.name));
  const w=width(host,620),narrow=w<430,left=narrow?150:190,right=34,row=24,top=22,h=top+groups.length*row+8,y0=2005,y1=2025,x=y=>left+(y-y0)/(y1-y0)*(w-left-right);
  const s=svg(host,w,h,`${groups.length} provider-reported bird species-name groups in the 1 km neighbourhood, by first and last observed year, 2005 to 2025, with record counts. Coordinates withheld.`);
  for(const y of [2005,2010,2015,2020,2025]){s.append(el('line',{x1:x(y),y1:top-4,x2:x(y),y2:h-4,class:'grid'}));s.append(el('text',{x:x(y),y:12,class:'tick','text-anchor':'middle'},String(y)));}
  groups.forEach((g,i)=>{const y=top+i*row+row/2,flag=g.status.includes('SYNONYM')||g.flags.TAXON_MATCH_FUZZY,grp=el('g',{class:'species-row',tabindex:'0',role:'button','aria-label':`${g.name}, ${g.n} record${g.n>1?'s':''}, ${g.y0===g.y1?g.y0:g.y0+' to '+g.y1}`});
    grp.append(el('rect',{x:0,y:y-row/2,width:w,height:row,class:'hit'}));grp.append(el('text',{x:left-10,y:y+4,class:'name','text-anchor':'end'},g.name+(flag?' *':'')));
    if(g.y1>g.y0)grp.append(el('line',{x1:x(g.y0),y1:y,x2:x(g.y1),y2:y,class:'span'}));grp.append(el('circle',{cx:x(g.y0),cy:y,r:3.5,class:'obs'}));if(g.y1>g.y0)grp.append(el('circle',{cx:x(g.y1),cy:y,r:3.5,class:'obs'}));
    grp.append(el('text',{x:w-4,y:y+4,class:'count','text-anchor':'end'},String(g.n)));
    const show=()=>{host.querySelectorAll('.species-row').forEach(n=>n.classList.toggle('on',n===grp));const flags=[];if(g.status.includes('SYNONYM'))flags.push('provider status synonym');else flags.push('provider status accepted');if(g.flags.TAXON_MATCH_FUZZY)flags.push('fuzzy taxon match');if(g.flags.TAXON_CONCEPT_ID_NOT_FOUND)flags.push('concept ID not found on '+g.flags.TAXON_CONCEPT_ID_NOT_FOUND);
      readout.replaceChildren();const a=document.createElement('a');a.href=g.url;a.textContent=g.name;a.rel='noopener';readout.append(a,` · ${g.n} record${g.n>1?'s':''} · ${g.y0===g.y1?g.y0:g.y0+'–'+g.y1} · ${flags.join(' · ')} · location within 1 km withheld`);};
    grp.addEventListener('click',show);grp.addEventListener('focus',show);grp.addEventListener('mouseenter',show);grp.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});s.append(grp);});
  const cap=document.createElement('p');cap.className='k-note figcap';cap.textContent='Provider-reported names. First and last observed year and record count. An asterisk marks a synonym or fuzzy match flagged by the provider.';host.append(cap);
  return{rows:groups.length,total:groups.reduce((a,g)=>a+g.n,0)};}

/* ---------- shared clock ---------- */
function clock(host,data,ui){const start=Date.parse(data.start),end=Date.parse(data.end_exclusive),STEP=300000,N=(end-start)/STEP;
  const get=(id,st)=>data.series.find(s=>s.id===id&&(!st||s.station===st));
  const rows=[{s:get('00045'),kind:'bars',d:2},{s:get('00060'),kind:'line',d:0},{s:get('63680'),kind:'line',d:1},{temp:true,kind:'temp',d:1}];
  const temps=data.series.filter(s=>s.id==='00010'),tempClass={'401530105475401':'t-north','09013500':'t-east','09071750':'t-glen'};
  const at=(s,ms)=>{const i=Math.floor((ms-Date.parse(s.start))/(s.cadence_s*1000));return i>=0&&i<s.values.length?s.values[i]:null;};
  const peak=s=>{const vals=s.values.filter(v=>v!==null),max=Math.max(...vals),idx=[];s.values.forEach((v,i)=>{if(v===max)idx.push(i);});return{max,ms:Date.parse(s.start)+idx[0]*s.cadence_s*1000,ties:idx.length};};
  const state={i:0,shown:new Set(ui.shown())};let geom=null;
  function build(){const w=width(host,1180),narrow=w<560,left=narrow?4:118,right=narrow?4:16,rh=narrow?78:86,gap=narrow?30:18,top=narrow?18:8,h=top+rows.length*(rh+gap)+22,x=ms=>left+(ms-start)/(end-start)*(w-left-right);
    const s=svg(host,w,h,'Rainfall, discharge, turbidity and water temperature on one UTC clock, 30 July to 4 August 2021. Native units and intervals. Gaps break the lines.');
    for(let d=0;d<=6;d++){const xp=x(start+d*86400000);s.append(el('line',{x1:xp,y1:top,x2:xp,y2:h-20,class:'grid'}));if(d<6&&(!narrow||d%2===0))s.append(el('text',{x:xp+4,y:h-4,class:'tick'},stamp(start+d*86400000).slice(0,6)));}
    const dots=[];
    rows.forEach((r,k)=>{const y0=top+k*(rh+gap),yb=y0+rh;s.append(el('line',{x1:left,y1:yb,x2:w-right,y2:yb,class:'axis'}));
      const list=r.temp?temps.filter(t=>state.shown.has(t.station)):[r.s];if(!list.length){s.append(el('text',{x:left+6,y:y0+rh/2,class:'tick'},'No station selected'));dots.push([]);return;}
      const all=list.flatMap(t=>t.values.filter(v=>v!==null)),lo=r.temp?Math.floor(Math.min(...all)):0,hi=r.temp?Math.ceil(Math.max(...all)):Math.max(...all),y=v=>yb-(v-lo)/(hi-lo||1)*(rh-8);
      const title=r.temp?'Water temperature':r.s.label,unit=r.temp?'°C':r.s.unit;
      if(narrow){s.append(el('text',{x:left,y:y0-6,class:'row-title'},title+' · '+unit));}else{s.append(el('text',{x:0,y:y0+14,class:'row-title'},title));s.append(el('text',{x:0,y:y0+30,class:'tick'},unit));s.append(el('text',{x:0,y:yb-2,class:'tick'},(r.temp?lo+' to '+hi:'max '+fmt(hi,r.d))));}
      const rowDots=[];
      list.forEach(t=>{const t0=Date.parse(t.start),cad=t.cadence_s*1000,cls=r.temp?tempClass[t.station]:(t.id==='63680'?'s-turb':t.id==='00045'?'s-rain':'s-flow');
        if(r.kind==='bars'){let d='';t.values.forEach((v,i)=>{if(v){const xp=x(t0+i*cad);d+=`M${xp.toFixed(1)},${yb}V${y(v).toFixed(1)}`;}});s.append(el('path',{d,class:'series '+cls}));}
        else{let d='',live=false;t.values.forEach((v,i)=>{if(v===null){live=false;return;}d+=(live?'L':'M')+x(t0+i*cad).toFixed(1)+','+y(v).toFixed(1);live=true;});s.append(el('path',{d,class:'series '+cls}));}
        if(r.temp){}
        else{const p=peak(t);s.append(el('circle',{cx:x(p.ms),cy:y(p.max),r:3.5,class:'peak '+cls}));}
        const dot=el('circle',{r:4.5,class:'cursor-dot '+cls});s.append(dot);rowDots.push({dot,t,y});});
      dots.push(rowDots);});
    const line=el('line',{y1:top,y2:h-20,class:'cursor'});s.append(line);
    const hit=el('rect',{x:left,y:0,width:w-left-right,height:h,class:'hit'});s.append(hit);
    const setFromX=cx=>{const r=s.getBoundingClientRect(),px=(cx-r.left)/r.width*w,f=Math.max(0,Math.min(1,(px-left)/(w-left-right)));set(Math.min(N-1,Math.round(f*N)));};
    let down=false;hit.addEventListener('pointerdown',e=>{down=true;hit.setPointerCapture(e.pointerId);setFromX(e.clientX);});hit.addEventListener('pointermove',e=>{if(down||e.pointerType==='mouse')setFromX(e.clientX);});hit.addEventListener('pointerup',()=>{down=false;});hit.addEventListener('pointercancel',()=>{down=false;});
    geom={x,line,dots};paint();}
  function paint(){if(!geom)return;const ms=start+state.i*STEP,xp=geom.x(ms);geom.line.setAttribute('x1',xp);geom.line.setAttribute('x2',xp);const parts=[stamp(ms)];
    geom.dots.forEach((rd,k)=>rd.forEach(o=>{const v=at(o.t,ms);if(v===null){o.dot.setAttribute('visibility','hidden');}else{o.dot.setAttribute('visibility','visible');o.dot.setAttribute('cx',xp);o.dot.setAttribute('cy',o.y(v));}
      const name=o.t.id==='00010'?data.station_names[o.t.station].replace('Colorado River above Glenwood Springs','Glenwood')+' ':o.t.id==='00045'?'rain ':o.t.id==='00060'?'flow ':'turbidity ';parts.push(name+(v===null?'gap':fmt(v,rows[k].d)+' '+o.t.unit));}));
    ui.readout.textContent=parts.join(' · ');ui.slider.value=state.i;ui.slider.setAttribute('aria-valuetext',parts.join(', '));}
  function set(i){state.i=Math.max(0,Math.min(N-1,i));paint();}
  ui.slider.max=N-1;ui.slider.addEventListener('input',()=>set(Number(ui.slider.value)));
  const peaks={};for(const id of ['00045','00060','63680'])peaks[id]=peak(get(id));peaks['00010']=peak(get('00010','401530105475401'));
  build();set(Math.round((peaks['63680'].ms-start)/STEP));
  return{rebuild(){state.shown=new Set(ui.shown());build();},set,peaks,toPeak(id){set(Math.round((peaks[id].ms-start)/STEP));return peaks[id];},state,N,start,STEP};}

/* ---------- daily temperature coverage ---------- */
function coverage(host,daily,readout){const w=width(host,1180),narrow=w<560,left=narrow?4:150,right=4,rows=daily.series,days=rows[0].status.length,cw=(w-left-right)/days,rh=narrow?18:22,gap=narrow?22:8,top=20,h=top+rows.length*(rh+gap)+6;
  const means=rows.flatMap(r=>r.mean.filter((v,i)=>v!==null&&r.status[i]==='q')),lo=Math.min(...means),hi=Math.max(...means);
  const s=svg(host,w,h,`Daily water-temperature coverage for three stations in 2021 and 2022. ${daily.counts.qualified} coverage-qualified days, ${daily.counts.partial} partial days, ${daily.counts.unavailable} unavailable days.`);
  const first=Date.parse(rows[0].start+'T00:00:00Z');for(let i=0;i<days;i++){const d=new Date(first+i*86400000);if(d.getUTCDate()===1&&(!narrow||d.getUTCMonth()%2===0)){s.append(el('text',{x:left+i*cw,y:12,class:'tick'},MON[d.getUTCMonth()]));}}
  const cells=[];rows.forEach((r,k)=>{const y=top+k*(rh+gap),name=daily.station_names[r.station].replace('Colorado River above Glenwood Springs','Glenwood')+' '+r.year;
    s.append(el('text',narrow?{x:left,y:y-4,class:'tick'}:{x:0,y:y+rh*.7,class:'row-title'},name));s.append(el('line',{x1:left,y1:y+rh+.5,x2:w-right,y2:y+rh+.5,class:'grid'}));
    const g=el('g',{});for(let i=0;i<days;i++){const st=r.status[i];if(st==='u')continue;const rect=el('rect',{x:(left+i*cw).toFixed(2),y:st==='q'?y:y+rh*.5,width:Math.max(.8,cw-.4).toFixed(2),height:st==='q'?rh:rh*.5});if(st==='q')rect.setAttribute('fill',KS.ramp((r.mean[i]-lo)/(hi-lo)));else rect.setAttribute('class','partial');g.append(rect);}s.append(g);cells.push({r,y});});
  const mark=el('rect',{class:'day-mark',width:Math.max(2,cw),height:rh,visibility:'hidden'});s.append(mark);const hit=el('rect',{x:left,y:top,width:w-left-right,height:h-top,class:'hit',tabindex:'0',role:'slider','aria-label':'Inspect one station day','aria-valuemin':0,'aria-valuemax':days-1,'aria-valuenow':0});s.append(hit);
  let sel={k:0,i:120};function show(){const c=cells[sel.k],r=c.r,i=sel.i,date=new Date(Date.parse(r.start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10),st=r.status[i],name=daily.station_names[r.station].replace('Colorado River above Glenwood Springs','Glenwood');
    mark.setAttribute('x',left+i*cw);mark.setAttribute('y',c.y);mark.setAttribute('visibility','visible');hit.setAttribute('aria-valuenow',i);
    const txt=st==='u'?`${name} · ${date} · no approved record`:`${name} · ${date} · ${st==='q'?'coverage-qualified':'partial day'} · observed mean ${fmt(r.mean[i],1)} °C · range ${fmt(r.min[i],1)} to ${fmt(r.max[i],1)} °C · ${pct(r.occupied[i],0)} of expected readings`;readout.textContent=txt;hit.setAttribute('aria-valuetext',txt);}
  const from=e=>{const b=s.getBoundingClientRect(),px=(e.clientX-b.left)/b.width*w,py=(e.clientY-b.top)/b.height*h;sel={k:Math.max(0,Math.min(rows.length-1,Math.floor((py-top)/(rh+gap)))),i:Math.max(0,Math.min(days-1,Math.floor((px-left)/cw)))};show();};
  hit.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')from(e);});hit.addEventListener('pointerdown',from);hit.addEventListener('focus',show);
  hit.addEventListener('keydown',e=>{const m={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowDown:[1,0],ArrowUp:[-1,0],PageDown:[0,30],PageUp:[0,-30]}[e.key];if(!m)return;e.preventDefault();sel={k:Math.max(0,Math.min(rows.length-1,sel.k+m[0])),i:Math.max(0,Math.min(days-1,sel.i+m[1]))};show();});
  const key=document.createElement('p');key.className='k-note figcap';key.innerHTML=`<i class="sw ramp-lo"></i>${lo.toFixed(1)} °C <i class="sw ramp-hi"></i>${hi.toFixed(1)} °C observed daily mean on qualified days · <i class="sw partial"></i>partial day · blank, no approved record`;host.append(key);
  return{lo,hi,days,rows:rows.length};}

/* ---------- frozen results on a shared axis ---------- */
function intervals(host,ev){const n=ev.north.primary_comparison,e=ev.north.external_transfer.comparison,g=ev.glenwood.primary_business_comparison,w=width(host,900),narrow=w<560,left=narrow?8:210,right=24,h=narrow?266:196,min=-.03,max=.02,x=v=>left+(v-min)/(max-min)*(w-left-right);
  const s=svg(host,w,h,`North Inlet paired gain ${n.paired_mae_log1p_gain.toFixed(4)} with 95% interval ${n.block_interval_95.map(v=>v.toFixed(5)).join(' to ')}. East Inlet transfer ${e.paired_mae_log1p_gain.toFixed(4)} with interval ${e.block_interval_95.map(v=>v.toFixed(5)).join(' to ')}. Positive favours the frozen model.`);
  const rowsY=narrow?[58,118]:[42,92];s.append(el('line',{x1:x(0),y1:14,x2:x(0),y2:rowsY[1]+22,class:'zero'}));for(const v of [-.03,-.02,-.01,.01,.02]){s.append(el('line',{x1:x(v),y1:rowsY[1]+16,x2:x(v),y2:rowsY[1]+22,class:'axis'}));s.append(el('text',{x:x(v),y:rowsY[1]+36,class:'tick','text-anchor':'middle'},v.toFixed(2)));}
  s.append(el('text',{x:x(0),y:rowsY[1]+36,class:'tick','text-anchor':'middle'},'0'));s.append(el('text',{x:narrow?left:w-right,y:rowsY[1]+52,class:'tick','text-anchor':narrow?'start':'end'},narrow?'log1p(FNU) error gain · right favours model':'paired gain in mean absolute log1p(FNU) error · right of zero favours the model'));
  [[n,'North Inlet, 2023–2024','held'],[e,'East Inlet transfer','failed']].forEach(([c,name,cls],k)=>{const y=rowsY[k];if(narrow)s.append(el('text',{x:left,y:y-16,class:'row-title'},name));else s.append(el('text',{x:0,y:y+4,class:'row-title'},name));
    s.append(el('line',{x1:x(c.block_interval_95[0]),y1:y,x2:x(c.block_interval_95[1]),y2:y,class:'ci '+cls}));for(const v of c.block_interval_95)s.append(el('line',{x1:x(v),y1:y-7,x2:x(v),y2:y+7,class:'ci '+cls}));s.append(el('circle',{cx:x(c.paired_mae_log1p_gain),cy:y,r:5.5,class:'est '+cls}));
    s.append(el('text',narrow?{x:x(c.block_interval_95[1])+8,y:y+4,class:'tick'}:{x:x(c.block_interval_95[k?0:1])+(k?-8:8),y:y+4,class:'tick','text-anchor':k?'end':'start'},(c.paired_mae_log1p_gain>0?'+':'')+c.paired_mae_log1p_gain.toFixed(4)));});
  const gy=h-34,gl=left,gr=w-right,gx=v=>gl+v/.2*(gr-gl);s.append(el('text',narrow?{x:left,y:gy-18,class:'row-title'}:{x:0,y:gy+4,class:'row-title'},'Glenwood precision'));s.append(el('line',{x1:gx(0),y1:gy-14,x2:gx(0),y2:gy+14,class:'zero'}));
  s.append(el('line',{x1:gx(g.paired_precision_difference_interval_95[0]),y1:gy,x2:gx(g.paired_precision_difference_interval_95[1]),y2:gy,class:'ci failed'}));s.append(el('line',{x1:gx(g.paired_precision_difference_interval_95[1]),y1:gy-7,x2:gx(g.paired_precision_difference_interval_95[1]),y2:gy+7,class:'ci failed'}));s.append(el('circle',{cx:gx(g.precision_difference),cy:gy,r:5.5,class:'est failed'}));
  s.append(el('text',narrow?{x:gl,y:gy+30,class:'tick'}:{x:gx(g.paired_precision_difference_interval_95[1])+8,y:gy+4,class:'tick'},`+${(g.precision_difference*100).toFixed(0)} points, interval ${(g.paired_precision_difference_interval_95[0]*100).toFixed(0)} to ${(g.paired_precision_difference_interval_95[1]*100).toFixed(2)}`));
  s.append(el('text',{x:gx(0),y:gy+(narrow?46:30),class:'tick'},narrow?'touches zero, more windows · gate failed':'interval touches zero and the policy used more windows · joint gate failed'));}

function features(host){const groups=[['Turbidity state',10,'on'],['Discharge',4,'on'],['Rainfall',3,'on'],['Season',2,'on'],['Ecological',0,'off']],w=width(host,900),narrow=w<700,sq=narrow?14:18,gap=4,h=narrow?150:74;const s=svg(host,w,h,'The 19 inputs of the frozen North Inlet model: 10 turbidity state, 4 discharge, 3 rainfall, 2 season, 0 ecological.');let x=0,y=narrow?16:22;
  groups.forEach(([name,n,cls])=>{const m=n||3,gw=m*(sq+gap);if(narrow&&x+gw>w){x=0;y+=62;}for(let i=0;i<m;i++)s.append(el('rect',{x:x+i*(sq+gap),y,width:sq,height:sq,class:i<n?'feat on':'feat off'}));s.append(el('text',{x,y:y+sq+16,class:'tick'},n+' · '+name));x+=gw+(narrow?18:34);});}

/* ---------- monitoring windows as sets ---------- */
function windows(host,ev,name,readout){const c=ev[name],slots=ev.schedules[name].slots,base=new Map(),model=new Map();for(const r of slots)(r.model_id===c.baseline_model_id?base:model).set(r.window_id,r);
  const sets={baseline:[...base.values()].filter(r=>!model.has(r.window_id)),shared:[...base.values()].filter(r=>model.has(r.window_id)),learned:[...model.values()].filter(r=>!base.has(r.window_id))};
  for(const k in sets)sets[k].sort((a,b)=>a.issue_time.localeCompare(b.issue_time));
  const tally=list=>({n:list.length,high:list.filter(r=>r.outcome==='high').length,nonhigh:list.filter(r=>r.outcome==='nonhigh').length,unknown:list.filter(r=>r.outcome==='unknown').length});
  const T={baseline:tally(sets.baseline),shared:tally(sets.shared),learned:tally(sets.learned),base:tally([...base.values()]),model:tally([...model.values()])};
  const learnedName=name==='north'?'Learned policy':'Classifier',cols=[['baseline','Baseline only','dropped if you switch'],['shared','Both policies','kept either way'],['learned',learnedName+' only','added if you switch']];
  const w=width(host,1180),narrow=w<620,colW=narrow?w:(w-48)/3,per=narrow?Math.floor((w-8)/26):Math.max(5,Math.floor((colW-8)/26)),cell=26;
  const heights=cols.map(([k])=>Math.ceil(Math.max(1,sets[k].length)/per)*cell),h=narrow?heights.reduce((a,b)=>a+b+74,0):Math.max(...heights)+78;
  const s=svg(host,w,h,`${name==='north'?'North Inlet':'Glenwood'} proposed monitoring windows as three sets: ${T.baseline.n} baseline only, ${T.shared.n} shared, ${T.learned.n} ${learnedName.toLowerCase()} only. Filled marks are known high outcomes, rings are known non-high, diamonds are unknown.`);
  let oy=0;cols.forEach(([k,title,sub],ci)=>{const ox=narrow?0:ci*(colW+24),t=T[k];s.append(el('text',{x:ox,y:oy+16,class:'set-n'},String(t.n)));s.append(el('text',{x:ox+(String(t.n).length*17+10),y:oy+10,class:'row-title'},title));s.append(el('text',{x:ox+(String(t.n).length*17+10),y:oy+26,class:'tick'},sub));
    s.append(el('text',{x:ox,y:oy+46,class:'tick'},`${t.high} high · ${t.nonhigh} non-high`+(t.unknown?` · ${t.unknown} unknown`:'')));s.append(el('line',{x1:ox,y1:oy+54,x2:ox+colW,y2:oy+54,class:'axis'}));
    sets[k].forEach((r,i)=>{const cx=ox+12+(i%per)*cell,cy=oy+72+Math.floor(i/per)*cell,g=el('g',{class:'win '+r.outcome,tabindex:'0',role:'button','aria-label':`${title}, issued ${r.issue_time.replace('T',' ').replace(':00Z',' UTC')}, ${r.outcome==='nonhigh'?'non-high':r.outcome} outcome`});
      g.append(el('rect',{x:cx-13,y:cy-13,width:26,height:26,class:'hit'}));if(r.outcome==='unknown')g.append(el('path',{d:`M${cx},${cy-7}l7,7l-7,7l-7,-7Z`,class:'mark'}));else g.append(el('circle',{cx,cy,r:6,class:'mark'}));
      const show=()=>{host.querySelectorAll('.win.on').forEach(n=>n.classList.remove('on'));g.classList.add('on');readout.textContent=`${r.issue_time.slice(0,10)} ${r.issue_time.slice(11,16)} → ${r.target_end.slice(11,16)} UTC · ${title.toLowerCase()} · ${r.outcome==='unknown'?'outcome unknown, still costed':r.observed_max_fnu+' FNU observed peak, '+(r.outcome==='high'?'above':'at or below')+' the '+Number(ev.schedules[name].threshold_fnu.toFixed(2))+' FNU threshold'} · proposed, never sampled`;};
      g.addEventListener('click',show);g.addEventListener('focus',show);g.addEventListener('mouseenter',show);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});s.append(g);});
    if(narrow)oy+=heights[ci]+74;});
  const key=document.createElement('p');key.className='k-note figcap';key.innerHTML='<i class="sw high"></i>known high · <i class="sw nonhigh"></i>known non-high · <i class="sw unknown"></i>unknown outcome · every mark is one proposed six-hour window';host.append(key);
  return T;}

function severity(host,fire){const f=fire[0],order=[['1','Unburned to low','c1'],['2','Low','c2'],['3','Moderate','c3'],['4','High','c4'],['5','Increased greenness','c5'],['0','Unknown','c0']],total=f.pixel_centers,w=width(host,520),h=118,s=svg(host,w,h,'Spectral change classes inside the mapped overlap of the North Inlet basin, counted as 30 m pixel centres.');let x=0;
  order.forEach(([k,name,cls])=>{const n=f.class_counts[k],bw=n/total*w;s.append(el('rect',{x,y:0,width:Math.max(1,bw-1),height:18,class:'sev '+cls}));x+=bw;});
  order.forEach(([k,name,cls],i)=>{const col=i%2,row=Math.floor(i/2),tx=col*(w/2),ty=42+row*24;s.append(el('rect',{x:tx,y:ty-10,width:10,height:10,class:'sev '+cls}));s.append(el('text',{x:tx+16,y:ty,class:'tick'},`${name} · ${f.class_counts[k].toLocaleString('en-US')}`));});
  const cap=document.createElement('p');cap.className='k-note figcap';cap.textContent=`${total.toLocaleString('en-US')} pixel centres in the mapped overlap. Classes are kept distinct. Increased greenness is its own class and sits outside the severity order.`;host.append(cap);}

function supportBars(host,ctx){const rows=[];ctx.terrain.forEach(t=>rows.push([t.name+' terrain',t.coverage,t.reaches_channel,'reaches a mapped channel',`${pct(t.pit_or_flat)} stops in pits or flats, ${pct(t.edge)} at uncertain edges`]));ctx.soil.forEach(t=>rows.push([t.name+' soil',t.coverage,t.kw_supported,'has usable erodibility values','the rest is recorded as unknown']));
  const w=width(host,440),rh=72,h=rows.length*rh,s=svg(host,w,h,'Data coverage against inferential support for terrain routing and soil erodibility in the North Inlet and East Inlet basins.');
  rows.forEach(([name,cov,sup,what,rest],i)=>{const y=i*rh;s.append(el('text',{x:0,y:y+12,class:'row-title'},name));s.append(el('rect',{x:.5,y:y+18.5,width:w*cov-1,height:12,class:'cover'}));s.append(el('rect',{x:0,y:y+18,width:w*sup,height:13,class:'support'}));s.append(el('text',{x:0,y:y+46,class:'tick'},`${pct(cov,0)} covered · ${pct(sup)} ${w<360?what.replace('has usable erodibility values','usable erodibility').replace('reaches a mapped channel','reaches a channel'):what}`));s.append(el('text',{x:0,y:y+61,class:'tick'},w<360?rest.replace(' stops in pits or flats,',' in pits or flats,').replace(' at uncertain edges',' at edges'):rest));});}

function ladder(host,passport){const stages=['Candidate','Qualified','Assessed','Suitable for a decision','Ready for structuring','Governed and monitored','In a portfolio'];host.replaceChildren();
  const ol=document.createElement('ol');ol.className='stages';stages.forEach((n,i)=>{const li=document.createElement('li');li.className=i===0?'here':'';li.innerHTML=`<i></i><span>${n}</span>`+(i===0?'<b class="k-state observed">This parcel</b>':'');ol.append(li);});host.append(ol);
  const gates=document.createElement('div');gates.className='gates';const o=passport.obligation;[['Rights and consent',o.rights],['Payer of record',o.payer],['Performance terms',o.performance]].forEach(([t,list])=>{const d=document.createElement('div');d.innerHTML=`<h3>${t}</h3><ul>${list.map(x=>`<li><span>${x}</span><i class="k-state pending">Pending</i></li>`).join('')}</ul>`;gates.append(d);});host.append(gates);
  return o.rights.length+o.payer.length+o.performance.length;}

window.KSC={species,clock,coverage,intervals,features,windows,severity,supportBars,ladder,unavailable,stamp,pct};
})();
