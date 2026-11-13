"""Create a small display-only perimeter, preserving source hashes and stable IDs.

Requires development-only shapely and pyproj. Severity numbers are owned by the
verified Slurm summary and are not recalculated or simplified by this helper.
"""
import argparse,hashlib,json,pathlib
import shapely,pyproj
from shapely.geometry import shape,mapping
from shapely.ops import transform
from pyproj import Transformer
parser=argparse.ArgumentParser();parser.add_argument('--input',type=pathlib.Path,required=True);parser.add_argument('--output',type=pathlib.Path,required=True);parser.add_argument('--tolerance-m',type=float,default=100);args=parser.parse_args()
assert 0<args.tolerance_m<=100,'Display tolerance must be bounded at 100 m'
raw=args.input.read_bytes();source=json.loads(raw);forward=Transformer.from_crs(4326,5070,always_xy=True).transform;back=Transformer.from_crs(5070,4326,always_xy=True).transform
features=[]
for f in source['features']:
 original=shape(f['geometry']);assert original.is_valid
 simplified=transform(forward,original).simplify(args.tolerance_m,preserve_topology=True);assert simplified.is_valid and not simplified.is_empty
 geometry=transform(back,simplified)
 features.append({'type':'Feature','id':f['properties']['fire_id'],'properties':{**f['properties'],'display_tolerance_m':args.tolerance_m,'display_crs':'EPSG:5070','use':'cartographic final footprint only; not computation or time progression'},'geometry':mapping(geometry)})
output={'type':'FeatureCollection','source_sha256':hashlib.sha256(raw).hexdigest(),'processing':f'Topology-preserving simplification at {args.tolerance_m:g} m in EPSG:5070; original retained by source hash; coordinates transformed back to EPSG:4326','processor_versions':{'shapely':shapely.__version__,'pyproj':pyproj.__version__},'features':features}
args.output.write_text(json.dumps(output,separators=(',',':'))+'\n');print(hashlib.sha256(args.output.read_bytes()).hexdigest(),args.output)
