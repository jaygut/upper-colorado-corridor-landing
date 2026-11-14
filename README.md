<!-- Graph of Life brand v1.0.0 · canonical tokens.json; IBM Plex Sans / IBM Plex Mono -->
# Keystone Polygon experience

`index.html` is a nine-chapter spatial story built around one real Eagle County parcel. A scroll-driven camera moves over real 3D terrain. Satellite imagery is lit only inside the geometry that currently has evidence support: the parcel, its 500 m context, its 1 km neighbourhood, and later the two basins associated with the Grand Lake stations. The story follows one chain from polygon to obligation and shows where it holds and where it breaks. A Keystone Polygon is a candidate for disproportionate importance to a named recipient. No Colorado parcel is validated as one.

The living context is organised as Structure, Composition, Condition and Function. Structure uses 2023 NLCD cells clipped to the parcel and exact mapped overlap with wetland and protected-area inventories. Composition uses the reviewed public subset of 45 bird records in 26 provider species-name groups from the 1 km neighbourhood, with coordinates withheld. Condition on the parcel is unmeasured. Function is unvalidated. Water temperature, rainfall, discharge and turbidity belong to separate stations and are shown on their own ground.

`passport.html` is the candidate file. It holds the ecological passport, a mechanism choice, an editable next observation with a budget line in the visitor's own figures, an evidence-to-obligation register with every field pending by default, and JSON and Markdown exports with source hashes. `review.html?case=north|glenwood` remains the historical monitoring budget review. `evidence.html` keeps full methods and negative benchmarks. `legacy.html` keeps the historical screening display behind an archive notice.

Story routes use `?chapter=polygon|living|spillover|measured|clock|forecast|windows|obligation|next` with an optional `&step=`. Earlier `?chapter=dependency|fire|observation|evidence|decision` links resolve to the new chapters. `?scene=` and `?forecastCase=` still redirect to the evidence desk. `?svg=1` forces the flat vector stage, which is also the automatic fallback when WebGL, the map library, imagery or terrain tiles are unavailable.

Public data added in this release are the five R4 allowlisted payloads in `data/r4/`, copied byte for byte, and compact visual formats in `data/keystone/` derived from them and from frozen public files already in the repository. `data/claim-source-map.json` binds each public claim to files by SHA256. `data/data-inventory.json` lists every source layer with its inclusion or exclusion and the reason.

The stack is static HTML, CSS and vanilla JavaScript with MapLibre GL from a CDN. No framework, backend or package dependency was added. Terrain comes from the public Terrain Tiles dataset on AWS. Serve from the repository root:

```bash
python3 tools/build-keystone.py
```

```bash
python3 -m http.server 8769 --bind 127.0.0.1
```

`tools/build-keystone.py` checks the five R4 hashes, writes `data/keystone/*`, the claim map, the inventory and `index.html` (head, embedded checked parcel and `tools/index.body.html`). Repeating it produces identical bytes. `tools/build-experience.py` and the earlier generators remain for the retained adapters and are no longer used to write `index.html`.

Brand gate:

```bash
python3 brand/brandlint.py index.html passport.html review.html css/keystone-base.css css/keystone-story.css css/passport.css css/review.css js/keystone-stage.js js/keystone-gl.js js/keystone-charts.js js/keystone-story.js js/passport.js js/review.js tools/build-keystone.py tools/passport_register.py README.md
```

The preceding public release is `1329308f8a0a153549bb1973f30638307d8cb616`. To roll back, revert the release commit on `main` and push. The material below is preserved historical documentation. Its older product assertions and route descriptions do not define current validated capability.

---

# The Upper Colorado Corridor

A data-driven, cinematic scrollytelling landing for **Spillover Predictor** (a Graph of Life
engine), built entirely from a real run of the `upper_colorado_corridor_mvp` case.

Some parcels of land quietly hold up the water, the farms and the towns downstream of them.
This engine finds those parcels (the **keystone polygons**), names who depends on each one,
and scores that dependency with honest uncertainty, so nature can be underwritten like the
infrastructure it already is. Then it does the rare thing: it lets 232 real monitoring stations
grade it, and reports, in public, that its ecological scores do not yet beat a simple
two-variable baseline. That reckoning is the story.

**Live:** https://jaygut.github.io/upper-colorado-corridor-landing/

## What it is

- **A real watershed map, not a toy.** deck.gl data layers composited over a MapLibre GL
  dark-matter basemap with a DEM hillshade, rendering the corridor's real river network (USGS
  NHDPlus HR named streams), the HUC-8 watershed frame (USGS WBD), reservoirs, and, on top, the
  keystone/spillover graph: 56 candidate parcels (hollow = seed envelope, filled = verified
  boundary, sized by p(K)), 232 WQP/NWIS monitoring stations, and the parcel to beneficiary arcs.
