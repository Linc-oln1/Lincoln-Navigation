"use client"

import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import type {
  StyleSpecification,
  LngLatLike,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Navigation2, Plus, Minus } from "lucide-react"
import { LocationMarker } from "./location-marker"
import { NavigationCamera } from "./navigation-camera"

/* =========================================================
   ROOT CAUSE OF THE BLANK MAP (found via direct WebGL/console
   instrumentation, not guesswork): MapLibre GL JS spins up a pool
   of Web Workers to parse vector tiles, and resolves the worker
   script's URL relative to `import.meta.url` of its OWN bundled
   module. That works fine with bundlers that preserve each module
   as a real static file (webpack, Vite) — but under Turbopack (the
   default dev/build bundler for this Next.js version), maplibre-gl's
   module gets inlined into a hashed chunk file that isn't served at
   the path MapLibre computes, so the worker's module-script request
   resolves to a URL that doesn't exist. Next's dev server responds
   to that unmatched path with its HTML fallback page instead of a
   404, and the browser then refuses to run it as a module script:
   "Failed to load module script: The server responded with a
   non-JavaScript MIME type of 'text/html'." With no worker ever
   coming up, tile parsing never happens, so the map never fires
   style.load/data/idle — it just sits there rendering only its flat
   background-color layer forever, with nothing in the console to
   say why (MapLibre doesn't treat a failed worker as a style
   "error" event).
   Fix: serve MapLibre's own worker bundle from a real, stable,
   same-origin path (copied into /public — see maplibre-gl-worker.js
   and its maplibre-gl-shared.mjs dependency) and point MapLibre at
   it explicitly via setWorkerUrl(), instead of letting it guess a
   path from its bundled module's URL. Must run before any
   maplibregl.Map is constructed, and only in the browser (this
   module is also evaluated during SSR of this "use client"
   component's initial render).
========================================================= */
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.js")
}

/*
 * =========================================================
 * MAP VIEW — MapLibre GL edition
 * =========================================================
 *
 * PREVIOUSLY this component rendered raster Leaflet tiles only.
 * That meant: blurry imagery at high zoom, no 3D buildings, no
 * terrain relief, no map rotation/tilt, and it silently ignored
 * NEXT_PUBLIC_MAP_STYLE (a MapLibre vector style URL) even though
 * that's exactly what the project's own env config and globals.css
 * (.maplibregl-ctrl-group, etc.) were already set up for.
 *
 * This rewrite renders with MapLibre GL JS instead, which gives:
 *   - crisp vector rendering for the default style (sharp at any
 *     zoom/DPI, closer to how Apple/Google Maps render)
 *   - 3D building extrusions in the default style
 *   - real hillshaded terrain (free AWS "terrarium" elevation
 *     tiles) in Terrain mode, with true 3D relief when tilted
 *   - a sky/atmosphere layer for a polished horizon
 *   - smooth flyTo/easeTo camera moves
 *   - a live-navigation camera that rotates + tilts to follow
 *     the user, and a real GPS puck (see LocationMarker), wired
 *     in for the first time.
 *
 * COORDINATE CONVENTION: every prop on this component keeps the
 * existing [latitude, longitude] convention used throughout the
 * rest of the app (page.tsx, directions-panel.tsx, etc.), even
 * though MapLibre itself works in [lng, lat]. All conversion
 * happens inside this file.
 */

/* =========================================================
   MAP STYLE TYPES
========================================================= */

type MapStyle =
  | "light"
  | "dark"
  | "device"
  | "satellite"
  | "terrain"

/* =========================================================
   PROPS
========================================================= */

interface LiveNavigationState {
  isNavigating: boolean
  latitude: number | null
  longitude: number | null
  heading: number | null
  accuracy: number | null
}

interface MapViewProps {
  center?: [number, number]
  zoom?: number

  markers?: Array<{
    position: [number, number]
    title: string
    description?: string
  }>

  routePoints?: [number, number][]

  showUserLocation?: boolean

  onMapClick?: (lat: number, lng: number) => void

  mapStyle?: MapStyle

  liveNavigation?: LiveNavigationState
}

/* =========================================================
   TILE SOURCES
========================================================= */

const VECTOR_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE ||
  "https://tiles.openfreemap.org/styles/liberty"

// PREVIOUSLY: dark mode used CARTO's "dark_all" raster tiles
// (basemaps.cartocdn.com). CARTO retired free/keyless access to
// those — they now render a tiled "API KEY REQUIRED" watermark
// instead of the basemap. Rather than pull in yet another API-key
// dependency, dark mode now fetches the same free/keyless vector
// style as light mode (see VECTOR_STYLE_URL) once, client-side,
// and repaints it with an Apple/Google-style light or dark palette
// (see recolorVectorStyle below) — no separate tile source, no key,
// and both themes come from one real cartographic recolor rather
// than a CSS filter trick.

const SATELLITE_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
]

const SATELLITE_LABEL_TILES = [
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
]

const TOPO_TILES = [
  "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
  "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
  "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
]

// Free, keyless global elevation data (Terrarium encoding),
// hosted by AWS Open Data — used for real hillshading + 3D
// terrain relief in Terrain mode.
const TERRAIN_DEM_TILES = [
  "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png",
]

const ATTRIBUTIONS = {
  osm: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  esri: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
  topo: '&copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a>',
  terrain:
    'Terrain &copy; <a href="https://github.com/tilezen/joerd" target="_blank" rel="noreferrer">Mapzen / AWS Terrain Tiles</a>',
}

/* =========================================================
   STYLE BUILDERS
========================================================= */

// NOTE: in the MapLibre style spec, "sky" is a top-level style
// property (and a Map#setSky() call) — NOT a "sky"-typed entry in
// the layers array. An earlier version of this file tried to add
// it as a layer, which MapLibre's style validator rejected outright
// (caught by browser-testing this rewrite before shipping it).
function buildSkySpec(mode: "light" | "dark" | "neutral" = "neutral") {
  if (mode === "dark") {
    return {
      "sky-color": "#0d1520",
      "horizon-color": "#1b2531",
      "fog-color": "#141821",
      "fog-ground-blend": 0.6,
      "horizon-fog-blend": 0.75,
      "sky-horizon-blend": 0.75,
    }
  }

  return {
    "sky-color": "#4a90e2",
    "horizon-color": "#dbe9f7",
    "fog-color": "#eef2f7",
    "fog-ground-blend": 0.5,
    "horizon-fog-blend": 0.8,
    "sky-horizon-blend": 0.8,
  }
}

