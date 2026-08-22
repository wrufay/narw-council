const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Approximate circle polygon (GeoJSON ring) around [lng, lat] with the given radius in km.
export function circlePolygon([lng, lat], radiusKm, points = 64) {
  const coords = []
  const distRatio = radiusKm / EARTH_RADIUS_KM
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180

  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI
    const destLat = Math.asin(
      Math.sin(latRad) * Math.cos(distRatio) +
        Math.cos(latRad) * Math.sin(distRatio) * Math.cos(bearing),
    )
    const destLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distRatio) * Math.cos(latRad),
        Math.cos(distRatio) - Math.sin(latRad) * Math.sin(destLat),
      )
    coords.push([(destLng * 180) / Math.PI, (destLat * 180) / Math.PI])
  }

  return { type: 'Polygon', coordinates: [coords] }
}
