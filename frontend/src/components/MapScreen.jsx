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

// red/yellow, reusing the same red already used for "fail" states
// elsewhere (ResultsScreen). Low-tier calls intentionally have no color -
// they're not plotted at all, per "none for those that were false".
const TIER_DOT_COLOR = { high: '#e0524a', medium: '#f6ae2d' }
const TIER_DOT_LABEL = { high: 'Very likely NARW', medium: 'Possible NARW' }

// simple whale silhouette, no emoji - marks the current/chosen location
const WHALE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M2 13.4C2 8.9 6.6 5.8 12.1 5.8c2.7 0 5.1.9 6.8 2.4.5-.8 1.5-1.6 2.6-1.6-.4 1.1-.6 2.2-.6 3.1 0 .5.1 1 .3 1.5-1.1.3-2.2.4-3.2.3-1.1 2.4-3.9 4.6-8.7 4.6-4 0-7.3-1.1-7.3-2.7z"/>' +
  '<circle cx="8.6" cy="9.6" r="0.9" fill="#061a40"/>' +
  '</svg>'

export default function MapScreen({ coords, usedFallbackLocation, result, history = [], pickingLocation, onPickLocation }) {
  const { theme } = useOutletContext() ?? {}
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const whaleMarkerRef = useRef(null)
  const detectionMarkersRef = useRef([])
  const coordsRef = useRef(coords)
  coordsRef.current = coords
  const appliedThemeRef = useRef(theme)
  const onPickLocationRef = useRef(onPickLocation)
  onPickLocationRef.current = onPickLocation
  const pickingRef = useRef(pickingLocation)
  pickingRef.current = pickingLocation

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

    map.on('load', () => {
      const whaleEl = document.createElement('div')
      whaleEl.className = 'map-whale'
      whaleEl.innerHTML = WHALE_ICON_SVG
      whaleMarkerRef.current = new mapboxgl.Marker({ element: whaleEl }).setLngLat(coordsRef.current).addTo(map)
    })

    map.on('click', (e) => {
      if (!pickingRef.current) return
      onPickLocationRef.current?.([e.lngLat.lng, e.lngLat.lat])
    })

    return () => {
      map.remove()
      mapRef.current = null
      whaleMarkerRef.current = null
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
    whaleMarkerRef.current?.setLngLat(coords)
    map.easeTo({ center: coords, duration: 600 })
  }, [coords])

  useEffect(() => {
    const whaleEl = whaleMarkerRef.current?.getElement()
    if (whaleEl) {
      whaleEl.style.setProperty('--whale-glow', (result && TIER_DOT_COLOR[result.confidence_tier]) || '#6fd8ff')
    }
  }, [result])

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
        if (!color || !entry.coords) return // low-confidence calls intentionally not shown

        const el = document.createElement('div')
        el.className = 'map-detection-dot'
        el.style.setProperty('--dot-color', color)
        el.title = `${TIER_DOT_LABEL[tier]} — ${Math.round((entry.result?.confidence ?? 0) * 100)}%`
        const marker = new mapboxgl.Marker({ element: el }).setLngLat(entry.coords).addTo(map)
        detectionMarkersRef.current.push({ id: entry.id, marker })
      })
    }

    if (map.isStyleLoaded()) render()
    else map.once('load', render)
  }, [history])

  return (
    <div className={`narw-screen map-screen ${pickingLocation ? 'map-screen--picking' : ''}`}>
      {!MAPBOX_TOKEN ? (
        <div className="map-screen__no-token">
          Set <code>VITE_MAPBOX_TOKEN</code> in <code>frontend/.env</code> to enable the map (see{' '}
          <code>.env.example</code>).
        </div>
      ) : (
        <div ref={containerRef} className="map-screen__canvas" />
      )}

      {pickingLocation && <div className="map-screen__pick-banner">Click the map to set your location</div>}

      <div className="map-screen__legend">
        {usedFallbackLocation && !pickingLocation && (
          <p className="map-screen__note">Using a fallback Bay of Fundy location.</p>
        )}
        <span>
          <span className="map-dot-legend map-dot-legend--whale" dangerouslySetInnerHTML={{ __html: WHALE_ICON_SVG }} />
          Current Location
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--high" />
          Very Likely NARW
        </span>
        <span>
          <span className="map-dot-legend map-dot-legend--medium" />
          Possible NARW
        </span>
      </div>
    </div>
  )
}
