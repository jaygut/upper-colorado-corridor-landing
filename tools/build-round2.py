"""Compile accessible evidence for both distinct tasks; check every public data dependency."""
import hashlib,html,json,pathlib,re
R=pathlib.Path(__file__).resolve().parent.parent;esc=lambda v:html.escape(str(v));cases=[json.loads((R/'data'/name).read_text()) for name in ['forecast-round2.json','monitoring-glenwood.json'] if (R/'data'/name).exists()]
def value(v):return 'unavailable' if v is None else f'{v:.6g}'
def pct(v):return 'unavailable' if v is None else f'{100*v:.1f}%'
forecast='';monitoring=''
for d in cases:
 assert d['schema_version']=='1.0.0' and d['status'] in {'pending_release','evaluation_complete','blocked'}
 path='data/monitoring-glenwood.json' if d.get('case_id')=='glenwood' else 'data/forecast-round2.json'
 if d.get('decision_windows_url'):
  raw=(R/d['decision_windows_url']).read_bytes();assert hashlib.sha256(raw).hexdigest()==d['decision_windows_sha256'];assert len(json.loads(raw))==d['decision_window_count']
 forecast+='<h4>'+esc(d['title'])+'</h4><p>'+esc(d['summary'])+'</p><p class="proof">'+esc(d['forecast_task']['issue_validity'])+'</p>'
 for s in d['split_ledger']:forecast+='<p><strong>'+esc(s['label'])+'</strong> · '+esc(', '.join(s['periods']) or 'period not released')+'<br>'+esc(s['availability_note'])+'</p>'
 if d['status']=='evaluation_complete':
  forecast+='<table><caption>Case-specific metrics; development and test remain separate</caption><thead><tr><th>Partition / model</th><th>Metric</th><th>Value / unit</th><th>Support n</th></tr></thead><tbody>'
  for row in d['evaluations']:
   for m in row['metrics']:forecast+='<tr><td>'+esc(row['split_id']+' / '+row['model_id'])+'</td><td>'+esc(m['label'])+'</td><td>'+esc(value(m['value']))+' '+esc(m['unit'])+'</td><td>'+esc(m['n'])+'</td></tr>'
  forecast+='</tbody></table>'
 forecast+='<p class="caveat">'+esc(d['conclusion']['headline'])+'</p><ul>'+''.join('<li>'+esc(x)+'</li>' for x in d['conclusion'].get('limitations',[]))+'</ul><a href="'+path+'" download>Download this case evidence record</a>'
 monitoring+='<h4>'+esc(d['title'])+'</h4><p>'+esc(d['summary'])+'</p>'
 if d['status']=='evaluation_complete' and d.get('monitoring_policy'):
  policy=d['monitoring_policy'];monitoring+='<p>Development-training 90th-percentile threshold: '+esc(value(policy.get('target_threshold_fnu')))+' FNU. Descriptive research threshold, not a regulatory standard. '+esc(policy['policy_description'])+'</p><table><caption>Untouched-test allocation · proposed windows, not completed samples</caption><thead><tr><th>Strategy</th><th>Proposed / forecast windows</th><th>Known / unknown proposed outcomes</th><th>Precision / recall</th><th>High / false / missed</th></tr></thead><tbody>'
  for row in d['allocation_metrics']:
   cells=[row['model_id'],value(row.get('accepted_alerts'))+' / '+value(row.get('forecast_eligible_windows')),value(row.get('accepted_alerts_known_outcome'))+' / '+value(row.get('accepted_alerts_unknown_outcome')),pct(row.get('precision'))+' / '+pct(row.get('recall')),value(row.get('true_positive_accepted'))+' / '+value(row.get('false_positive_accepted'))+' / '+value(row.get('false_negative'))];monitoring+='<tr>'+''.join('<td>'+esc(c)+'</td>' for c in cells)+'</tr>'
  monitoring+='</tbody></table><p>Precision uses proposed windows with known outcomes; recall uses known high-target windows. Unknown outcomes stay separate. No guaranteed six-hour warning lead. A sample at issue time is not proven to capture a future peak.</p><p>Hypothetical laboratory spend = explicit user cost per planned test × ALL proposed monitoring windows, including unknown outcomes. No cost was entered in this static view. No ROI, saving, invoice or payment is inferred.</p>'
 ledger=d.get('finance_evidence_ledger')
 if ledger:
  raw=(R/'data/finance-evidence-ledger.json').read_bytes();assert json.loads(raw)==ledger;assert hashlib.sha256(raw).hexdigest()==d['finance_evidence_ledger_sha256']
ledger=cases[0].get('finance_evidence_ledger')
if ledger:monitoring+='<details><summary>Financing evidence and current gaps</summary><table><caption>No financing approval inferred</caption><thead><tr><th>Evidence needed</th><th>Status</th></tr></thead><tbody>'+''.join('<tr><td>'+esc(g['label'])+'</td><td>'+esc(g['status'].replace('_',' '))+'</td></tr>' for g in ledger['gates'])+'</tbody></table><p>Missing rights, verified field evidence and a calibrated treatment effect prevent funding, payout or credit claims.</p><a href="data/finance-evidence-ledger.json" download>Download the financing evidence ledger</a> · <a href="data/investment-evidence-register.csv" download>Download investment evidence register</a></details>'
page=R/'evidence.html';s=page.read_text()
for id,body in [('forecast-static',forecast),('monitoring-static',monitoring)]:
 pattern=r'(<div id="'+id+r'">).*?(</div>)';s,n=re.subn(pattern,lambda m:m[1]+body+m[2],s,flags=re.S);assert n==1,('Missing static element',id)
page.write_text(s);print('Built round-two case fallbacks:',len(cases))
