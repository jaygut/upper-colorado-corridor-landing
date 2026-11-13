<!-- Graph of Life brand v1.0.0 · canonical tokens.json; IBM Plex Sans / IBM Plex Mono -->
# Keystone Polygon experience

The current entry is a seven-scene spatial story. An exact Eagle County parcel appears as an imagery-filled object, opens into river context, and returns at the close. A clearly separate Grand Lake scene shows associated basins and mapped fire overlap. The story then changes medium to native 2021 observations, frozen 2023–2024 forecast evidence and all accepted monitoring allocations. A Keystone Polygon is a candidate for disproportionate importance to a named recipient; no Colorado treatment rank is validated here.

`review.html?case=north` and `review.html?case=glenwood` open the baseline-first historical monitoring review. The user can inspect proposed UTC windows, enter an explicit hypothetical unit cost, prepare a review draft and export an audit or evidence register. Nothing is ordered, sampled, paid or financed. Unknown outcomes remain in the all-slot budget. The separate `evidence.html` desk retains full methods, downloadable reports and earlier negative benchmarks. `legacy.html` preserves the historical screening display with a prominent archive notice.

Story routes use `?chapter=polygon|dependency|fire|observation|evidence|decision|next`. Old `?scene=` or `?forecastCase=` URLs still redirect to the evidence desk. `?svg=1` uses actual local vector geometry; missing source data is explicitly unavailable. The checked parcel is also embedded from the same public file, so the opening does not wait for a basemap. The Eagle scale reveal respects reduced motion; geographic cuts never imply a delivery connection between separate cases.

The new presentation adapter `data/experience-evidence.json` binds 14 public source hashes, preserves all 102 accepted allocations across both policies and both cases, and retains model/freeze/opening provenance. New Grand Lake context is copied without geometry changes from the retained public USGS map-ready files. Native observations keep their units, timestamps and null gaps. The 2021 replay is separate from final forecast validation. North improved mean absolute log1p(FNU) error modestly; monitoring promotion and East transfer failed. The separate Glenwood classifier also failed its joint business gate.

The existing static vanilla JavaScript and MapLibre stack is retained. No framework, backend, package dependency, new model or HPC processing was introduced. Serve from the repository root:

```bash
python3 tools/build-experience.py
python3 -m http.server 8769 --bind 127.0.0.1
```

`build-experience.py` reads only repository-local frozen public data, writes the compact adapter and token-derived opacity CSS, and regenerates the embedded exact parcel. Repeating it produces identical bytes. Existing `tools/build-evidence.py`, `tools/build-story.py`, `tools/build-round2.py` and `tools/build-fire-display.py` remain the earlier evidence generators; their scientific inputs and exports are unchanged by this design revision.

Brand gate for the new experience and review:

```bash
python3 brand/brandlint.py index.html review.html css/story.css css/review.css js/story.js js/review.js css/archive-notice.css brand/experience.css tools/build-experience.py README.md
```

All palette, type and spacing values derive from canonical `brand/tokens.json`. Document component conventions are intentionally not used in the main story. The new experience uses an object, geographic annotations, measured traces, an interval graphic and real schedule relationships. USDA / USGS imagery is current visual context, never event-time evidence.

Publication is authorized after the actual source, functional, failure, accessibility, responsive, visual and clean-regeneration checks. The preceding public release is `ec3e51e64970e330b3ea72517a0a29cc6f743f0f`. R3 review receipts and recording live in the companion research run `keystone_experience_20261113_r3`. The material below is preserved historical documentation; its older product assertions and route descriptions do not define current validated capability.

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
