"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Navigation2 } from "lucide-react"

// Fix for default markers in Leaflet
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const UserLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div class="w-5 h-5 bg-blue-500 border-3 border-white rounded-full shadow-lg animate-pulse"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

L.Marker.prototype.options.icon = DefaultIcon

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
  mapStyle?: "standard" | "satellite" | "terrain"
}

const MAP_TILES = {
  standard: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
}

export function MapView({
  center = [7.9465, -1.0232], // Ghana center coordinates
  zoom = 7,
  markers = [],
  routePoints = [],
  showUserLocation = true,
  onMapClick,
  mapStyle = "standard",
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: true,
    })

    // Add tile layer
    const tileLayer = L.tileLayer(MAP_TILES[mapStyle].url, {
      attribution: MAP_TILES[mapStyle].attribution,
      maxZoom: 19,
    }).addTo(map)

    tileLayerRef.current = tileLayer
    mapInstanceRef.current = map

    // Add markers layer
    markersLayerRef.current = L.layerGroup().addTo(map)

    // Handle map click
    if (onMapClick) {
      map.on("click", (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng)
      })
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Update tile layer when style changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return

    tileLayerRef.current.setUrl(MAP_TILES[mapStyle].url)
  }, [mapStyle])

  // Update center and zoom to selected location
  useEffect(() => {
    if (!mapInstanceRef.current) return
    // Zoom to level 14 when center changes (a place was selected)
    const newZoom = markers.length > 0 ? 14 : mapInstanceRef.current.getZoom()
    mapInstanceRef.current.setView(center, newZoom, { animate: true })
  }, [center, markers.length])

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current) return

    markersLayerRef.current.clearLayers()

    markers.forEach((marker) => {
      const m = L.marker(marker.position, { icon: DefaultIcon })
        .bindPopup(`<strong>${marker.title}</strong>${marker.description ? `<br/>${marker.description}` : ""}`)
      markersLayerRef.current?.addLayer(m)
    })
  }, [markers])

  // Update route
  useEffect(() => {
    if (!mapInstanceRef.current) return

    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current)
    }

    if (routePoints.length >= 2) {
      routeLayerRef.current = L.polyline(routePoints, {
        color: "#D4A853",
        weight: 5,
        opacity: 0.8,
      }).addTo(mapInstanceRef.current)

      mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), {
        padding: [50, 50],
      })
    }
  }, [routePoints])

  // Handle user location
  useEffect(() => {
    if (!showUserLocation || !mapInstanceRef.current) return

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(loc)

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(loc)
          } else {
            userMarkerRef.current = L.marker(loc, {
              icon: L.divIcon({
                className: "user-location-marker",
                html: `<div style="width: 16px; height: 16px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              }),
            }).addTo(mapInstanceRef.current!)
          }
        },
        (error) => {
          console.log("[v0] Geolocation error:", error)
        }
      )
    }
  }, [showUserLocation])

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut()
  }

  const handleCenterOnUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView(userLocation, 15)
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Map Controls */}
      <div className="absolute right-4 bottom-28 md:bottom-24 flex flex-col gap-2 z-[1000]">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors border border-border shadow-lg"
          aria-label="Zoom in"
        >
          <span className="text-xl font-light">+</span>
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors border border-border shadow-lg"
          aria-label="Zoom out"
        >
          <span className="text-xl font-light">−</span>
        </button>
        <button
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
