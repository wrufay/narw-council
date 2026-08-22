// Illustrative fleet/fisheries zones near the Bay of Fundy and Gulf of St. Lawrence,
// for demo purposes only - not sourced from real NOAA/DFO contact registries, and
// deliberately generic (co-op/association names, no invented phone numbers, emails,
// or addresses) so nothing here could be mistaken for a real, contactable entity.
// See project to-dos: real DMA radius/proximity logic still needs to be looked up.
export const FISHERIES = [
  { id: 'digby', name: 'Digby Basin Fleet Co-op', type: 'Mixed groundfish', coords: [-65.76, 44.62] },
  { id: 'grand-manan', name: 'Grand Manan Fishing Association', type: 'Lobster', coords: [-66.78, 44.75] },
  { id: 'saint-john', name: 'Saint John Harbour Fleet', type: 'Mixed groundfish', coords: [-66.06, 45.27] },
  { id: 'yarmouth', name: 'Yarmouth Lobster Fleet', type: 'Lobster', coords: [-66.12, 43.84] },
  { id: 'miramichi', name: 'Miramichi Bay Fleet', type: 'Mixed groundfish', coords: [-65.28, 47.03] },
  { id: 'gulf-crab', name: 'Gulf of St. Lawrence Snow Crab Fleet', type: 'Snow crab', coords: [-61.86, 47.38] },
  { id: 'annapolis', name: 'Annapolis Basin Fishermen’s Association', type: 'Scallop', coords: [-65.51, 44.74] },
  { id: 'shelburne', name: 'Shelburne County Fleet Co-op', type: 'Lobster', coords: [-65.32, 43.76] },
  { id: 'chaleur', name: 'Chaleur Bay Regional Fleet', type: 'Snow crab', coords: [-65.68, 47.86] },
  { id: 'passamaquoddy', name: 'Passamaquoddy Bay Fishermen’s Co-op', type: 'Herring', coords: [-66.98, 45.05] },
]

// Placeholder relevant radius (km) - not yet grounded in real DMA rules.
export const PROXIMITY_RADIUS_KM = 40

// Fallback detection point (Bay of Fundy) if geolocation is unavailable/denied.
export const FALLBACK_COORDS = [-66.4, 44.85]

// Named zone closest to a detection point, for display (e.g. history log rows).
// Derived from the fleet-zone list above, not a real named-basin lookup.
export function nearestZoneName(coords, haversineDistanceKm) {
  let best = null
  let bestDist = Infinity
  for (const f of FISHERIES) {
    const d = haversineDistanceKm(coords, f.coords)
    if (d < bestDist) {
      bestDist = d
      best = f
    }
  }
  return best?.name ?? 'Unknown zone'
}
