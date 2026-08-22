import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { FISHERIES, PROXIMITY_RADIUS_KM } from '../data/fisheries.js'
import { haversineDistanceKm, circlePolygon } from '../lib/geo.js'
import './DetectionMap.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const TIER_COLOR = { high: '#6fe3a3', medium: '#f2c94c', low: '#f2746a' }

export default function DetectionMap({ coords, usedFallbackLocation, result }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const detectionMarkerRef = useRef(null)
  const fisheriesMarkersRef = useRef([])

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: coords,
      zoom: 6.2,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      map.addSource('proximity-radius', {
        type: 'geojson',
        data: circlePolygon(coords, PROXIMITY_RADIUS_KM),
      })
      map.addLayer({
        id: 'proximity-radius-fill',
        type: 'fill',
        source: 'proximity-radius',
        paint: { 'fill-color': '#6fd8ff', 'fill-opacity': 0.08 },
      })
      map.addLayer({
        id: 'proximity-radius-line',
        type: 'line',
        source: 'proximity-radius',
        paint: { 'line-color': '#6fd8ff', 'line-width': 1.5, 'line-dasharray': [2, 2] },
      })

      FISHERIES.forEach((f) => {
        const el = document.createElement('div')
        el.className = 'map-marker map-marker--fishery'
        el.textContent = '⚓'
        el.title = f.name
        const marker = new mapboxgl.Marker({ element: el }).setLngLat(f.coords).addTo(map)
        fisheriesMarkersRef.current.push({ id: f.id, el, marker })
      })

      const whaleEl = document.createElement('div')
      whaleEl.className = 'map-marker map-marker--whale'
      whaleEl.textContent = '🐋'
      detectionMarkerRef.current = new mapboxgl.Marker({ element: whaleEl })
        .setLngLat(coords)
        .addTo(map)
    })

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep detection point + radius circle in sync when coords change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    detectionMarkerRef.current?.setLngLat(coords)
    const src = map.getSource('proximity-radius')
    if (src) src.setData(circlePolygon(coords, PROXIMITY_RADIUS_KM))
    map.easeTo({ center: coords, duration: 600 })
  }, [coords])

  // highlight fisheries within range + color the whale marker by confidence tier
  useEffect(() => {
    fisheriesMarkersRef.current.forEach(({ id, el }) => {
      const fishery = FISHERIES.find((f) => f.id === id)
      const inRange = haversineDistanceKm(coords, fishery.coords) <= PROXIMITY_RADIUS_KM
      el.classList.toggle('map-marker--in-range', inRange)
    })

    const whaleEl = detectionMarkerRef.current?.getElement()
    if (whaleEl) {
      whaleEl.style.setProperty('--marker-color', result ? TIER_COLOR[result.confidence_tier] : '#6fd8ff')
    }
  }, [coords, result])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="glass-panel panel">
        <p className="panel__title">Detection Map</p>
        <p className="council-panel__empty">
          Set <code>VITE_MAPBOX_TOKEN</code> in <code>frontend/.env</code> to enable the map
          (see <code>.env.example</code>).
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel panel map-panel">
      <p className="panel__title">Detection Map</p>
      {usedFallbackLocation && (
        <p className="map-panel__note">Using a fallback Bay of Fundy location — enable geolocation for the real position.</p>
      )}
      <div ref={containerRef} className="map-panel__canvas" />
      <p className="map-panel__legend">⚓ fleet zones · glowing ring = ~{PROXIMITY_RADIUS_KM}km relevant radius (placeholder pending real DMA rules)</p>
    </div>
  )
}
