import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import TopNav from './TopNav.jsx'
import { FISHERIES, PROXIMITY_RADIUS_KM } from '../data/fisheries.js'
import { haversineDistanceKm, circlePolygon } from '../lib/geo.js'
import './MapScreen.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const TIER_COLOR = { high: '#758e4f', medium: '#f6ae2d', low: '#6b7280' }

export default function MapScreen({ onNavigate, coords, usedFallbackLocation, result }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const whaleMarkerRef = useRef(null)
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
      map.addSource('proximity-radius', { type: 'geojson', data: circlePolygon(coords, PROXIMITY_RADIUS_KM) })
      map.addLayer({
        id: 'proximity-radius-fill',
        type: 'fill',
        source: 'proximity-radius',
        paint: { 'fill-color': '#145c9e', 'fill-opacity': 0.12 },
      })
      map.addLayer({
        id: 'proximity-radius-line',
        type: 'line',
        source: 'proximity-radius',
        paint: { 'line-color': '#145c9e', 'line-width': 2, 'line-dasharray': [2, 2] },
      })

      FISHERIES.forEach((f) => {
        const el = document.createElement('div')
        el.className = 'map-dot map-dot--outside'
        el.title = f.name
        const marker = new mapboxgl.Marker({ element: el }).setLngLat(f.coords).addTo(map)
        fisheriesMarkersRef.current.push({ id: f.id, el, marker })
      })

      const whaleEl = document.createElement('div')
      whaleEl.className = 'map-whale'
      whaleEl.textContent = '🐋'
      whaleMarkerRef.current = new mapboxgl.Marker({ element: whaleEl }).setLngLat(coords).addTo(map)
    })

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    whaleMarkerRef.current?.setLngLat(coords)
    const src = map.getSource('proximity-radius')
    if (src) src.setData(circlePolygon(coords, PROXIMITY_RADIUS_KM))
    map.easeTo({ center: coords, duration: 600 })
  }, [coords])

  useEffect(() => {
    fisheriesMarkersRef.current.forEach(({ id, el }) => {
      const fishery = FISHERIES.find((f) => f.id === id)
      const inRange = haversineDistanceKm(coords, fishery.coords) <= PROXIMITY_RADIUS_KM
      el.className = `map-dot ${inRange ? 'map-dot--in-range' : 'map-dot--outside'}`
    })
    const whaleEl = whaleMarkerRef.current?.getElement()
    if (whaleEl) whaleEl.style.setProperty('--whale-glow', result ? TIER_COLOR[result.confidence_tier] : '#6fd8ff')
  }, [coords, result])

  return (
    <div className="narw-screen map-screen">
      <TopNav onNavigate={onNavigate} />
      <h1 className="map-screen__heading">Map</h1>

      <div className="map-screen__frame">
        {!MAPBOX_TOKEN ? (
          <div className="map-screen__no-token">
            Set <code>VITE_MAPBOX_TOKEN</code> in <code>frontend/.env</code> to enable the map (see{' '}
            <code>.env.example</code>).
          </div>
        ) : (
          <div ref={containerRef} className="map-screen__canvas" />
        )}
      </div>

      {usedFallbackLocation && (
        <p className="map-screen__note">Using a fallback Bay of Fundy location — enable geolocation for the real position.</p>
      )}

      <div className="map-screen__legend">
        <span>
          <span className="map-dot-legend map-dot-legend--whale">🐋</span> NARW Point
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--in-range" /> Fisheries In Range
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--outside" /> Fisheries Outside Range
        </span>
      </div>
    </div>
  )
}