/* =========================================================
   APPLE/GOOGLE-STYLE LIGHT + DARK REPAINT
   =========================================================

   VECTOR_STYLE_URL (OpenFreeMap "liberty") ships with its own
   default colors. Rather than accept those, we fetch the raw
   style JSON once client-side, then walk every layer and repaint
   it against a curated light or dark palette modeled on Apple/
   Google Maps: warm cream land + soft blue water + muted green
   parks + mauve country borders for light; near-black land + deep
   navy water + charcoal roads + soft lavender borders for dark.

   Layers are matched by id/source-layer *substring* rather than
   exact id, since OpenMapTiles-schema styles (which OpenFreeMap's
   "liberty" style is) are consistent about using words like
   "water", "building", "landuse", "admin" in their layer ids even
   though the exact list of layer ids varies by style build — this
   keeps the repaint resilient to minor upstream naming differences
   instead of silently doing nothing if a hardcoded id is missing.
========================================================= */

type ThemeMode = "light" | "dark"

interface RoadPalette {
  motorway: string
  motorwayCasing: string
  trunk: string
  trunkCasing: string
  primary: string
  primaryCasing: string
  secondary: string
  secondaryCasing: string
  rail: string
}

interface ThemePalette {
  background: string
  water: string
  waterLine: string
  green: string
  park: string
  residential: string
  institutional: string
  buildingFill: string
  buildingOutline: string
  roadFill: string
  roadCasing: string
  highwayFill: string
  highwayCasing: string
  roads: RoadPalette
  border: string
  labelPlace: string
  labelHalo: string
  labelRegion: string
  labelWater: string
}

// Calibrated against Apple Maps' actual cartography rather than a
// free-hand "colorful" guess: Apple's palette is more restrained
// and neutral than it first looks — a soft off-white/warm-gray land
// tone (not cream/tan), muted sage-green parks, a dusty lavender-
// purple for country/region boundaries and labels (this one really
// is distinctively Apple — most map styles use plain gray for
// admin borders), and a soft gold/amber for the road hierarchy
// rather than a saturated traffic-light orange. Dark mode mirrors
// the same hue family at low luminance so both themes read as one
// consistent design system, exactly like Apple's do.
const THEME_PALETTES: Record<ThemeMode, ThemePalette> = {
  light: {
    background: "#f2f1ec",
    water: "#a6d3e3",
    waterLine: "#8ec3d6",
    green: "#cfe3c0",
    park: "#bcdca9",
    residential: "#ece9e1",
    institutional: "#dbe6d2",
    buildingFill: "#e6e3dc",
    buildingOutline: "#d3cfc4",
    roadFill: "#ffffff",
    roadCasing: "#d9d6cd",
    highwayFill: "#f7c873",
    highwayCasing: "#dba24e",
    roads: {
      motorway: "#f7c873",
      motorwayCasing: "#dba24e",
      trunk: "#fad9a0",
      trunkCasing: "#e0be7c",
      primary: "#fdf0d8",
      primaryCasing: "#e8d9b8",
      secondary: "#ffffff",
      secondaryCasing: "#dcd8cd",
      rail: "#b0a8bb",
    },
    border: "#9b7fbe",
    labelPlace: "#3a3a3c",
    labelHalo: "#f2f1ec",
    labelRegion: "#8a6bb0",
    labelWater: "#4a7f9e",
  },
  dark: {
    background: "#1c1c1e",
    water: "#0f2a3d",
    waterLine: "#123449",
    green: "#1e2a1c",
    park: "#213221",
    residential: "#232324",
    institutional: "#1f2a1c",
    buildingFill: "#2c2c2e",
    buildingOutline: "#3a3a3c",
    roadFill: "#3a3a3c",
    roadCasing: "#242426",
    highwayFill: "#6b5636",
    highwayCasing: "#3c2f1e",
    roads: {
      motorway: "#8a6a3c",
      motorwayCasing: "#4a3620",
      trunk: "#77613f",
      trunkCasing: "#3f331f",
      primary: "#5c5138",
      primaryCasing: "#332c1e",
      secondary: "#3a3a3c",
      secondaryCasing: "#242426",
      rail: "#584f66",
    },
    border: "#8874a8",
    labelPlace: "#e5e5ea",
    labelHalo: "#1c1c1e",
    labelRegion: "#a390c4",
    labelWater: "#6f9db8",
  },
}

// Apple-style category colors for POI icons/labels — theme-invariant
// (a restaurant pin is the same warm red-orange in light or dark
// mode). Matched against the OpenMapTiles "poi" layer's "class" (and
// "subclass" as a fallback) property. Anything unmatched falls back
// to a neutral slate so this only ever *adds* color, never breaks
// rendering if a style build uses slightly different class values.
const POI_CATEGORY_COLORS: Array<[string, string]> = [
  // food & drink
  ["restaurant", "#e2593c"],
  ["fast_food", "#e2593c"],
  ["cafe", "#c17a3d"],
  ["bar", "#c1447e"],
  ["pub", "#c1447e"],
  ["ice_cream", "#e2593c"],
  // shopping
  ["shop", "#3b82c4"],
  ["supermarket", "#3b82c4"],
  ["grocery", "#3b82c4"],
  ["marketplace", "#3b82c4"],
  ["convenience", "#3b82c4"],
  // health
  ["hospital", "#d94f5c"],
  ["pharmacy", "#d94f5c"],
  ["doctors", "#d94f5c"],
  ["clinic", "#d94f5c"],
  ["dentist", "#d94f5c"],
  // education
  ["school", "#5a67d8"],
  ["college", "#5a67d8"],
  ["university", "#5a67d8"],
  ["kindergarten", "#5a67d8"],
  ["library", "#5a67d8"],
  // lodging
  ["hotel", "#9b6fae"],
  ["hostel", "#9b6fae"],
  ["motel", "#9b6fae"],
  ["guest_house", "#9b6fae"],
  // transport
  ["bus", "#2a9d8f"],
  ["bus_stop", "#2a9d8f"],
  ["station", "#2a9d8f"],
  ["railway", "#2a9d8f"],
  ["airport", "#2a9d8f"],
  ["aerodrome", "#2a9d8f"],
  ["parking", "#2a9d8f"],
  ["fuel", "#2a9d8f"],
  ["charging_station", "#2a9d8f"],
  ["ferry", "#2a9d8f"],
  // leisure / nature / attraction
  ["park", "#4c9a53"],
  ["garden", "#4c9a53"],
  ["playground", "#4c9a53"],
  ["golf", "#4c9a53"],
  ["zoo", "#4c9a53"],
  ["attraction", "#c1447e"],
  ["museum", "#c1447e"],
  ["cinema", "#c1447e"],
  ["theatre", "#c1447e"],
  ["artwork", "#c1447e"],
  ["viewpoint", "#c1447e"],
  ["monument", "#c1447e"],
  // finance / civic
  ["bank", "#4a5568"],
  ["atm", "#4a5568"],
  ["townhall", "#4a5568"],
  ["police", "#4a5568"],
  ["post", "#4a5568"],
]

