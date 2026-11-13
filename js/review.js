/* Graph of Life brand v1.0.0 · historical monitoring review.
   Pure validation/export functions also run under Node for focused contract tests. */
(function (root) {
'use strict';
const VERSION = 'keystone-monitoring-review-1.0.0';
const CASES = Object.freeze({
  north: {label:'North Inlet',station:'401530105475401',url:'data/forecast-round2.json',sha256:'316eecbf0fd3f978d2a53b32413d67fd6d38cd432d8e3255d62aceb3d12ac772',years:[2023,2024]},
  glenwood: {label:'Glenwood',station:'09071750',url:'data/monitoring-glenwood.json',sha256:'9a04ce48e4a4b0ae4f2fc286d8c23fd8cf02edc5fdf06d308faa40a8d6937c7d',years:[2024,2025]}
});
const finite = x => typeof x === 'number' && Number.isFinite(x);
const assert = (test,message) => { if (!test) throw Error(message); };
const pred = (row,id) => row.predictions.find(p => p.model_id === id);
const knownHigh = (row,d) => row.outcome_evaluable && row.observed_max_fnu > d.monitoring_policy.target_threshold_fnu;
function parseCost(value) {
  const raw = String(value).trim();
  if (!raw) return {state:'blank',cents:null};
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw)>1000000) return {state:'invalid',cents:null};
  const [whole,fraction=''] = raw.split('.');
  return {state:'valid',cents:Number(whole)*100+Number(fraction.padEnd(2,'0'))};
}
function metrics(d,rows,id) {
  const selected=rows.filter(r=>pred(r,id).alert_issued),known=selected.filter(r=>r.outcome_evaluable),high=selected.filter(r=>knownHigh(r,d));
  return {model_id:id,forecast_eligible_windows:rows.length,outcome_eligible_windows:rows.filter(r=>r.outcome_evaluable).length,high_target_windows:rows.filter(r=>knownHigh(r,d)).length,
    accepted_alerts:selected.length,accepted_alerts_known_outcome:known.length,accepted_alerts_unknown_outcome:selected.length-known.length,true_positive_accepted:high.length,false_positive_accepted:known.length-high.length,
    false_negative:rows.filter(r=>knownHigh(r,d)&&!pred(r,id).alert_issued).length,suppressed_alerts:rows.filter(r=>pred(r,id).capacity_suppressed).length,candidate_alerts:rows.filter(r=>pred(r,id).alert_candidate).length};
}
function validate(caseId,d,rows) {
  const c=CASES[caseId];assert(c,'Unknown case');
  assert(d.schema_version==='1.0.0'&&d.status==='evaluation_complete'&&d.case_id===caseId&&d.station_id===c.station,'Case identity or release mismatch');
  assert(d.provenance?.evaluation_consumed===true&&/^[a-f0-9]{64}$/.test(d.provenance.model_sha256),'Frozen model binding missing');
  assert(d.monitoring_policy?.daily_accepted_alert_cap===1&&d.monitoring_policy.daily_boundary==='UTC'&&finite(d.monitoring_policy.target_threshold_fnu),'Policy contract mismatch');
  assert(d.forecast_task.horizon_hours===6&&d.forecast_task.latency_assumption_minutes===30,'Issue contract mismatch');
  assert(Array.isArray(rows)&&rows.length===d.decision_window_count&&rows.length>0,'No complete released windows');
  const ids=[d.baseline_model_id,d.selected_model_id];assert(new Set(ids).size===2&&ids.every(id=>d.models.some(m=>m.id===id)),'Missing distinct policies');
  const seen=new Set(),days={};ids.forEach(id=>days[id]=new Set());let last=-Infinity;
  rows.forEach(r=>{
    const time=Date.parse(r.issue_time);
    assert(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(r.issue_time)&&finite(time)&&time>last,'Windows must be unique and chronological');last=time;
    assert(r.station_id===c.station&&r.window_id===c.station+':'+r.issue_time&&!seen.has(r.window_id),'Window identity mismatch');seen.add(r.window_id);
    assert(c.years.includes(new Date(time).getUTCFullYear())&&r.partition==='untouched_test','Wrong final period');
    assert(Date.parse(r.target_end)-time===21600000&&time-Date.parse(r.data_cutoff_time)===1800000,'Window timing mismatch');
    assert(typeof r.outcome_evaluable==='boolean'&&(r.outcome_evaluable?(finite(r.observed_max_fnu)&&r.observed_max_fnu>=0):r.observed_max_fnu===null),'Unknown outcome must remain unknown');
    assert(Array.isArray(r.predictions)&&r.predictions.length===2&&new Set(r.predictions.map(p=>p.model_id)).size===2,'Prediction identity mismatch');
    ids.forEach(id=>{
      const p=pred(r,id);assert(p&&['alert_issued','alert_candidate','capacity_suppressed'].every(k=>typeof p[k]==='boolean'),'Policy decision unavailable');
      assert((p.alert_issued||p.capacity_suppressed)===p.alert_candidate&&!(p.alert_issued&&p.capacity_suppressed),'Inconsistent capacity state');
      if(p.alert_issued){assert(!days[id].has(r.issue_time.slice(0,10)),'Daily capacity exceeded');days[id].add(r.issue_time.slice(0,10));}
      if(p.capacity_suppressed)assert(days[id].has(r.issue_time.slice(0,10)),'Suppression precedes accepted capacity');
      if(caseId==='glenwood')assert(p.predicted_max_fnu===null,'Classifier must not fabricate a peak forecast');
    });
  });
  const summaries=ids.map(id=>metrics(d,rows,id));
  summaries.forEach(m=>{const owning=d.allocation_metrics.find(x=>x.model_id===m.model_id&&x.split_id==='untouched_test');assert(owning&&Object.keys(m).every(k=>owning[k]===m[k]),'Released schedule does not match frozen allocation totals');});
  const base=new Set(rows.filter(r=>pred(r,ids[0]).alert_issued).map(r=>r.window_id)),selected=new Set(rows.filter(r=>pred(r,ids[1]).alert_issued).map(r=>r.window_id));
  const shared=[...base].filter(x=>selected.has(x));
  return {caseId,record:d,rows,summaries,overlap:{shared:shared.length,baseline_only:base.size-shared.length,learned_only:selected.size-shared.length,nested:[...base].every(x=>selected.has(x))||[...selected].every(x=>base.has(x))}};
}
function packet(bundle,modelId,cost,reviewer,now) {
  assert(bundle&&[bundle.record.baseline_model_id,bundle.record.selected_model_id].includes(modelId),'Selected policy unavailable');
  assert(cost.state!=='invalid','Correct the cost before exporting');
  const {record:d,rows}=bundle,c=CASES[bundle.caseId],summary=bundle.summaries.find(m=>m.model_id===modelId);
  const windowRecord=r=>({window_id:r.window_id,station_id:r.station_id,partition:r.partition,issue_time:r.issue_time,data_cutoff_time:r.data_cutoff_time,target_end:r.target_end,observed_peak_time:r.observed_peak_time,observed_max_fnu:r.observed_max_fnu,outcome_evaluable:r.outcome_evaluable,target_coverage_fraction:r.target_coverage_fraction,target_exclusion_reasons:r.target_exclusion_reasons,selected_prediction:pred(r,modelId)});
  return {schema_version:'1.0.0',designation:'historical_monitoring_review_draft',order_status:'draft only; no order placed',created_utc:now,application_version:VERSION,
    responsible_reviewer:String(reviewer||'').trim()||null,reviewer_status:'user-entered proposed reviewer; no approval recorded',review_purpose:'Review this frozen historical monitoring policy before any operational decision',case_id:bundle.caseId,station_id:c.station,station_label:c.label,release_id:d.id,task_kind:d.task_kind,
    evaluated_years:c.years,window_horizon_hours:6,timestamp_unit:'UTC',observed_turbidity_unit:'FNU',target_threshold_fnu:d.monitoring_policy.target_threshold_fnu,selected_model_id:modelId,selected_model_label:d.models.find(m=>m.id===modelId).label,
    selection_status:modelId===d.baseline_model_id?'baseline reference chosen for review':'learned policy chosen for comparison; promotion remains unsupported',allocation_summary:summary,policy_comparison:bundle.summaries,accepted_schedule_overlap:bundle.overlap,
    planning_cost:{status:cost.state==='blank'?'unpriced':'user_assumption',currency:'USD',unit:'per proposed monitoring slot',cost_per_slot_usd:cost.cents===null?null:cost.cents/100,cost_per_slot_cents:cost.cents,total_proposed_slots:summary.accepted_alerts,includes_unknown_outcomes:true,total_usd:cost.cents===null?null:cost.cents*summary.accepted_alerts/100,total_cents:cost.cents===null?null:cost.cents*summary.accepted_alerts,scope:'Planning assumption only. No quoted price, incurred cost, saving or ROI.'},
    proposed_windows:rows.filter(r=>pred(r,modelId).alert_issued).map(windowRecord),suppressed_candidates:rows.filter(r=>pred(r,modelId).capacity_suppressed).map(windowRecord),
    monitoring_policy:d.monitoring_policy,forecast_task:d.forecast_task,provenance:d.provenance,source_records:d.sources,
    public_source_binding:{public_base_url:'https://jaygut.github.io/upper-colorado-corridor-landing/',record_url:c.url,record_sha256:c.sha256,window_url:d.decision_windows_url,window_sha256:d.decision_windows_sha256,finance_ledger_url:'data/finance-evidence-ledger.json',finance_ledger_sha256:d.finance_evidence_ledger_sha256},
    operational_acceptance_required:['Named reviewer and decision owner','Access, consent and sampling feasibility','Sampling design and laboratory chain of custody','Actual unit-cost scope and quote','Prospective live data availability and service evaluation'],
    boundaries:['Historical replay; no live forecast or field instruction','Proposed slots are not completed samples or laboratory results','Allocation precedes future outcome coverage; unknown accepted outcomes still consume slots','A sample at issue time is not proven to capture the future peak','Neither learned policy earned promotion; schedules are not assumed nested','Eagle County parcel and this monitoring station are separate cases, with no verified benefit-delivery connection','No causal treatment effect, financial return, credit, payout or financing approval']};
}
function csvCell(value) { let s=value==null?'':String(value);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'; }
function packetCSV(p) {
  const records=p.proposed_windows.map(r=>({designation:p.designation,order_status:p.order_status,created_utc:p.created_utc,application_version:p.application_version,case_id:p.case_id,station_id:p.station_id,release_id:p.release_id,model_id:p.selected_model_id,window_id:r.window_id,issue_time_utc:r.issue_time,data_cutoff_time_utc:r.data_cutoff_time,target_end_utc:r.target_end,observed_max_fnu:r.observed_max_fnu,outcome_evaluable:r.outcome_evaluable,high_threshold_fnu:p.target_threshold_fnu,alert_issued:r.selected_prediction.alert_issued,capacity_suppressed:r.selected_prediction.capacity_suppressed,predicted_max_fnu:r.selected_prediction.predicted_max_fnu,probability_exceedance:r.selected_prediction.probability_exceedance,raw_policy_score:r.selected_prediction.raw_policy_score,raw_policy_score_kind:r.selected_prediction.raw_policy_score_kind,planning_cost_per_slot_usd:p.planning_cost.cost_per_slot_usd,planning_total_usd:p.planning_cost.total_usd,responsible_reviewer:p.responsible_reviewer,model_sha256:p.provenance.model_sha256,contract_sha256:p.provenance.contract_sha256,evaluation_sha256:p.provenance.evaluation_sha256,record_sha256:p.public_source_binding.record_sha256,window_source_sha256:p.public_source_binding.window_sha256,review_limit:'Historical review only; no order, completed sample or guaranteed future-peak capture'}));
  if(!records.length)return 'designation,order_status\n'+csvCell(p.designation)+','+csvCell(p.order_status)+'\n';
  return Object.keys(records[0]).map(csvCell).join(',')+'\n'+records.map(r=>Object.values(r).map(csvCell).join(',')).join('\n')+'\n';
}
const api={VERSION,CASES,parseCost,validate,packet,packetCSV};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document==='undefined')return;
const by=id=>document.getElementById(id),node=(tag,text,attrs={})=>{const n=document.createElement(tag);n.textContent=text;Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100),number=x=>Number(x.toPrecision(6)).toString();
let bundle=null,selectedModel='',generation=0,controller=null,page=0,activeCase='north',loading=false;
function cost(){return parseCost(by('unit-cost').value);}
function setURL(caseId,replace=false){const u=new URL(location.href);u.search='';u.searchParams.set('case',caseId);if(!replace)u.hash='';(replace?history.replaceState:history.pushState).call(history,null,'',u.pathname+u.search+u.hash);}
function resetInputs(){by('unit-cost').value='';by('reviewer').value='';by('schedule-filter').value='accepted';by('export-status').textContent='';page=0;}
async function checkedJSON(url,expected,signal) {const r=await fetch(url,{signal,cache:'no-cache'});if(!r.ok)throw Error('Source unavailable (HTTP '+r.status+')');const bytes=await r.arrayBuffer();assert(root.crypto?.subtle,'This browser cannot verify source integrity');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');assert(hash===expected,'Source integrity mismatch');return JSON.parse(new TextDecoder().decode(bytes));}
async function load(caseId,{push=false}={}) {
  if(!CASES[caseId]){++generation;controller?.abort();bundle=null;loading=false;activeCase=caseId;by('loaded-review').hidden=true;by('retry').hidden=true;by('load-status').textContent='This case is unavailable for monitoring review. Choose North Inlet or Glenwood; no policy is inferred for another station.';document.querySelectorAll('input[name=case]').forEach(n=>n.checked=false);return;}
  const token=++generation;controller?.abort();controller=new AbortController();activeCase=CASES[caseId]?caseId:'north';bundle=null;selectedModel='';loading=true;resetInputs();by('loaded-review').hidden=true;by('retry').hidden=true;
  document.querySelectorAll('input[name=case]').forEach(n=>n.checked=n.value===activeCase);by('load-status').textContent='Loading and verifying '+CASES[activeCase].label+'…';by('download-json').disabled=true;by('download-csv').disabled=true;if(push)setURL(activeCase);else setURL(activeCase,true);
  try {const c=CASES[activeCase],d=await checkedJSON(c.url,c.sha256,controller.signal);assert(d.decision_windows_url==='data/monitoring-'+activeCase+'-windows.json','Unexpected window source');const rows=await checkedJSON(d.decision_windows_url,d.decision_windows_sha256,controller.signal);const checked=validate(activeCase,d,rows);if(token!==generation)return;bundle=checked;selectedModel=d.baseline_model_id;loading=false;render();by('loaded-review').hidden=false;by('load-status').textContent='Verified frozen record · '+rows.length.toLocaleString('en-US')+' issued historical windows.';if(location.hash==='#investment'){const section=by('investment');section.focus({preventScroll:true});section.scrollIntoView({behavior:'instant',block:'start'});}
  } catch(e) {if(token!==generation)return;loading=false;bundle=null;by('load-status').textContent='This record could not be verified. No schedule or cost is inferred. '+e.message;by('retry').hidden=false;}
}
function render() {
  const d=bundle.record,c=CASES[activeCase];by('case-context').textContent=c.label+' · USGS '+c.station+' · '+c.years.join('–')+' · high threshold '+number(d.monitoring_policy.target_threshold_fnu)+' FNU';
  by('promotion-boundary').textContent=activeCase==='north'?'The peak forecast improved historical accuracy. Its monitoring policy did not earn promotion: more proposed slots, fewer known high outcomes.':'The classifier did not pass the frozen business gate. It proposed more slots; its precision-gain interval included zero.';
  const host=by('policy-rows');host.replaceChildren();const max=Math.max(...bundle.summaries.map(m=>m.accepted_alerts));
  bundle.summaries.forEach((m,i)=>{const label=node('label','',{class:'policy-row'}),choice=node('span','',{class:'policy-choice'}),input=node('input','',{type:'radio',name:'policy',value:m.model_id});input.checked=m.model_id===selectedModel;input.addEventListener('change',()=>{selectedModel=m.model_id;page=0;by('export-status').textContent='';renderSchedule();renderDraft();});const title=node('span','');title.append(node('span',i===0?'Baseline reference':'Learned policy',{class:'policy-name'}),node('span',d.models.find(x=>x.id===m.model_id).label,{class:'policy-role'}));choice.append(input,title);
    const proof=node('span','',{class:'outcome-copy'});proof.append(node('span',m.accepted_alerts+' proposed slots',{class:'metric'}));const bar=node('span','',{class:'schedule-bar','aria-hidden':'true'});bar.style.width=(m.accepted_alerts/max*100)+'%';[['high',m.true_positive_accepted],['nonhigh',m.false_positive_accepted],['unknown',m.accepted_alerts_unknown_outcome]].forEach(([name,count])=>{if(count){const seg=node('span','',{class:name});seg.style.flex=String(count);bar.append(seg);}});proof.append(bar,node('span',m.true_positive_accepted+' high',{class:'high'}),document.createTextNode(' · '+m.false_positive_accepted+' non-high · '),node('span',m.accepted_alerts_unknown_outcome+' unknown',{class:m.accepted_alerts_unknown_outcome?'unknown':''}));label.append(choice,proof);host.append(label);});
  const o=bundle.overlap;by('set-comparison').textContent=o.shared+' proposed windows shared · '+o.baseline_only+' baseline-only · '+o.learned_only+' learned-only. '+(o.nested?'Review the actual schedules below.':'The schedules are not nested: the learned policy is not simply the baseline plus extra slots.');
  by('policy-rule').textContent=d.monitoring_policy.policy_description;by('deep-evidence').href='evidence.html?scene=decision&desk=monitoring&station='+c.station+'&forecastCase='+activeCase;
  const src=by('source-record');src.replaceChildren();src.append(node('p','SOURCE · frozen public '+c.label+' release. METHOD · exact SHA-256 verification plus schedule-to-summary reconciliation. CONFIDENCE · historical test under declared latency, not prospective field validation. USE · monitoring review only.',{class:'proof'}));const list=node('ul','',{class:'source-list'});
  [['Public record',c.url,c.sha256],['Complete derived windows',d.decision_windows_url,d.decision_windows_sha256],['Financing evidence ledger','data/finance-evidence-ledger.json',d.finance_evidence_ledger_sha256]].forEach(([title,url,hash])=>{const li=node('li',''),a=node('a',title,{href:url});li.append(a,node('div','SHA-256 '+hash,{class:'proof'}));list.append(li);});src.append(list,node('p','Frozen model '+d.provenance.model_sha256,{class:'proof'}),node('p','Application '+VERSION+' · model frozen '+d.provenance.model_frozen_utc+' · historical outcomes opened '+d.provenance.test_outcomes_opened_utc+'. The evaluation is consumed.',{class:'proof'}));renderSchedule();renderDraft();
}
function renderSchedule() {
  if(!bundle)return;const filter=by('schedule-filter').value,d=bundle.record;
  const rows=bundle.rows.filter(r=>{const p=pred(r,selectedModel);if(filter==='accepted')return p.alert_issued;if(filter==='suppressed')return p.capacity_suppressed;if(filter==='unknown')return p.alert_issued&&!r.outcome_evaluable;return pred(r,d.baseline_model_id).alert_issued!==pred(r,d.selected_model_id).alert_issued;});
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/20)-1));const h=by('schedule-table');h.replaceChildren();
  if(!rows.length)h.append(node('p','No windows in this category. No missing outcome is treated as zero.'));
  else {const t=node('table',''),head=node('thead',''),tr=node('tr',''),body=node('tbody','');['Issue → target end · UTC','Baseline','Learned','Observed maximum'].forEach(x=>tr.append(node('th',x,{scope:'col'})));head.append(tr);rows.slice(page*20,page*20+20).forEach(r=>{const row=node('tr','');row.append(node('td',r.issue_time.slice(0,16).replace('T',' ')+' → '+r.target_end.slice(0,16).replace('T',' ')));[d.baseline_model_id,d.selected_model_id].forEach(id=>{const p=pred(r,id);row.append(node('td',p.alert_issued?'Proposed':p.capacity_suppressed?'Capacity suppressed':'Not proposed'));});row.append(node('td',r.outcome_evaluable?number(r.observed_max_fnu)+' FNU · '+(knownHigh(r,d)?'high':'non-high'):'Unknown · inadequate coverage'));body.append(row);});t.append(node('caption','Frozen policy decisions · outcome observed afterward'),head,body);h.append(t);}
  by('previous-rows').disabled=page===0;by('next-rows').disabled=(page+1)*20>=rows.length;by('row-status').textContent=rows.length?'Rows '+(page*20+1)+'–'+Math.min((page+1)*20,rows.length)+' of '+rows.length:'0 windows';
}
function renderDraft() {
  if(!bundle)return;const d=bundle.record,m=bundle.summaries.find(x=>x.model_id===selectedModel),v=cost();
  by('unit-cost').setAttribute('aria-invalid',v.state==='invalid'?'true':'false');by('unit-cost').setCustomValidity(v.state==='invalid'?'Enter a nonnegative USD amount, up to 1,000,000, with at most two decimal places.':'');by('cost-error').textContent=v.state==='invalid'?'Use a nonnegative USD amount with up to two decimal places (maximum 1,000,000), or leave it blank.':'';
  by('draft-title').textContent=CASES[activeCase].label+' · '+CASES[activeCase].years.join('–');by('draft-policy').textContent=d.models.find(x=>x.id===selectedModel).label+' · '+m.accepted_alerts+' proposed slots, including '+m.accepted_alerts_unknown_outcome+' with unknown outcomes.';
  by('cost-preview').textContent=v.cents===null?(v.state==='invalid'?'Correct the cost to export.':'Unpriced · no cost assumption entered'):money(v.cents)+' × '+m.accepted_alerts+' slots = '+money(v.cents*m.accepted_alerts)+' planned';
  by('reviewer-preview').textContent='Responsible reviewer: '+(by('reviewer').value.trim()||'not assigned')+'. No approval recorded.';by('download-json').disabled=v.state==='invalid';by('download-csv').disabled=v.state==='invalid';
}
function currentPacket(){assert(!loading&&bundle&&bundle.caseId===activeCase,'No verified case selected');return packet(bundle,selectedModel,cost(),by('reviewer').value,new Date().toISOString());}
function download(kind){try{const p=currentPacket(),body=kind==='json'?JSON.stringify(p,null,2)+'\n':packetCSV(p),url=URL.createObjectURL(new Blob([body],{type:kind==='json'?'application/json':'text/csv;charset=utf-8'})),a=node('a','',{href:url,download:'historical-monitoring-review-'+p.case_id+'-'+(selectedModel===bundle.record.baseline_model_id?'baseline':'learned')+'.'+kind});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);by('export-status').textContent='Downloaded a historical review draft. No order was placed and no reviewer was notified.';}catch(e){by('export-status').textContent='Export unavailable: '+e.message;}}
function boot(){document.querySelectorAll('input[name=case]').forEach(n=>n.addEventListener('change',()=>load(n.value,{push:true})));by('retry').onclick=()=>load(activeCase);by('unit-cost').oninput=()=>{by('export-status').textContent='';renderDraft();};by('reviewer').oninput=renderDraft;by('schedule-filter').onchange=()=>{page=0;renderSchedule();};by('previous-rows').onclick=()=>{page--;renderSchedule();};by('next-rows').onclick=()=>{page++;renderSchedule();};by('download-json').onclick=()=>download('json');by('download-csv').onclick=()=>download('csv');by('reset-review').onclick=()=>{resetInputs();selectedModel=bundle.record.baseline_model_id;render();by('policy-rows').querySelector('input').focus();};window.addEventListener('popstate',()=>{const nextCase=new URLSearchParams(location.search).get('case')||'north';if(nextCase!==activeCase)load(nextCase);});load(new URLSearchParams(location.search).get('case')||'north');}
root.__REVIEW_APP={...api,currentPacket,get bundle(){return bundle;},get loading(){return loading;},get activeCase(){return activeCase;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(typeof window==='undefined'?globalThis:window);