- **Every number traces to the run.** Corridor figures come from `data/bundle.js`
  (`window.APP_DATA`); the geometry from `data/geo.js` and `data/hydro.js`.
- **Honesty by construction.** The headline result is a negative one and it is the hero, not a
  footnote. No corridor-level dollar-at-risk or cap rate is invented (the only `$` figure is the
  external ~$700B market gap, clearly labelled as market-wide context). Scene-8 out-of-sample
  figures come from the pre-registered evidence report; the recalibration recomputes the posterior
  live from the engine's own precision-weighted Bayesian update.
- **Dual-legible.** Ships human-readable and agent-consumable (`llms.txt`) for the agentic economy.

## Run locally

Static site, no build step. Serve it over HTTP:

```bash
python3 -m http.server 8080
# open http://localhost:8080/
```

The map basemap needs network at view time; with no basemap it degrades to a dark canvas, and
with no WebGL at all it falls back to an animated d3/SVG map (`?svg=1` forces it) drawn from the
same geometry.

## Scientific foundation of the keystone polygon

Species to structure to polygon: Paine 1966 (keystone species, structural not abundance
influence) to Tews et al. 2004 (keystone structures) to Loreau et al. 2003 (meta-ecosystem
cross-boundary flows) and Bagstad et al. 2013 (ecosystem-service servicesheds) to Urban and Keitt
2001 (graph centrality of habitat patches). Naming the land polygon as the underwriting unit is
the new synthesis, set out in "The Land Next Door".

---

Built by Jay Gutierrez, PhD. In collaboration with Thomas (TMO) Morgan, Founder, BASIN Natural
Capital. Data: USGS, EPA, USDA, GBIF. A Graph of Life platform.


## Headwaters local review, 2026-11-13

The new six-chapter entry reuses `js/stage.js`, MapLibre GL 4.7.1, deck.gl 9.0.0,
D3 v7 and Scrollama 3.2.0. There is no new framework, backend or production build.
The original entry is retained at `legacy.html`; original data exports are unchanged.

Serve with `python3 -m http.server 8766 --bind 127.0.0.1` and open
`http://127.0.0.1:8766/`. For fallback use `?svg=1`. Chapter/state example:
`?scene=pathway&station=09013500&event=coverage-pending&mode=explore&svg=1`.

`data/headwaters-evidence.json` is the source of truth. Run
`python3 tools/build-evidence.py` after changing it. `data/headwaters.js` is generated.
Event records load only when their chapter is opened. Optional geometry is not
prefetched. No replay runs automatically. Missing values stay null and break lines.
The current release abstains on new event skill and intervention rankings.

The original North candidate 09012500 was rejected as the paired-study station.
The published North study gauge is 401530105475401. Public inventory coordinates
are not a verified flow path or a confirmed buyer asset.

Brand tokens are copied from the Graph of Life skill to `brand/tokens.json`.
`brand/runtime.css` resolves colors, typography and spacing. Run the brand gate
on the new entry and changed renderer with:
`python3 brand/brandlint.py index.html css/headwaters.css js/headwaters.js js/stage.js brand/runtime.css`.
Historical archived styling is preserved separately in `legacy.html` and `css/{brand,page}.css`.

For local browser verification, use `python3 tools/test-headwaters.py --base-url http://127.0.0.1:8766 --out /absolute/output/path`.
Playwright is a development-only verification tool already available on this Mac.
No browser runtime dependency was added.

Publication remains gated. Review source rights, scientific claims, accessibility,
all changed files and preserved exports before any separately authorized deployment.
Rollback reference is `5dac603ace8423b0cba52cf4947e4cf435eedbd4`.

The optional MTBS layer shows final 2020 fire footprints. It is independent of
the dated fire accounts. East Troublesome and Grizzly Creek retain separate IDs
and map views. The lazy class table is a retrospective spectral-severity summary,
not BAER soil severity. The requested 30 m EPSG:5070 grid does not establish native
alignment; East Troublesome's revised 2026 boundary and the annual 2020 mosaic have
an unresolved edition mismatch. Neither is eligible prefire issue-time evidence.

`tools/build-fire-display.py --input /path/to/mtbs_fire_boundaries.geojson
--output data/mtbs-final-perimeters.geojson` reproduces the display simplification
with development-only Shapely and PyProj (versions recorded in the output).
The 100 m topology-preserving simplification is for display, never area statistics.
The summary retains the checked source file and raster hashes from Slurm 29749.
`python3 tools/test-fire-evidence.py --base-url http://127.0.0.1:8766
--out /absolute/output/path` verifies the added controls, lazy loading and fallback.