const POI_FALLBACK_COLOR = "#6b6b70"

// Builds a MapLibre `match` expression keyed on the poi layer's
// class/subclass fields. Falls back to a neutral color when no
// category matches (unrecognized class, or a style build that names
// fields differently) — additive only, never a regression.
function buildPoiColorExpression(): any[] {
  const expr: any[] = ["match", ["coalesce", ["get", "class"], ["get", "subclass"], ""]]
  for (const [key, color] of POI_CATEGORY_COLORS) {
    expr.push(key, color)
  }
  expr.push(POI_FALLBACK_COLOR)
  return expr
}

// Builds a MapLibre `match` expression for road line color, keyed on
// the transportation layer's "class" field, with a graceful fallback
// for anything not covered (service roads, paths, etc. stay on the
// palette's generic roadFill/roadCasing).
function buildRoadColorExpression(
  roads: RoadPalette,
  fallback: string,
  variant: "fill" | "casing"
): any[] {
  const pick = (key: keyof RoadPalette) => roads[key]

  return [
    "match",
    ["get", "class"],
    "motorway",
    variant === "fill" ? pick("motorway") : pick("motorwayCasing"),
    "trunk",
    variant === "fill" ? pick("trunk") : pick("trunkCasing"),
    "primary",
    variant === "fill" ? pick("primary") : pick("primaryCasing"),
    ["secondary", "tertiary"],
    variant === "fill" ? pick("secondary") : pick("secondaryCasing"),
    ["rail", "transit", "light_rail", "narrow_gauge", "monorail", "subway"],
    pick("rail"),
    fallback,
  ]
}

type LayerCategory =
  | "background"
  | "water-fill"
  | "water-line"
  | "green"
  | "park"
  | "residential"
  | "institutional"
  | "building"
  | "building-3d"
  | "border"
  | "highway"
  | "road"
  | "poi"
  | "label-region"
  | "label-water"
  | "label-place"
  | null

function categorizeLayer(layer: {
  id?: string
  type?: string
  "source-layer"?: string
}): LayerCategory {
  const id = (layer.id || "").toLowerCase()
  const sourceLayer = (layer["source-layer"] || "").toLowerCase()
  const combined = `${id} ${sourceLayer}`
  const type = layer.type

  // Prefer exact OpenMapTiles-schema source-layer names first — far
  // more reliable than substring matching on the layer id, which
  // varies between style builds. Falls through to the older
  // substring heuristic below for anything that doesn't match, so
  // non-OpenMapTiles styles still degrade gracefully instead of
  // going unstyled.
  switch (sourceLayer) {
    case "water":
      if (type !== "symbol") return type === "line" ? "water-line" : "water-fill"
      break
    case "waterway":
      if (type === "line") return "water-line"
      break
    case "water_name":
      if (type === "symbol") return "label-water"
      break
    case "landcover":
      if (type === "fill") return "green"
      break
    case "park":
      if (type === "fill") return "park"
      break
    case "landuse":
      if (type === "fill") {
        if (/(hospital|school|cemetery|university|college|kindergarten)/.test(id))
          return "institutional"
        if (/(residential|commercial|industrial)/.test(id))
          return "residential"
        return "green"
      }
      break
    case "building":
      if (type === "fill") return "building"
      // OpenFreeMap's "liberty" style ships its own native 3D
      // building layer ("building-3d", fill-extrusion) — recolored
      // in place here rather than left at its fixed default gray,
      // so it matches the theme instead of clashing with it (and
      // instead of enhanceVectorStyle piling a second extrusion
      // layer on top of it — see enhanceVectorStyle for the other
      // half of that fix).
      if (type === "fill-extrusion") return "building-3d"
      break
    case "boundary":
      if (type === "line") return "border"
      break
    case "transportation":
      if (type === "line") {
        return /(motorway|trunk)/.test(id) ? "highway" : "road"
      }
      break
    case "poi":
      if (type === "symbol") return "poi"
      break
    case "place":
      if (type === "symbol") {
        if (/(country|state)/.test(id)) return "label-region"
        return "label-place"
      }
      break
  }

  if (type === "background") return "background"

  if (/waterway/.test(combined) && type === "line") return "water-line"

  if (/water/.test(combined) && type !== "symbol") {
    return type === "line" ? "water-line" : "water-fill"
  }

  if (type === "fill" && /park/.test(combined)) return "park"

  if (
    type === "fill" &&
    /(landcover|landuse|wood|forest|grass|vegetation|nature_reserve|golf|cemetery|hospital|school|pitch)/.test(
      combined
    )
  ) {
    return "green"
  }

  if (type === "fill" && /building/.test(combined)) return "building"

  if (
    type === "line" &&
    (/admin/.test(combined) || /boundary/.test(combined))
  ) {
    return "border"
  }

  if (type === "line" && /(motorway|trunk|highway)/.test(combined)) {
    return "highway"
  }

  if (
    type === "line" &&
    /(road|transportation|street|bridge|tunnel|path|track|service)/.test(
      combined
    ) &&
    !/label/.test(combined)
  ) {
    return "road"
  }

  if (type === "symbol") {
    if (/poi/.test(combined)) return "poi"
    if (/(country|state)/.test(combined)) return "label-region"
    if (/water/.test(combined)) return "label-water"
    if (/(place|city|town|village|label)/.test(combined))
      return "label-place"
  }

  return null
}

