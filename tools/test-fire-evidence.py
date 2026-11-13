"""Affected-path tests for the lazy MTBS integration; no external data mutation."""
import argparse,json,pathlib
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--base-url',default='http://127.0.0.1:8766');parser.add_argument('--out',required=True);args=parser.parse_args();out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True);report={'checks':[],'errors':[]}
def check(name,value):
 report['checks'].append({'name':name,'passed':bool(value)});(out/'fire-integration-checks.json').write_text(json.dumps(report,indent=2));assert value,name
with sync_playwright() as w:
 b=w.chromium.launch(headless=True)
 for mode in ['map','svg','mobile','vendors-blocked']:
  c=b.new_context(viewport={'width':390,'height':844} if mode=='mobile' else {'width':1440,'height':1000},is_mobile=mode=='mobile',has_touch=mode=='mobile',reduced_motion='reduce');p=c.new_page();errors=[];requests=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
  if mode=='vendors-blocked':p.route('**/*',lambda route:route.continue_() if route.request.url.startswith(args.base_url) else route.abort())
  url=args.base_url+'/?scene=fire&mode=explore'+('' if mode=='map' else '&svg=1');p.goto(url,wait_until='networkidle');p.wait_for_function('window.__STAGE.ready')
  check(mode+' lazy perimeter',not any('mtbs-final-perimeters.geojson' in r for r in requests));check(mode+' lazy class summary',not any('mtbs-severity-summary.json' in r for r in requests))
  if mode=='mobile':p.locator('#fire-outline').tap()
  else:p.locator('#fire-outline').click()
  p.wait_for_function("document.querySelector('#fire-layer-status').textContent.includes('EAST TROUBLESOME')")
  check(mode+' outline context label','final mapped 2020 footprint' in p.locator('#fire-layer-status').inner_text())
  if p.evaluate('window.__STAGE.mode')=='svg':check(mode+' real multipolygon rings',p.locator('#g-fi path').count()==2)
  p.locator('#severity-details summary').click();p.wait_for_selector('#severity-summary tbody tr');check(mode+' spectral class table',p.locator('#severity-summary tbody tr').count()==7 and '189.8685' in p.locator('#severity-summary').inner_text());check(mode+' nodata and grid caveat',all(s in p.locator('#severity-summary').inner_text() for s in ['nodata/no mapped coverage','non-processing area','Native alignment is not established','BAER soil']))
  p.evaluate("scrollTo(0,scrollY+document.querySelector('#mapped-fire-title').getBoundingClientRect().top-80)");p.screenshot(path=str(out/(mode+'-east-fire.png')))
  p.locator('#fire-frame').select_option('et-20201025');check(mode+' date does not invent progression',p.locator('#fire-outline').get_attribute('aria-pressed')=='true' and 'final mapped 2020' in p.locator('#fire-layer-status').inner_text())
  p.locator('#incident').select_option('CO3957210726620200810');p.wait_for_function("document.querySelector('#severity-summary').textContent.includes('GRIZZLY CREEK')")
  check(mode+' separate Grizzly case','21.1167' in p.locator('#severity-summary').inner_text() and 'Separate process comparison' in p.locator('#fire-layer-status').inner_text());check(mode+' camera follows case',p.evaluate('window.__STAGE.viewState.longitude') < -107)
  check(mode+' viewport remains bounded',p.evaluate('document.documentElement.scrollWidth<=visualViewport.width+1'));check(mode+' no page errors',not errors)
  p.evaluate("scrollTo(0,scrollY+document.querySelector('#mapped-fire-title').getBoundingClientRect().top-80)");p.screenshot(path=str(out/(mode+'-fire.png')))
  p.locator('#reset').click();check(mode+' reset clears optional fire',p.evaluate('window.__HEADWATERS_APP.state.perimeter')==False and p.evaluate('window.__HEADWATERS_APP.state.incident')=='CO4020310623920201014')
  c.close()
 p=b.new_page(reduced_motion='reduce');p.goto(args.base_url+'/?svg=1&scene=fire&mode=explore&incident=CO3957210726620200810&perimeter=true',wait_until='networkidle');p.wait_for_function("document.querySelector('#fire-layer-status').textContent.includes('GRIZZLY CREEK')");check('fire URL deep link',p.locator('#g-fi path').count()==1);p.close()
 p=b.new_page();p.route('**/data/mtbs-final-perimeters.geojson',lambda route:route.fulfill(status=503,body='unavailable'));p.goto(args.base_url+'/?svg=1&scene=fire&mode=explore');p.locator('#fire-outline').click();p.wait_for_function("document.querySelector('#fire-layer-status').textContent.includes('could not load')");check('failed perimeter no fake outline',p.locator('#g-fi path').count()==0);check('failed perimeter keeps stations',p.locator('#g-st circle').count()==2);p.close()
 # Reset cancels a pending perimeter render, even when the delayed fetch succeeds.
 p=b.new_page();p.route('**/data/mtbs-final-perimeters.geojson',lambda route:(p.wait_for_timeout(300),route.continue_()));p.goto(args.base_url+'/?svg=1&scene=fire&mode=explore');p.evaluate("document.querySelector('#fire-outline').click();document.querySelector('#reset').click()");p.wait_for_timeout(600);check('pending fetch cannot undo reset',p.locator('#g-fi path').count()==0 and not p.evaluate('window.__HEADWATERS_APP.state.perimeter'));p.close()
 # A terrain failure after the layer is loaded must preserve the evidence in SVG.
 p=b.new_page(reduced_motion='reduce');pending=[]
 p.route('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',lambda route:route.fulfill(json={'version':8,'sources':{},'layers':[]}))
 p.route('https://s3.amazonaws.com/elevation-tiles-prod/**',lambda route:pending.append(route))
 p.goto(args.base_url+'/?scene=fire&mode=explore',wait_until='domcontentloaded');p.wait_for_function('window.__STAGE.ready');check('terrain fixture uses map',p.evaluate('window.__STAGE.mode')=='map');p.locator('#fire-outline').focus();p.keyboard.press('Enter');p.wait_for_function("document.querySelector('#fire-layer-status').textContent.includes('EAST TROUBLESOME')");check('keyboard toggles fire outline',p.locator('#fire-outline').get_attribute('aria-pressed')=='true')
 p.wait_for_timeout(100);check('terrain fixture has pending requests',bool(pending))
 for route in pending:route.abort()
 p.wait_for_function("window.__STAGE.mode==='svg'");check('late fallback preserves fire geometry',p.locator('#g-fi path').count()==2);p.close();b.close()
report['passed']=all(v['passed'] for v in report['checks']);(out/'fire-integration-checks.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report['passed'],'checks':len(report['checks'])}))
