"""Build truthful no-JavaScript round-two summaries from the public export."""
import hashlib,html,json,pathlib,re
R=pathlib.Path(__file__).resolve().parent.parent;D=json.loads((R/'data/forecast-round2.json').read_text());esc=lambda v:html.escape(str(v))
assert D['schema_version']=='1.0.0' and D['status'] in {'pending_release','evaluation_complete','blocked'}
def value(v):return 'unavailable' if v is None else f'{v:.6g}'
def percent(v):return 'unavailable' if v is None else f'{100*v:.1f}%'
content='<p>'+esc(D['summary'])+'</p><p class="proof">'+esc(D['forecast_task']['issue_validity'])+'</p>'
for s in D['split_ledger']:content+='<p><strong>'+esc(s['label'])+'</strong> · '+esc(', '.join(s['periods']) or 'period not released')+'<br>'+esc(s['availability_note'])+'</p>'
if D['status']=='evaluation_complete':
 content+='<table><caption>Published round-two metrics; development and test are separate</caption><thead><tr><th>Partition / model</th><th>Metric</th><th>Value / unit</th></tr></thead><tbody>'
 for row in D['evaluations']:
  for m in row['metrics']:content+='<tr><td>'+esc(row['split_id']+' / '+row['model_id'])+'</td><td>'+esc(m['label'])+'</td><td>'+esc(value(m['value']))+' '+esc(m['unit'])+'</td></tr>'
 content+='</tbody></table>'
content+='<p class="caveat">'+esc(D['conclusion']['headline'])+'</p><a href="data/forecast-round2.json" download>Download the round-two evidence record</a>'
monitoring='<p>'+esc(D['summary'])+'</p>'
if D['status']=='evaluation_complete' and D.get('monitoring_policy'):
 policy=D['monitoring_policy'];monitoring+='<p>Development-training 90th-percentile threshold: '+esc(value(policy.get('target_threshold_fnu')))+' FNU. Descriptive research threshold, not a regulatory standard. Frozen alert thresholds target at most 10% development candidate alerts. The first threshold crossing per UTC day receives one proposed monitoring-window slot, before future outcome coverage is known. Later candidates are suppressed.</p><table><caption>Untouched-test monitoring allocation · proposed windows, not completed samples</caption><thead><tr><th>Strategy</th><th>Proposed / forecast windows</th><th>Known / unknown outcomes among proposed</th><th>Precision / recall</th><th>False alerts / suppressed</th></tr></thead><tbody>'
 for row in D.get('allocation_metrics',[]):
  if row['split_id']!='untouched_test' or row['model_id'] not in [D.get('selected_model_id'),D.get('baseline_model_id')]:continue
  cells=[row['model_id'],value(row.get('accepted_alerts'))+' / '+value(row.get('forecast_eligible_windows')),value(row.get('accepted_alerts_known_outcome'))+' / '+value(row.get('accepted_alerts_unknown_outcome')),percent(row.get('precision'))+' / '+percent(row.get('recall')),value(row.get('false_positive_accepted'))+' / '+value(row.get('suppressed_alerts'))]
  monitoring+='<tr>'+''.join('<td>'+esc(c)+'</td>' for c in cells)+'</tr>'
 monitoring+='</tbody></table><p>Precision uses proposed windows with known outcomes; recall uses known high-target windows. Unknown outcomes stay separate. No guaranteed six-hour warning lead. A sample at issue time is not proven to capture a future peak.</p><p>Hypothetical laboratory spend = user cost per planned test × proposed monitoring windows, assuming one test per window. No cost was entered in this static view. No ROI, avoided loss, invoice or payment is inferred.</p>'
ledger=D.get('finance_evidence_ledger')
if ledger:
 raw=(R/'data/finance-evidence-ledger.json').read_bytes();assert json.loads(raw)==ledger,'Embedded finance record differs from downloadable record';assert hashlib.sha256(raw).hexdigest()==D['finance_evidence_ledger_sha256'],'Finance record hash mismatch'
 monitoring+='<details><summary>Financing evidence and current gaps</summary><table><caption>No financing approval inferred from this record</caption><thead><tr><th>Evidence needed</th><th>Status</th></tr></thead><tbody>'+''.join('<tr><td>'+esc(g['label'])+'</td><td>'+esc(g['status'].replace('_',' '))+'</td></tr>' for g in ledger['gates'])+'</tbody></table><p>Missing rights, verified field evidence and a calibrated treatment effect prevent funding, payout or credit claims.</p><a href="data/finance-evidence-ledger.json" download>Download the full financing evidence ledger</a></details>'
page=R/'index.html';s=page.read_text()
for id,body in [('forecast-static',content),('monitoring-static',monitoring)]:
 pattern=r'(<div id="'+id+r'">).*?(</div>)';s,n=re.subn(pattern,lambda m:m[1]+body+m[2],s,flags=re.S);assert n==1,('Missing static element',id)
page.write_text(s);print('Built round-two fallbacks: '+D['status'])