function recolorVectorStyle(
  baseStyle: StyleSpecification,
  mode: ThemeMode
): StyleSpecification {
  const palette = THEME_PALETTES[mode]

  // Deep clone — this function is called separately for "light"
  // and "dark" from the same cached base style, so mutating in
  // place would let one theme's colors leak into the other.
  const clone: StyleSpecification = JSON.parse(
    JSON.stringify(baseStyle)
  )

  ;(clone as any).sky = buildSkySpec(mode)

  for (const layer of (clone.layers || []) as any[]) {
    const category = categorizeLayer(layer)
    if (!category) continue

    layer.paint = layer.paint || {}

    const isCasing = /(case|casing|outline|bg)/.test(
      (layer.id || "").toLowerCase()
    )

    switch (category) {
      case "background":
        layer.paint["background-color"] = palette.background
        break
      case "water-fill":
        layer.paint["fill-color"] = palette.water
        layer.paint["fill-outline-color"] = palette.water
        break
      case "water-line":
        layer.paint["line-color"] = palette.waterLine
        break
      case "green":
        layer.paint["fill-color"] = palette.green
        break
      case "park":
        layer.paint["fill-color"] = palette.park
        break
      case "residential":
        layer.paint["fill-color"] = palette.residential
        break
      case "institutional":
        layer.paint["fill-color"] = palette.institutional
        break
      case "building":
        layer.paint["fill-color"] = palette.buildingFill
        layer.paint["fill-outline-color"] = palette.buildingOutline
        break
      case "building-3d":
        layer.paint["fill-extrusion-color"] = buildBuildingColorExpression(mode)
        layer.paint["fill-extrusion-opacity"] = 0.85
        break
      case "border":
        layer.paint["line-color"] = palette.border
        layer.paint["line-opacity"] = 0.8
        break
      case "highway":
        // Class-based coloring (motorway/trunk/primary get distinct
        // Apple-style orange→amber tiers) with the flat highway
        // fill/casing as the fallback for anything the "match"
        // expression doesn't recognize.
        layer.paint["line-color"] = buildRoadColorExpression(
          palette.roads,
          isCasing ? palette.highwayCasing : palette.highwayFill,
          isCasing ? "casing" : "fill"
        )
        break
      case "road":
        layer.paint["line-color"] = buildRoadColorExpression(
          palette.roads,
          isCasing ? palette.roadCasing : palette.roadFill,
          isCasing ? "casing" : "fill"
        )
        break
      case "poi": {
        const poiColors = buildPoiColorExpression()
        // Recolor the icon itself (works for monochrome/SDF sprite
        // icons; a no-op tint for icons that are already colorful)
        // plus the label text, so POIs read as distinct categories
        // the way Apple/Google style them — restaurants, shops,
        // parks, hospitals, transit, etc. each get their own color
        // instead of being flattened to one gray label.
        layer.paint["icon-color"] = poiColors
        layer.paint["text-color"] = poiColors
        layer.paint["text-halo-color"] = palette.labelHalo
        break
      }
      case "label-region":
        layer.paint["text-color"] = palette.labelRegion
        layer.paint["text-halo-color"] = palette.labelHalo
        break
      case "label-water":
        layer.paint["text-color"] = palette.labelWater
        layer.paint["text-halo-color"] = palette.labelHalo
        break
      case "label-place":
        layer.paint["text-color"] = palette.labelPlace
        layer.paint["text-halo-color"] = palette.labelHalo
        break
    }
  }

  return clone
}

// The base vector style JSON is fetched once and cached — "light"
// and "dark" both repaint the same fetched copy, and satellite/
// terrain borrow just its building source (see extractVectorSource)
// for the 3D-buildings overlay. A failed fetch clears the cache so
// the next call retries instead of caching a permanent failure.
let baseVectorStylePromise: Promise<StyleSpecification> | null = null

