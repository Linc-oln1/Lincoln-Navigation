"use client"

import { LocationMarker } from "./location-marker"
import { NavigationCamera } from "./navigation-camera"
import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Navigation2 } from "lucide-react"

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
}

/* =========================================================
   TILE DEFINITIONS
========================================================= */

/*
  IMPORTANT:

  Keep these objects complete.

  Every style has:
  - url
  - attribution
*/

const MAP_TILES: Record<
  Exclude<MapStyle, "device">,
  {
    url: string
    attribution: string
    maxZoom: number
  }
> = {
  /* -------------------------------------------------------
     LIGHT
  ------------------------------------------------------- */

  light: {
    url:
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",

    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',

    maxZoom: 20,
  },

  /* -------------------------------------------------------
     DARK
  ------------------------------------------------------- */

  dark: {
    url:
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",

    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',

    maxZoom: 20,
  },

  /* -------------------------------------------------------
     SATELLITE
  ------------------------------------------------------- */

  satellite: {
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",

    maxZoom: 19,
  },

  /* -------------------------------------------------------
     TERRAIN
  ------------------------------------------------------- */

  terrain: {
    url:
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",

    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',

    maxZoom: 17,
  },
}

/* =========================================================
   SATELLITE LABEL OVERLAY
========================================================= */

/*
  This sits ABOVE the satellite imagery.

  It gives the satellite map:
  - city names
  - town names
  - roads
  - boundaries
  - geographic labels

  This is what makes the satellite view much more useful
  instead of being just raw aerial imagery.
*/

const SATELLITE_LABELS = {
  url:
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",

  attribution: "Esri",

  maxZoom: 19,
}

/* =========================================================
   DEFAULT MARKER
========================================================= */

const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],

  iconAnchor: [12, 41],

  popupAnchor: [1, -34],

  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

/* =========================================================
   USER LOCATION ICON
========================================================= */

const UserLocationIcon = L.divIcon({
  className: "user-location-marker",

  html: `
    <div
      style="
        width:18px;
        height:18px;
        background:#2563eb;
        border:3px solid white;
        border-radius:50%;
        box-shadow:
          0 0 0 5px rgba(37,99,235,0.20),
          0 2px 8px rgba(0,0,0,0.35);
      "
    ></div>
  `,

  iconSize: [18, 18],

  iconAnchor: [9, 9],
})

/* =========================================================
   DEVICE THEME
========================================================= */

