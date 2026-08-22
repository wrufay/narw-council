import { useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './MapScreen.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// dark = bare satellite imagery (minimal labels); light = Mapbox's actual
// light theme (also minimal labels) rather than another satellite variant,
// which never reads as "light" since it's real imagery either way. Both
// still get 3D terrain draping from the shared setTerrain call below.
const MAP_STYLE = {
  dark: 'mapbox://styles/mapbox/satellite-v9',
  light: 'mapbox://styles/mapbox/light-v11',
}

// red/yellow/gray - reusing the same red already used for "fail" states
// elsewhere (ResultsScreen), and the same gray as --tier-low. All three
// tiers are plotted now, including low-confidence ("non-valid") calls.
const TIER_DOT_COLOR = { high: '#e0524a', medium: '#f6ae2d', low: '#6b7280' }
const TIER_DOT_LABEL = { high: 'Very likely NARW', medium: 'Possible NARW', low: 'Not NARW' }

// simple whale silhouette, no emoji - every marker on this map is this
// shape, tinted per tier via currentColor
const WHALE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M2 13.4C2 8.9 6.6 5.8 12.1 5.8c2.7 0 5.1.9 6.8 2.4.5-.8 1.5-1.6 2.6-1.6-.4 1.1-.6 2.2-.6 3.1 0 .5.1 1 .3 1.5-1.1.3-2.2.4-3.2.3-1.1 2.4-3.9 4.6-8.7 4.6-4 0-7.3-1.1-7.3-2.7z"/>' +
  '<circle cx="8.6" cy="9.6" r="0.9" fill="#061a40"/>' +
  '</svg>'

export default function MapScreen({ coords, history = [] }) {
  const { theme } = useOutletContext() ?? {}
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const detectionMarkersRef = useRef([])
  const coordsRef = useRef(coords)
  coordsRef.current = coords
  const appliedThemeRef = useRef(theme)

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE[theme] ?? MAP_STYLE.dark,
      center: coordsRef.current,
      zoom: 6.2,
      pitch: 70,
      bearing: -12,
    })
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
    mapRef.current = map

    // terrain + sky reset on every style change, so this re-runs on each
    // 'style.load', not just the first one
    map.on('style.load', () => {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.2 })

      if (!map.getLayer('sky')) {
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun-intensity': 8 },
        })
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      detectionMarkersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // light/dark toggle -> swap the actual Mapbox style. setStyle wipes
  // custom sources/layers (markers survive, they're DOM-based).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !theme || theme === appliedThemeRef.current) return
    const nextStyle = MAP_STYLE[theme] ?? MAP_STYLE.dark
    const prevStyle = MAP_STYLE[appliedThemeRef.current] ?? MAP_STYLE.dark
    appliedThemeRef.current = theme
    if (nextStyle === prevStyle) return
    map.setStyle(nextStyle)
  }, [theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ center: coords, duration: 600 })
  }, [coords])

  // historical detection markers, driven by real classify history - not
  // static placeholder data. Rebuilt whenever history changes; lists stay
  // session-scale so a full rebuild is simpler than diffing markers.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    function render() {
      detectionMarkersRef.current.forEach(({ marker }) => marker.remove())
      detectionMarkersRef.current = []

      history.forEach((entry) => {
        const tier = entry.result?.confidence_tier
        const color = TIER_DOT_COLOR[tier]
        if (!color || !entry.coords) return

        const el = document.createElement('div')
        el.className = 'map-detection-whale'
        el.style.setProperty('--whale-color', color)
        el.innerHTML = WHALE_ICON_SVG
        el.title = `${TIER_DOT_LABEL[tier]} — ${Math.round((entry.result?.confidence ?? 0) * 100)}%`
        const marker = new mapboxgl.Marker({ element: el }).setLngLat(entry.coords).addTo(map)
        detectionMarkersRef.current.push({ id: entry.id, marker })
      })
    }

    if (map.isStyleLoaded()) render()
    else map.once('load', render)
  }, [history])

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
        <span>
          <span className="map-dot-legend map-dot-legend--high" />
          Very Likely NARW
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--medium" />
          Possible NARW
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--low" />
          Not NARW
        </span>
      </div>
    </div>
  )
}