async function getBaseVectorStyle(): Promise<StyleSpecification> {
  if (!baseVectorStylePromise) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[lincoln-map] fetching base vector style from",
        VECTOR_STYLE_URL
      )
    }

    baseVectorStylePromise = fetch(VECTOR_STYLE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load base map style (${response.status})`
          )
        }
        return response.json()
      })
      .then((json) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[lincoln-map] base vector style loaded:",
            Object.keys(json.sources || {}),
            `${(json.layers || []).length} layers`
          )
        }
        return json
      })
      .catch((error) => {
        console.error(
          "[lincoln-map] FAILED to fetch/parse base vector style:",
          error
        )
        baseVectorStylePromise = null
        throw error
      })
  }

  return baseVectorStylePromise
}

// OpenFreeMap / most OpenMapTiles-schema vector styles use one of
// these conventional source ids for their vector tiles.
const VECTOR_SOURCE_CANDIDATES = [
  "openmaptiles",
  "openfreemap",
  "maplibre",
  "carto",
]

function extractVectorSource(
  baseStyle: StyleSpecification
): { id: string; source: unknown } | null {
  const sources = (baseStyle as any).sources || {}
  const id = VECTOR_SOURCE_CANDIDATES.find((candidate) =>
    Boolean(sources[candidate])
  )

  if (!id) return null

  return { id, source: sources[id] }
}

type BuildingTheme = "light" | "dark" | "satellite" | "terrain"

// Height-interpolated building colors per map theme — light gray
// for the light map, charcoal for dark, and a warm off-white/tan
// for satellite and terrain so extruded buildings read clearly
// against real photography or topo shading.
const BUILDING_COLOR_RAMPS: Record<
  BuildingTheme,
  [string, string, string, string]
> = {
  light: ["#cbd0d6", "#aab0ba", "#8d94a0", "#6f7684"],
  dark: ["#39393c", "#2e2e30", "#242426", "#1a1a1b"],
  satellite: ["#e9e4d8", "#d9d2c0", "#c7bfa9", "#b3a98e"],
  terrain: ["#d8cdb8", "#c3b79d", "#ab9d80", "#8f8266"],
}

function buildBuildingColorExpression(theme: BuildingTheme): any[] {
  const [c0, c1, c2, c3] = BUILDING_COLOR_RAMPS[theme]

  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "render_height"], 6],
    0,
    c0,
    50,
    c1,
    120,
    c2,
    250,
    c3,
  ]
}

function buildBuildingExtrusionLayer(
  sourceId: string,
  layerId: string,
  theme: BuildingTheme
) {
  return {
    id: layerId,
    source: sourceId,
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 14,
    paint: {
      "fill-extrusion-color": buildBuildingColorExpression(theme),
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        14,
        0,
        16,
        ["coalesce", ["get", "render_height"], 6],
      ],
      "fill-extrusion-base": [
        "coalesce",
        ["get", "render_min_height"],
        0,
      ],
      "fill-extrusion-opacity":
        theme === "satellite" || theme === "terrain" ? 0.92 : 0.85,
    },
  }
}

function buildRasterStyle(options: {
  layers: Array<{
    id: string
    tiles: string[]
    tileSize?: number
    maxzoom?: number
    attribution?: string
    opacity?: number
  }>
  withTerrain?: boolean
}): StyleSpecification {
  const sources: Record<string, any> = {}
  const layers: any[] = []

  options.layers.forEach((layer) => {
    const sourceId = `raster-${layer.id}`

    sources[sourceId] = {
      type: "raster",
      tiles: layer.tiles,
      tileSize: layer.tileSize ?? 256,
      maxzoom: layer.maxzoom ?? 19,
      attribution: layer.attribution ?? "",
    }

    layers.push({
      id: sourceId,
      type: "raster",
      source: sourceId,
      paint: {
        "raster-opacity": layer.opacity ?? 1,
        "raster-fade-duration": 150,
      },
    })
  })

  if (options.withTerrain) {
    const demSource = {
      type: "raster-dem",
      tiles: TERRAIN_DEM_TILES,
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 15,
      attribution: ATTRIBUTIONS.terrain,
    }

    // Two separate source ids pointing at identical DEM tiles — one
    // feeds the 2D hillshade layer, the other feeds map.setTerrain()
    // (see the style.load handler below). MapLibre logs "You are
    // using the same source for a hillshade layer and for 3D
    // terrain" and warns of degraded rendering quality if a single
    // source id is reused for both, since it tiles the same raster
    // for two different purposes (shading vs. displacement) at once.
    sources["lincoln-terrain-dem"] = demSource
    sources["lincoln-terrain-dem-3d"] = demSource

    layers.push({
      id: "lincoln-hillshade",
      type: "hillshade",
      source: "lincoln-terrain-dem",
      paint: {
        "hillshade-exaggeration": 0.7,
        "hillshade-shadow-color": "#3b2f2a",
        "hillshade-highlight-color": "#fdf6e3",
        "hillshade-accent-color": "#5a4634",
      },
    })
  }

  return {
    version: 8,
    sources,
    layers,
    sky: buildSkySpec(),
  } as StyleSpecification
}

// Satellite mode is real aerial photography (Esri World Imagery),
// not a stylized 3D vector render — there's no free/keyless dataset
// with Apple-style textured 3D landscapes and building facades to
// draw from. Instead we get as close to a "3D flyover" feel as
// free data allows: real photos, draped over real elevation relief
// (hillshading + terrain tilt), with extruded building blocks from
// OpenFreeMap's vector data layered on top.
async function buildSatelliteStyle(): Promise<StyleSpecification> {
  const style = buildRasterStyle({
    layers: [
      {
        id: "imagery",
        tiles: SATELLITE_TILES,
        attribution: ATTRIBUTIONS.esri,
        maxzoom: 19,
      },
      {
        id: "labels",
        tiles: SATELLITE_LABEL_TILES,
        attribution: ATTRIBUTIONS.esri,
        maxzoom: 19,
        opacity: 0.95,
      },
    ],
    withTerrain: true,
  })

  try {
    const base = await getBaseVectorStyle()
    const vectorSource = extractVectorSource(base)

    if (vectorSource) {
      ;(style.sources as any)[vectorSource.id] = vectorSource.source
      style.layers.push(
        buildBuildingExtrusionLayer(
          vectorSource.id,
          "lincoln-3d-buildings-sat",
          "satellite"
        ) as any
      )
    }
  } catch {
    // Satellite imagery still works fine without the 3D buildings
    // overlay — never let this block the style from loading.
  }

  return style
}

async function buildTerrainStyle(): Promise<StyleSpecification> {
  const style = buildRasterStyle({
    layers: [
      {
        id: "topo",
        tiles: TOPO_TILES,
        attribution: `${ATTRIBUTIONS.osm} ${ATTRIBUTIONS.topo}`,
        maxzoom: 17,
      },
    ],
    withTerrain: true,
  })

  try {
    const base = await getBaseVectorStyle()
    const vectorSource = extractVectorSource(base)

    if (vectorSource) {
      ;(style.sources as any)[vectorSource.id] = vectorSource.source
      style.layers.push(
        buildBuildingExtrusionLayer(
          vectorSource.id,
          "lincoln-3d-buildings-terrain",
          "terrain"
        ) as any
      )
    }
  } catch {
    // Fine without buildings too.
  }

  return style
}

async function resolveStyleAsync(
  style: MapStyle,
  deviceIsDark: boolean
): Promise<{ kind: MapStyle; value: string | StyleSpecification }> {
  const resolved =
    style === "device" ? (deviceIsDark ? "dark" : "light") : style

  switch (resolved) {
    case "dark":
      try {
        const base = await getBaseVectorStyle()
        return { kind: "dark", value: recolorVectorStyle(base, "dark") }
      } catch (error) {
        // A network hiccup fetching the base style shouldn't leave
        // the map broken — fall back to the plain (un-recolored)
        // vector style, which MapLibre can still load directly.
        console.error(
          "[lincoln-map] resolveStyleAsync(dark) falling back to raw style URL:",
          error
        )
        return { kind: "dark", value: VECTOR_STYLE_URL }
      }
    case "satellite":
      return { kind: "satellite", value: await buildSatelliteStyle() }
    case "terrain":
      return { kind: "terrain", value: await buildTerrainStyle() }
    case "light":
    default:
      try {
        const base = await getBaseVectorStyle()
        return {
          kind: "light",
          value: recolorVectorStyle(base, "light"),
        }
      } catch (error) {
        console.error(
          "[lincoln-map] resolveStyleAsync(light) falling back to raw style URL:",
          error
        )
        return { kind: "light", value: VECTOR_STYLE_URL }
      }
  }
}

function getDeviceIsDark(): boolean {
  if (typeof window === "undefined") return false

  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
}

/* =========================================================
   3D BUILDINGS + SKY FOR THE VECTOR STYLE
   (added dynamically since VECTOR_STYLE_URL is fetched
   remotely rather than authored by us)
========================================================= */

function enhanceVectorStyle(map: maplibregl.Map, theme: ThemeMode) {
  try {
    map.setSky(buildSkySpec(theme))
  } catch {
    // Sky is optional polish — never fatal.
  }

  try {
    if (map.getLayer("lincoln-3d-buildings")) return

    const style = map.getStyle()

    // OpenFreeMap's "liberty" style already ships its own native 3D
    // building layer (fill-extrusion, source-layer "building") —
    // recolorVectorStyle() recolors it in place (see the
    // "building-3d" category) so it matches the theme. Adding our
    // OWN extrusion layer on top of that would double-draw every
    // building (two overlapping fill-extrusion layers at the same
    // footprints), so only add one here if no native one exists —
    // keeping this as a fallback for style builds that don't ship
    // their own 3D buildings, rather than assuming every build
    // does.
    const hasNativeBuildingExtrusion = style?.layers?.some(
      (layer: { type?: string; "source-layer"?: string }) =>
        layer.type === "fill-extrusion" &&
        layer["source-layer"] === "building"
    )

    if (hasNativeBuildingExtrusion) return

    const sourceId = VECTOR_SOURCE_CANDIDATES.find((id) =>
      Boolean(style?.sources?.[id])
    )

    if (!sourceId) return

    const firstSymbolLayer = style?.layers?.find(
      (layer: { type?: string }) => layer.type === "symbol"
    )

    map.addLayer(
      buildBuildingExtrusionLayer(
        sourceId,
        "lincoln-3d-buildings",
        theme
      ) as any,
      firstSymbolLayer?.id
    )
  } catch (error) {
    console.warn(
      "Lincoln Navigation: 3D buildings unavailable for this style.",
      error
    )
  }
}

/* =========================================================
   ROUTE LINE (persists across style switches by being
   re-added on every "style.load")
========================================================= */

const ROUTE_SOURCE_ID = "lincoln-route"

function ensureRouteLayers(map: maplibregl.Map) {
  if (map.getSource(ROUTE_SOURCE_ID)) return

  map.addSource(ROUTE_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [] },
    },
  })

  // Soft white "casing" beneath the route line for contrast
  // against both light and dark/satellite basemaps.
  map.addLayer({
    id: "lincoln-route-casing",
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": 9,
      "line-opacity": 0.55,
    },
  })

  map.addLayer({
    id: "lincoln-route-line",
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#0a84ff",
      "line-width": 5,
    },
  })
}

function routePointsToGeoJSON(routePoints: [number, number][]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      // Incoming points are [lat, lng]; GeoJSON needs [lng, lat].
      coordinates: routePoints.map(
        ([lat, lng]) => [lng, lat] as [number, number]
      ),
    },
  }
}

/* =========================================================
   CUSTOM PIN MARKER (crisp SVG, no external image request)
========================================================= */

function createPinElement(): HTMLDivElement {
  const el = document.createElement("div")

  el.className = "lincoln-pin"
  el.style.width = "30px"
  el.style.height = "40px"
  el.style.cursor = "pointer"
  el.style.filter = "drop-shadow(0 3px 6px rgba(0,0,0,0.4))"

  el.innerHTML = `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 25 15 25s15-13.8 15-25C30 6.7 23.3 0 15 0z" fill="#ff453a"/>
      <circle cx="15" cy="15" r="6" fill="#ffffff"/>
    </svg>
  `

  return el
}

function createPopupHTML(title: string, description?: string): string {
  const safeTitle = title.replace(/</g, "&lt;")
  const safeDescription = description
    ? description.replace(/</g, "&lt;")
    : ""

  return `
    <div style="min-width:180px;font-family:inherit;">
      <div style="font-size:15px;font-weight:700;margin-bottom:4px;color:#111;">
        ${safeTitle}
      </div>
      ${
        safeDescription
          ? `<div style="font-size:13px;color:#555;">${safeDescription}</div>`
          : ""
      }
    </div>
  `
}

/* =========================================================
   COMPONENT
========================================================= */

export function MapView({
  center = [7.9465, -1.0232],
  zoom = 7,
  markers = [],
  routePoints = [],
  showUserLocation = true,
  onMapClick,
  mapStyle = "device",
  liveNavigation,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<maplibregl.Map | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const markerObjectsRef = useRef<maplibregl.Marker[]>([])
  const lastRoutePointsRef = useRef<[number, number][]>([])
  const currentStyleKindRef = useRef<MapStyle>("light")
  // Recoloring/fetching a style is async now, so a fast style
  // toggle (or an unmount) can outrace an earlier request — this
  // token lets a stale resolution recognize it's stale and bail
  // instead of clobbering a newer/valid map style.
  const styleRequestIdRef = useRef(0)

  const [mapInstance, setMapInstance] =
    useState<maplibregl.Map | null>(null)

  const [userLocation, setUserLocation] = useState<
    [number, number] | null
  >(null)
  const [userAccuracy, setUserAccuracy] = useState<number | null>(
    null
  )

  /* =======================================================
     INITIALIZE MAP
  ======================================================= */

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    let cancelled = false

    // DIAGNOSTIC: there was previously no try/catch anywhere around
    // map construction/init, so a synchronous throw from `new
    // maplibregl.Map(...)` (e.g. a style-spec validation error) would
    // reject this IIFE's promise with nothing awaiting it — an
    // unhandled rejection that produces no visible UI change and, in
    // some console configurations, no obvious log line either. These
    // two listeners make that class of failure impossible to miss.
    if (process.env.NODE_ENV !== "production") {
      window.addEventListener("unhandledrejection", (e) => {
        console.error("[lincoln-map] UNHANDLED REJECTION:", e.reason)
      })
      window.addEventListener("error", (e) => {
        console.error("[lincoln-map] WINDOW ERROR:", e.message, e.error)
      })
    }

    // Style resolution now fetches + repaints the base vector
    // style (see resolveStyleAsync), so map creation waits on that
    // before constructing the maplibregl.Map instance.
    ;(async () => {
      try {
      const initial = await resolveStyleAsync(
        mapStyle,
        getDeviceIsDark()
      )

      if (
        cancelled ||
        !mapContainerRef.current ||
        mapInstanceRef.current
      ) {
        return
      }

      currentStyleKindRef.current = initial.kind

      mapContainerRef.current.classList.toggle(
        "lincoln-map-dark",
        initial.kind === "dark"
      )

      console.log(
        "[lincoln-map] constructing maplibregl.Map with style kind:",
        initial.kind,
        "value type:",
        typeof initial.value
      )

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: initial.value,
        center: [center[1], center[0]],
        zoom,
        pitch: 0,
        bearing: 0,
        attributionControl: { compact: true },
        // Vector tiles render sharp at any zoom, but this still
        // caps how far we let people zoom past available detail.
        maxZoom: 20,
        minZoom: 2,
      })

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: false,
          visualizePitch: true,
        }),
        "top-right"
      )

      // MapLibre swallows most tile/source/style load failures unless
      // something is actually listening for its "error" event — with
      // no listener at all (the previous state of this file), a
      // failed tile request, a bad source url, or a worker crash
      // produces zero console output and just silently leaves the
      // map blank. This makes every one of those failures visible.
      map.on("error", (event: any) => {
        console.error(
          "[lincoln-map] MapLibre error event:",
          event?.error || event
        )
      })

      if (
        process.env.NODE_ENV !== "production" &&
        typeof window !== "undefined"
      ) {
        // Dev-only debug handle — lets us (or the browser console)
        // call window.__lincolnMap.getStyle() / .queryRenderedFeatures()
        // / .getSource("openmaptiles") etc. directly instead of
        // guessing at internal state from the outside.
        ;(window as any).__lincolnMap = map
      }

      map.on("style.load", () => {
        ensureRouteLayers(map)

        if (
          currentStyleKindRef.current === "light" ||
          currentStyleKindRef.current === "dark"
        ) {
          enhanceVectorStyle(map, currentStyleKindRef.current)
        }

        if (lastRoutePointsRef.current.length >= 2) {
          const source = map.getSource(
            ROUTE_SOURCE_ID
          ) as maplibregl.GeoJSONSource | undefined

          source?.setData(
            routePointsToGeoJSON(lastRoutePointsRef.current)
          )
        }

        if (
          currentStyleKindRef.current === "terrain" ||
          currentStyleKindRef.current === "satellite"
        ) {
          map.setTerrain({
            source: "lincoln-terrain-dem-3d",
            exaggeration:
              currentStyleKindRef.current === "satellite" ? 1.1 : 1.3,
          })
        } else {
          map.setTerrain(null)
        }
      })

      map.on("click", (event: maplibregl.MapMouseEvent) => {
        onMapClick?.(event.lngLat.lat, event.lngLat.lng)
      })

      // Defensive resize handling: MapLibre sizes its WebGL canvas
      // from the container's dimensions AT CONSTRUCTION TIME. In a
      // flex/responsive layout where the container's final size
      // settles a beat after mount (a very common timing gap right
      // after Next.js hydration), the canvas can get stuck rendering
      // only its original, smaller construction-time viewport — the
      // rest of the (now-larger) canvas simply never gets drawn into
      // and shows whatever is behind it. A ResizeObserver catches
      // that and explicitly calls map.resize() whenever the
      // container's actual pixel size changes, not just once at
      // startup.
      if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
        const resizeObserver = new ResizeObserver(() => {
          map.resize()
        })
        resizeObserver.observe(mapContainerRef.current)
        resizeObserverRef.current = resizeObserver
      }

      mapInstanceRef.current = map
      setMapInstance(map)
      } catch (error) {
        console.error(
          "[lincoln-map] MAP INIT THREW (this was previously silent):",
          error
        )
      }
    })()

    return () => {
      cancelled = true

      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null

      const map = mapInstanceRef.current
      if (map) {
        markerObjectsRef.current.forEach((marker) => marker.remove())
        markerObjectsRef.current = []
        map.remove()
        mapInstanceRef.current = null
        setMapInstance(null)
      }
    }
    // Intentionally only runs once — style/center/zoom changes are
    // handled by dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =======================================================
     STYLE CHANGES (light/dark/device/satellite/terrain)

     FIXED BUG: this effect previously depended on [mapStyle,
     mapInstance]. mapInstance flips from null to the real map
     object the instant the init effect above finishes constructing
     it, which counts as a dependency change and fires THIS effect
     again immediately after mount — re-resolving the style and, in
     practice, racing maplibregl's OWN internal loading of the style
     already passed to `new maplibregl.Map({ style: ... })` in the
     constructor. That race is a known MapLibre GL failure mode:
     calling setStyle() while the first style is still mid-load
     leaves its internal sprite/image bookkeeping in a bad state and
     throws "Unable to perform style diff: Cannot read properties of
     undefined (reading '_checkLoaded')" — caught internally, so it
     never surfaces as a crash, but MapLibre's own recovery ("rebuild
     the style from scratch") did not actually finish rendering
     anything: confirmed by reading the live WebGL canvas's center
     pixel as (0,0,0,0), fully transparent — nothing had been
     painted at all, which is what showed up as a "blank map" with
     only the page's own background showing through.

     The constructor already applies the correct initial style for
     whatever `mapStyle` was at mount time, so this effect has no
     reason to react to mapInstance ever becoming non-null — it only
     needs to react to `mapStyle` actually changing later (the user
     picking a different theme from the dropdown), by which point
     mapInstanceRef.current is already set. Dropping mapInstance
     from the dependency array removes the redundant re-run at its
     source instead of trying to out-guess MapLibre's internal
     timing.
  ======================================================= */

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const requestId = ++styleRequestIdRef.current

    resolveStyleAsync(mapStyle, getDeviceIsDark()).then((resolved) => {
      // A newer style request (another toggle, or unmount) has
      // already superseded this one — drop it on the floor.
      if (styleRequestIdRef.current !== requestId) return
      if (!mapInstanceRef.current) return

      const previousKind = currentStyleKindRef.current
      currentStyleKindRef.current = resolved.kind

      mapContainerRef.current?.classList.toggle(
        "lincoln-map-dark",
        resolved.kind === "dark"
      )

      if (resolved.kind === previousKind) return

      map.setStyle(resolved.value)
    })
    // Intentionally NOT depending on mapInstance — see comment
    // above. mapInstanceRef.current is read fresh on every call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle])

  /* =======================================================
     DEVICE THEME CHANGES (only relevant in "device" mode)
  ======================================================= */

  useEffect(() => {
    if (mapStyle !== "device") return
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    )

    const handleChange = () => {
      const map = mapInstanceRef.current
      if (!map) return

      const requestId = ++styleRequestIdRef.current

      resolveStyleAsync("device", mediaQuery.matches).then(
        (resolved) => {
          if (styleRequestIdRef.current !== requestId) return
          if (!mapInstanceRef.current) return

          const previousKind = currentStyleKindRef.current
          currentStyleKindRef.current = resolved.kind

          mapContainerRef.current?.classList.toggle(
            "lincoln-map-dark",
            resolved.kind === "dark"
          )

          if (resolved.kind === previousKind) return

          map.setStyle(resolved.value)
        }
      )
    }

    mediaQuery.addEventListener("change", handleChange)

    return () =>
      mediaQuery.removeEventListener("change", handleChange)
  }, [mapStyle])

  /* =======================================================
     CENTER / ZOOM CHANGES
  ======================================================= */

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Don't fight the live-navigation follow camera.
    if (liveNavigation?.isNavigating) return

    const targetZoom = markers.length > 0 ? 14 : map.getZoom()

    map.flyTo({
      center: [center[1], center[0]] as LngLatLike,
      zoom: targetZoom,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], markers.length])

  /* =======================================================
     MARKERS
  ======================================================= */

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markerObjectsRef.current.forEach((marker) => marker.remove())
    markerObjectsRef.current = []

    markers.forEach((marker) => {
      const [lat, lng] = marker.position

      const popup = new maplibregl.Popup({
        offset: 28,
        closeButton: false,
      }).setHTML(
        createPopupHTML(marker.title, marker.description)
      )

      const markerObject = new maplibregl.Marker({
        element: createPinElement(),
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)

      markerObjectsRef.current.push(markerObject)
    })
  }, [markers])

  /* =======================================================
     ROUTE
  ======================================================= */

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    lastRoutePointsRef.current = routePoints

    const source = map.getSource(
      ROUTE_SOURCE_ID
    ) as maplibregl.GeoJSONSource | undefined

    if (routePoints.length < 2) {
      source?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      })
      return
    }

    const geojson = routePointsToGeoJSON(routePoints)

    if (source) {
      source.setData(geojson)
    } else {
      // Style may not have finished loading yet; style.load
      // handler will pick up lastRoutePointsRef once ready.
      return
    }

    const lngs = geojson.geometry.coordinates.map((c) => c[0])
    const lats = geojson.geometry.coordinates.map((c) => c[1])

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 64, duration: 800 }
    )
  }, [routePoints])

  /* =======================================================
     AMBIENT USER LOCATION (continuous watch, not one-shot)
  ======================================================= */

  useEffect(() => {
    if (!showUserLocation) return
    if (typeof navigator === "undefined" || !navigator.geolocation)
      return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude,
        ])
        setUserAccuracy(position.coords.accuracy)
      },
      (error) => {
        console.log("Geolocation error:", error.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [showUserLocation])

  /* =======================================================
     ZOOM CONTROLS
  ======================================================= */

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn()
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut()

  const handleCenterOnUser = () => {
    const map = mapInstanceRef.current
    if (!map) return

    if (userLocation) {
      map.flyTo({
        center: [userLocation[1], userLocation[0]],
        zoom: 16,
        pitch: 0,
        bearing: 0,
        essential: true,
      })
      return
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const location: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ]
        setUserLocation(location)
        map.flyTo({
          center: [location[1], location[0]],
          zoom: 16,
          essential: true,
        })
      })
    }
  }

  /* =======================================================
     LIVE NAVIGATION POSITION (falls back to ambient location)
  ======================================================= */

  const activeLatitude =
    liveNavigation?.isNavigating && liveNavigation.latitude !== null
      ? liveNavigation.latitude
      : userLocation?.[0] ?? null

  const activeLongitude =
    liveNavigation?.isNavigating && liveNavigation.longitude !== null
      ? liveNavigation.longitude
      : userLocation?.[1] ?? null

  const activeAccuracy =
    liveNavigation?.isNavigating &&
    liveNavigation.accuracy !== null
      ? liveNavigation.accuracy
      : userAccuracy

  const activeHeading = liveNavigation?.isNavigating
    ? liveNavigation.heading
    : null

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="relative h-full w-full">
      {/* MAP */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* LIVE GPS PUCK */}
      {showUserLocation && (
        <LocationMarker
          map={mapInstance}
          latitude={activeLatitude}
          longitude={activeLongitude}
          heading={activeHeading}
          accuracy={activeAccuracy}
          navigating={Boolean(liveNavigation?.isNavigating)}
        />
      )}

      {/* NAVIGATION FOLLOW CAMERA */}
      <NavigationCamera
        map={mapInstance}
        latitude={liveNavigation?.latitude ?? null}
        longitude={liveNavigation?.longitude ?? null}
        heading={liveNavigation?.heading ?? null}
        navigating={Boolean(liveNavigation?.isNavigating)}
      />

      {/* MAP CONTROLS */}
      <div className="absolute right-4 bottom-28 md:bottom-24 flex flex-col gap-2 z-[1000]">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors border border-border shadow-lg"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors border border-border shadow-lg"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleCenterOnUser}
          className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border shadow-lg"
          aria-label="Center on my location"
        >
          <Navigation2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export type { MapStyle }
