"use client"

import { useRef, useCallback, useState } from "react"
import Map, { Marker, Popup, NavigationControl, type MapRef } from "react-map-gl/mapbox"
import { MapPin } from "lucide-react"
import "mapbox-gl/dist/mapbox-gl.css"

interface Place {
  id: string
  name: string
  country: string
  city?: string | null
  latitude: number
  longitude: number
  visitedAt?: Date | string | null
  notes?: string | null
}

interface TravelMapProps {
  places: Place[]
  onPlaceClick?: (place: Place) => void
}

export function TravelMap({ places, onPlaceClick }: TravelMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const handleMarkerClick = useCallback((place: Place) => {
    setSelectedPlace(place)
    mapRef.current?.flyTo({
      center: [place.longitude, place.latitude],
      zoom: 6,
      duration: 800,
    })
    onPlaceClick?.(place)
  }, [onPlaceClick])

  if (!token) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl border border-dashed text-muted-foreground text-sm">
        <div className="text-center space-y-1">
          <MapPin className="h-8 w-8 mx-auto opacity-40" />
          <p>Map unavailable — set <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-80 rounded-xl overflow-hidden border">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          longitude: 20,
          latitude: 30,
          zoom: 1.5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
      >
        <NavigationControl position="top-right" />

        {places.map((place) => (
          <Marker
            key={place.id}
            longitude={place.longitude}
            latitude={place.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              handleMarkerClick(place)
            }}
          >
            <div className="cursor-pointer group">
              <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-md group-hover:scale-110 transition-transform">
                <MapPin className="h-3 w-3" />
              </div>
            </div>
          </Marker>
        ))}

        {selectedPlace && (
          <Popup
            longitude={selectedPlace.longitude}
            latitude={selectedPlace.latitude}
            anchor="top"
            onClose={() => setSelectedPlace(null)}
            closeButton
            closeOnClick={false}
            className="z-10"
          >
            <div className="p-1 min-w-[160px]">
              <p className="font-semibold text-sm">{selectedPlace.name}</p>
              <p className="text-xs text-muted-foreground">
                {[selectedPlace.city, selectedPlace.country].filter(Boolean).join(", ")}
              </p>
              {selectedPlace.visitedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selectedPlace.visitedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              )}
              {selectedPlace.notes && (
                <p className="text-xs mt-1 line-clamp-2">{selectedPlace.notes}</p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
