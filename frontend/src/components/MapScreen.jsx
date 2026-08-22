import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { FISHERIES, PROXIMITY_RADIUS_KM } from '../data/fisheries.js'
import { haversineDistanceKm, circlePolygon } from '../lib/geo.js'
import './MapScreen.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const TIER_COLOR = { high: '#758e4f', medium: '#f6ae2d', low: '#6b7280' }

// simple whale silhouette, no emoji - used both on the map marker (raw HTML)
// and in the legend (JSX)
const WHALE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M2 13.4C2 8.9 6.6 5.8 12.1 5.8c2.7 0 5.1.9 6.8 2.4.5-.8 1.5-1.6 2.6-1.6-.4 1.1-.6 2.2-.6 3.1 0 .5.1 1 .3 1.5-1.1.3-2.2.4-3.2.3-1.1 2.4-3.9 4.6-8.7 4.6-4 0-7.3-1.1-7.3-2.7z"/>' +
  '<circle cx="8.6" cy="9.6" r="0.9" fill="#061a40"/>' +
  '</svg>'

export default function MapScreen({ coords, usedFallbackLocation, result }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const whaleMarkerRef = useRef(null)
  const fisheriesMarkersRef = useRef([])

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
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
        paint: { 'fill-color': '#145c9e', 'fill-opacity': 0.14 },
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
      whaleEl.innerHTML = WHALE_ICON_SVG
      whaleMarkerRef.current = new mapboxgl.Marker({ element: whaleEl }).setLngLat(coords).addTo(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
      whaleMarkerRef.current = null
      fisheriesMarkersRef.current = []
    }
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
      {!MAPBOX_TOKEN ? (
        <div className="map-screen__no-token">
          Set <code>VITE_MAPBOX_TOKEN</code> in <code>frontend/.env</code> to enable the map (see{' '}
          <code>.env.example</code>).
        </div>
      ) : (
        <div ref={containerRef} className="map-screen__canvas" />
      )}

      <div className="map-screen__legend">
        {usedFallbackLocation && (
          <p className="map-screen__note">Using a fallback Bay of Fundy location.</p>
        )}
        <span>
          <span className="map-dot-legend map-dot-legend--whale" dangerouslySetInnerHTML={{ __html: WHALE_ICON_SVG }} />
          NARW Point
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--in-range" />
          Fisheries In Range
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--outside" />
          Fisheries Outside Range
        </span>
      </div>
    </div>
  )
}
