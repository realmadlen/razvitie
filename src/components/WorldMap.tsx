import { useMemo } from 'react'
import { geoNaturalEarth1, geoPath, geoBounds, geoCentroid } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import topo from 'world-atlas/countries-110m.json'

type F = Feature<Geometry, { name: string }>

const world = feature(topo as never, (topo as never as { objects: { countries: never } }).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>
const FEATURES = world.features.filter((f) => f.id !== '010') as F[] // без Антарктиды
const BY_ID = new Map(FEATURES.map((f) => [String(f.id), f]))

interface Props {
  /** Страна, вокруг которой строится вид */
  focusId: string
  /** Подсвеченная страна (правильный ответ) */
  highlightId?: string
  /** Неверно выбранная страна */
  wrongId?: string
  /** Можно ли нажимать на страны */
  onPick?: (id: string) => void
  /** Насколько широко показывать окрестности (в градусах) */
  span?: number
  height?: number
  label?: string
  /** Сдвиг центра вида (доля от полуширины), чтобы искомая страна не была ровно в центре */
  offset?: [number, number]
}

const W = 360

export function WorldMap({ focusId, highlightId, wrongId, onPick, span = 38, height = 240, label, offset = [0, 0] }: Props) {
  const { paths, projectionOk } = useMemo(() => {
    const f = BY_ID.get(focusId)
    let lon = 0, lat = 20, halfLon = 180, halfLat = 70
    if (f) {
      const [[x0, y0], [x1, y1]] = geoBounds(f)
      const [cx, cy] = geoCentroid(f)
      lon = cx; lat = cy
      const w = x1 < x0 ? x1 + 360 - x0 : x1 - x0
      halfLon = Math.min(180, Math.max(span, w * 1.4))
      halfLat = Math.min(80, Math.max(span * 0.62, (y1 - y0) * 1.4))
      if (halfLon < 170) { lon += offset[0] * halfLon * 0.45; lat = Math.max(-60, Math.min(75, lat + offset[1] * halfLat * 0.45)) }
    }
    // Рамка вида в градусах вокруг страны
    const frame: Feature = {
      type: 'Feature', properties: {},
      geometry: { type: 'MultiPoint', coordinates: [[lon - halfLon, Math.max(-85, lat - halfLat)], [lon + halfLon, Math.min(85, lat + halfLat)], [lon, lat]] },
    }
    const proj = geoNaturalEarth1().rotate([-lon, 0]).fitExtent([[6, 6], [W - 6, height - 6]], frame)
    const gp = geoPath(proj)
    return {
      paths: FEATURES.map((ft) => ({ id: String(ft.id), d: gp(ft) ?? '', name: ft.properties.name })).filter((p) => p.d),
      projectionOk: !!f,
    }
  }, [focusId, span, height, offset[0], offset[1]])

  return (
    <svg className={`map${onPick ? ' map--pick' : ''}`} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label ?? 'Карта мира'}>
      <rect x="0" y="0" width={W} height={height} className="map-sea" rx="14" />
      {paths.map((p) => {
        const cls = p.id === highlightId ? 'map-land is-target' : p.id === wrongId ? 'map-land is-wrong' : 'map-land'
        return (
          <path key={p.id} d={p.d} className={cls}
            onClick={onPick ? () => onPick(p.id) : undefined}
            role={onPick ? 'button' : undefined}
            aria-label={onPick ? 'Страна на карте' : undefined} />
        )
      })}
      {!projectionOk && <text x={W / 2} y={height / 2} textAnchor="middle" className="map-note">Карта недоступна</text>}
    </svg>
  )
}
