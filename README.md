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