function getDeviceMapStyle(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light"
  }

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
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
}: MapViewProps) {
  /* -------------------------------------------------------
     REFS
  ------------------------------------------------------- */

  const mapRef = useRef<HTMLDivElement>(null)

  const mapInstanceRef =
    useRef<L.Map | null>(null)

  const tileLayerRef =
    useRef<L.TileLayer | null>(null)

  const satelliteLabelsRef =
    useRef<L.TileLayer | null>(null)

  const markersLayerRef =
    useRef<L.LayerGroup | null>(null)

  const routeLayerRef =
    useRef<L.Polyline | null>(null)

  const userMarkerRef =
    useRef<L.Marker | null>(null)

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [userLocation, setUserLocation] =
    useState<[number, number] | null>(null)

  /* =======================================================
     INITIALIZE MAP
  ======================================================= */

  useEffect(() => {
    if (!mapRef.current) return

    if (mapInstanceRef.current) return

    /* -----------------------------------------------------
       Determine initial theme
    ----------------------------------------------------- */

    const resolvedStyle =
      mapStyle === "device"
        ? getDeviceMapStyle()
        : mapStyle

    const tileConfig =
      MAP_TILES[resolvedStyle]

    /* -----------------------------------------------------
       Create map
    ----------------------------------------------------- */

    const map = L.map(mapRef.current, {
      center,

      zoom,

      zoomControl: false,

      attributionControl: true,

      /* Better Apple Maps-like interaction */
      scrollWheelZoom: true,

      doubleClickZoom: true,

      dragging: true,

      touchZoom: true,

      boxZoom: true,

      keyboard: true,
    })

    /* -----------------------------------------------------
       Main tile layer
    ----------------------------------------------------- */

    const tileLayer = L.tileLayer(
      tileConfig.url,
      {
        attribution:
          tileConfig.attribution,

        maxZoom:
          tileConfig.maxZoom,

        minZoom: 2,

        updateWhenIdle: false,

        keepBuffer: 3,

        crossOrigin: true,
      }
    )

    tileLayer.addTo(map)

    tileLayerRef.current =
      tileLayer

    /* -----------------------------------------------------
       SATELLITE LABELS

       Add only when satellite mode is active.
    ----------------------------------------------------- */

    if (resolvedStyle === "satellite") {
      const labels = L.tileLayer(
        SATELLITE_LABELS.url,
        {
          attribution:
            SATELLITE_LABELS.attribution,

          maxZoom:
            SATELLITE_LABELS.maxZoom,

          minZoom: 2,

          opacity: 0.95,

          pane: "overlayPane",

          crossOrigin: true,
        }
      )

      labels.addTo(map)

      satelliteLabelsRef.current =
        labels
    }

    /* -----------------------------------------------------
       Marker layer
    ----------------------------------------------------- */

    markersLayerRef.current =
      L.layerGroup().addTo(map)

    /* -----------------------------------------------------
       Map click
    ----------------------------------------------------- */

    if (onMapClick) {
      map.on("click", (event) => {
        onMapClick(
          event.latlng.lat,
          event.latlng.lng
        )
      })
    }

    /* -----------------------------------------------------
       Save map instance
    ----------------------------------------------------- */

    mapInstanceRef.current = map

    /* -----------------------------------------------------
       Cleanup
    ----------------------------------------------------- */

    return () => {
      map.remove()

      mapInstanceRef.current =
        null

      tileLayerRef.current =
        null

      satelliteLabelsRef.current =
        null

      markersLayerRef.current =
        null

      routeLayerRef.current =
        null

      userMarkerRef.current =
        null
    }
  }, [])

  /* =======================================================
     CHANGE MAP THEME
  ======================================================= */

  useEffect(() => {
    const map =
      mapInstanceRef.current

    const tileLayer =
      tileLayerRef.current

    if (!map || !tileLayer) {
      return
    }

    /* -----------------------------------------------------
       Resolve device theme
    ----------------------------------------------------- */

    const resolvedStyle =
      mapStyle === "device"
        ? getDeviceMapStyle()
        : mapStyle

    /*
      IMPORTANT:

      This prevents the previous
      "Cannot read properties of undefined (reading 'url')"
      error.

      We explicitly check that the configuration exists.
    */

    const tileConfig =
      MAP_TILES[resolvedStyle]

    if (!tileConfig) {
      console.error(
        "Invalid map style:",
        resolvedStyle
      )

      return
    }

    /* -----------------------------------------------------
       Change main tiles
    ----------------------------------------------------- */

    tileLayer.setUrl(
      tileConfig.url
    )

    tileLayer.options.maxZoom =
      tileConfig.maxZoom

    tileLayer.options.attribution =
      tileConfig.attribution

    /* -----------------------------------------------------
       SATELLITE LABELS
    ----------------------------------------------------- */

    if (resolvedStyle === "satellite") {
      if (
        !satelliteLabelsRef.current
      ) {
        const labels =
          L.tileLayer(
            SATELLITE_LABELS.url,
            {
              attribution:
                SATELLITE_LABELS.attribution,

              maxZoom:
                SATELLITE_LABELS.maxZoom,

              minZoom: 2,

              opacity: 0.95,

              pane: "overlayPane",

              crossOrigin: true,
            }
          )

        labels.addTo(map)

        satelliteLabelsRef.current =
          labels
      }
    } else {
      if (
        satelliteLabelsRef.current
      ) {
        map.removeLayer(
          satelliteLabelsRef.current
        )

        satelliteLabelsRef.current =
          null
      }
    }
  }, [mapStyle])

  /* =======================================================
     DEVICE THEME CHANGES
  ======================================================= */

  useEffect(() => {
    if (mapStyle !== "device") {
      return
    }

    if (
      typeof window ===
      "undefined"
    ) {
      return
    }

    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      )

    const handleThemeChange =
      () => {
        const map =
          mapInstanceRef.current

        const tileLayer =
          tileLayerRef.current

        if (!map || !tileLayer) {
          return
        }

        const newStyle =
          mediaQuery.matches
            ? "dark"
            : "light"

        const config =
          MAP_TILES[newStyle]

        tileLayer.setUrl(
          config.url
        )

        tileLayer.options.attribution =
          config.attribution
      }

    mediaQuery.addEventListener(
      "change",
      handleThemeChange
    )

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleThemeChange
      )
    }
  }, [mapStyle])

  /* =======================================================
     UPDATE CENTER
  ======================================================= */

  useEffect(() => {
    const map =
      mapInstanceRef.current

    if (!map) return

    const targetZoom =
      markers.length > 0
        ? 14
        : map.getZoom()

    map.setView(
      center,
      targetZoom,
      {
        animate: true,
        duration: 0.6,
      }
    )
  }, [center, markers.length])

  /* =======================================================
     MARKERS
  ======================================================= */

  useEffect(() => {
    const layer =
      markersLayerRef.current

    if (!layer) return

    layer.clearLayers()

    markers.forEach(
      (marker) => {
        const popupContent = `
          <div
            style="
              min-width:180px;
              font-family:system-ui,sans-serif;
            "
          >
            <div
              style="
                font-size:15px;
                font-weight:700;
                margin-bottom:4px;
              "
            >
              ${marker.title}
            </div>

            ${
              marker.description
                ? `
                  <div
                    style="
                      font-size:13px;
                      color:#666;
                    "
                  >
                    ${marker.description}
                  </div>
                `
                : ""
            }
          </div>
        `

        const markerObject =
          L.marker(
            marker.position,
            {
              icon: DefaultIcon,
            }
          ).bindPopup(
            popupContent
          )

        layer.addLayer(
          markerObject
        )
      }
    )
  }, [markers])

  /* =======================================================
     ROUTE
  ======================================================= */

  useEffect(() => {
    const map =
      mapInstanceRef.current

    if (!map) return

    /* Remove old route */

    if (routeLayerRef.current) {
      map.removeLayer(
        routeLayerRef.current
      )

      routeLayerRef.current =
        null
    }

    /* No route */

    if (routePoints.length < 2) {
      return
    }

    /* Create route */

    const route =
      L.polyline(
        routePoints,
        {
          color: "#D4A853",

          weight: 6,

          opacity: 0.9,

          lineCap: "round",

          lineJoin: "round",
        }
      )

    route.addTo(map)

    routeLayerRef.current =
      route

    /* Fit route */

    map.fitBounds(
      route.getBounds(),
      {
        padding: [60, 60],

        animate: true,
      }
    )
  }, [routePoints])

  /* =======================================================
     USER LOCATION
  ======================================================= */

  useEffect(() => {
    if (
      !showUserLocation ||
      !mapInstanceRef.current
    ) {
      return
    }

    if (
      !("geolocation" in navigator)
    ) {
      return
    }

    const map =
      mapInstanceRef.current

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: [
          number,
          number
        ] = [
          position.coords.latitude,

          position.coords.longitude,
        ]

        setUserLocation(
          location
        )

        /* Update existing marker */

        if (
          userMarkerRef.current
        ) {
          userMarkerRef.current.setLatLng(
            location
          )

          return
        }

        /* Create marker */

        const marker =
          L.marker(
            location,
            {
              icon:
                UserLocationIcon,

              zIndexOffset: 1000,
            }
          )

        marker
          .bindTooltip(
            "You are here",
            {
              direction: "top",

              offset: [0, -10],
            }
          )
          .addTo(map)

        userMarkerRef.current =
          marker
      },

      (error) => {
        console.log(
          "Geolocation error:",
          error.message
        )
      },

      {
        enableHighAccuracy: true,

        timeout: 10000,

        maximumAge: 30000,
      }
    )
  }, [showUserLocation])

  /* =======================================================
     ZOOM CONTROLS
  ======================================================= */

  const handleZoomIn =
    () => {
      mapInstanceRef.current?.zoomIn()
    }

  const handleZoomOut =
    () => {
      mapInstanceRef.current?.zoomOut()
    }

  /* =======================================================
     CENTER ON USER
  ======================================================= */

  const handleCenterOnUser =
    () => {
      if (
        userLocation &&
        mapInstanceRef.current
      ) {
        mapInstanceRef.current.setView(
          userLocation,
          16,
          {
            animate: true,
          }
        )
      } else if (
        "geolocation" in navigator
      ) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location: [
              number,
              number
            ] = [
              position.coords.latitude,

              position.coords.longitude,
            ]

            setUserLocation(
              location
            )

            mapInstanceRef.current?.setView(
              location,
              16,
              {
                animate: true,
              }
            )
          }
        )
      }
    }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="relative h-full w-full"
    >
      {/* MAP */}

      <div
        ref={mapRef}
        className="h-full w-full"
      />

      {/* MAP CONTROLS */}

      <div
        className="
          absolute
          right-4
          bottom-28
          md:bottom-24
          flex
          flex-col
          gap-2
          z-[1000]
        "
      >
        {/* Zoom In */}

        <button
          type="button"
          onClick={handleZoomIn}
          className="
            w-10
            h-10
            bg-card/90
            backdrop-blur-sm
            rounded-lg
            flex
            items-center
            justify-center
            text-foreground
            hover:bg-card
            transition-colors
            border
            border-border
            shadow-lg
          "
          aria-label="Zoom in"
        >
          <span
            className="
              text-xl
              font-light
            "
          >
            +
          </span>
        </button>

        {/* Zoom Out */}

        <button
          type="button"
          onClick={handleZoomOut}
          className="
            w-10
            h-10
            bg-card/90
            backdrop-blur-sm
            rounded-lg
            flex
            items-center
            justify-center
            text-foreground
            hover:bg-card
            transition-colors
            border
            border-border
            shadow-lg
          "
          aria-label="Zoom out"
        >
          <span
            className="
              text-xl
              font-light
            "
          >
            −
          </span>
        </button>

        {/* Locate Me */}

        <button
          type="button"
          onClick={
            handleCenterOnUser
          }
          className="
            w-10
            h-10
            bg-card/90
            backdrop-blur-sm
            rounded-lg
            flex
            items-center
            justify-center
            text-foreground
            hover:bg-primary
            hover:text-primary-foreground
            transition-colors
            border
            border-border
            shadow-lg
          "
          aria-label="Center on my location"
        >
          <Navigation2
            className="w-4 h-4"
          />
        </button>
      </div>
    </div>
  )
}